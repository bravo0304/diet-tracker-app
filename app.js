const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

// ---------- LOGIN ----------
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  status.innerText = "Logging in...";

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!data.access_token) {
    status.innerText = "Login failed";
    return;
  }

  localStorage.setItem("token", data.access_token);

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${data.access_token}`
    }
  });

  const profile = await profileRes.json();

  if (profile.length === 0) {
    window.location.href = "/onboarding.html";
  } else {
    window.location.href = "/dashboard.html";
  }
}

// ---------- DASHBOARD LOAD ----------
function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}

async function loadCalories() {
  const caloriesLabel = document.getElementById("caloriesLabel");
  if (!caloriesLabel) return;

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  const user = parseJwt(token);
  const user_id = user.sub;
  console.log("JWT user_id:", user_id);

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayISO = today.toISOString();


  // ---------- SETTINGS ----------
  const userSettings = JSON.parse(localStorage.getItem("userSettings")) || {};
  const units = userSettings.units || "metric";
  const applyDeficit = userSettings.weightLossDeficit ?? true;
  const applySurplus = userSettings.muscleGainSurplus ?? true;
  const expertOverride = userSettings.expertMacroOverride ?? false;

  // ---------- FETCH PROFILE ----------
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=*`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const profiles = await profileRes.json();
  if (profiles.length === 0) return;
  const profile = profiles[0];

  // ---------- SAFETY FALLBACK ----------
  const W = profile.weight_kg && profile.weight_kg > 0 ? profile.weight_kg : 72;
  const H = profile.height_cm && profile.height_cm > 0 ? profile.height_cm : 170;
  const A = profile.age && profile.age > 0 ? profile.age : 32;
  const sex = profile.sex || "male";
  const goal = profile.goal || "weight_loss";
  const speed = profile.weight_loss_speed || "slow";

  // ---------- BMR / TDEE ----------
  let bmr = sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * 1.4;

  // ---------- DEFICIT / SURPLUS ----------
  let deficit = 0;
  if(goal === "weight_loss" && applyDeficit){
    if(speed === "slow") deficit = 300;
    if(speed === "moderate") deficit = 500;
    if(speed === "aggressive") deficit = 750;
  }

  const surplus = goal === "fitness" && applySurplus ? 250 : 0;
  const targetCalories = Math.round(tdee - deficit + surplus);

  // ---------- MACROS ----------
  let macroPercent = { protein: 0.3, fat: 0.25, carbs: 0.45 };
  if(goal === "fitness") macroPercent = { protein: 0.35, fat: 0.25, carbs: 0.4 };
  if(goal === "health") macroPercent = { protein: 0.25, fat: 0.3, carbs: 0.45 };
  if(expertOverride && userSettings.customMacros){
    macroPercent = userSettings.customMacros;
  }

  const proteinG = Math.round((targetCalories * macroPercent.protein) / 4);
  const fatG = Math.round((targetCalories * macroPercent.fat) / 9);
  const carbsG = Math.round((targetCalories * macroPercent.carbs) / 4);

  // ---------- FETCH TODAY'S MEALS ----------
 // ---------- FETCH TODAY'S MEALS ----------
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString().split("T")[0];

const mealsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&created_at=gte.${todayStr}&select=calories,protein,fat,carbs,title`,
  {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`
    }
  }
);

console.log("Meals status:", mealsRes.status);

const meals = await mealsRes.json();

if (!Array.isArray(meals)) {
  console.error("Meals error:", meals);
  return;
}


  let eatenCalories = 0, eatenProtein = 0, eatenFat = 0, eatenCarbs = 0;

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = "";

  if(meals.length === 0){
    const li = document.createElement("li");
    li.style.color = "#666";
    li.innerText = "No meals logged today";
    foodList.appendChild(li);
  } else {
    meals.forEach((m,i)=>{
      eatenCalories += m.calories;
      eatenProtein += m.protein;
      eatenFat += m.fat;
      eatenCarbs += m.carbs;

      const li = document.createElement("li");
      li.innerText = `${i+1}. ${m.title || "Entry"} - ${m.calories} Cal | P:${m.protein}g F:${m.fat}g C:${m.carbs}g`;
      foodList.appendChild(li);
    });
  }

  // ---------- UPDATE DASHBOARD ----------
  caloriesLabel.innerText = `${eatenCalories} / ${targetCalories} kcal`;
  document.getElementById("proteinLabel").innerText = `Protein: ${eatenProtein} / ${proteinG} g`;
  document.getElementById("fatLabel").innerText = `Fat: ${eatenFat} / ${fatG} g`;
  document.getElementById("carbsLabel").innerText = `Carbs: ${eatenCarbs} / ${carbsG} g`;

  if(typeof drawCaloriesRing === "function") drawCaloriesRing(eatenCalories, targetCalories);
  if(typeof drawMacroPie === "function"){
    drawMacroPie('proteinPie', eatenProtein, proteinG, '#FF6B4A');
    drawMacroPie('fatPie', eatenFat, fatG, '#4ABEFF');
    drawMacroPie('carbsPie', eatenCarbs, carbsG, '#28A745');
  }
}

// ---------- CAMERA ----------
function openCamera() {
  document.getElementById("cameraInput").click();
}

function setupCamera(){
  const input = document.getElementById("cameraInput");
  if(!input) return;
  input.addEventListener("change",(e)=>{
    const file = e.target.files[0];
    if(!file) return;
    document.getElementById("preview").src = URL.createObjectURL(file);
  });
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded",()=>{
  loadCalories();
  setupCamera();
  if(typeof startResetTimer==="function") startResetTimer();
});

// ---------- DRAW CALORIES RING ----------
var caloriesChart;
function drawCaloriesRing(consumed,target){
  const ctx = document.getElementById('caloriesRing').getContext('2d');
  if(caloriesChart) caloriesChart.destroy();
  caloriesChart = new Chart(ctx,{
    type:'doughnut',
    data:{labels:['Consumed','Remaining'],datasets:[{data:[consumed,Math.max(target-consumed,0)],backgroundColor:['#FF6B4A','#EEEEEE'],borderWidth:0}]},
    options:{cutout:'70%',plugins:{legend:{display:false},tooltip:{enabled:false}},responsive:false,maintainAspectRatio:false}
  });
}

// ---------- DRAW MINI MACRO PIES ----------
function drawMacroPie(id,consumed,target,color){
  const ctx = document.getElementById(id).getContext('2d');
  const data = [consumed,Math.max(target-consumed,0)];
  const bg = [color,'#EEEEEE'];
  new Chart(ctx,{type:'doughnut',data:{labels:['Consumed','Remaining'],datasets:[{data:data,backgroundColor:bg,borderWidth:0}]},options:{cutout:'70%',plugins:{legend:{display:false},tooltip:{enabled:false}},responsive:false,maintainAspectRatio:false}});
}

// ---------- DAILY RESET TIMER ----------
function startResetTimer(){
  const timerEl = document.getElementById('reset-timer');
  function updateTimer(){
    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setHours(24,0,0,0);
    const diff = nextMidnight-now;
    const hours = String(Math.floor(diff/3600000)).padStart(2,'0');
    const mins = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    const secs = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    timerEl.innerText=`Time to reset: ${hours}:${mins}:${secs}`;
  }
  updateTimer();
  setInterval(updateTimer,1000);
}
