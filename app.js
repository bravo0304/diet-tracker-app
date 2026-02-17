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
  const remainingEl = document.getElementById("remaining");
  if (!remainingEl) return;

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  const user = parseJwt(token);
  const user_id = user.sub;
  const today = new Date().toISOString().split("T")[0];

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

  // ---------- CONVERT UNITS ----------
  let height_cm = profile.height_cm;
  let weight_kg = profile.weight_kg;
  if(units === "imperial"){
    height_cm = height_cm * 2.54;
    weight_kg = weight_kg * 0.453592;
  }

  // ---------- BMR / TDEE ----------
  const W = weight_kg;
  const H = height_cm;
  const A = profile.age;
  let bmr = profile.sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * 1.4;

  // ---------- DEFICIT / SURPLUS ----------
  let deficit = 0;
  if(profile.goal === "weight_loss" && applyDeficit){
    if(profile.weight_loss_speed === "slow") deficit = 300;
    if(profile.weight_loss_speed === "moderate") deficit = 500;
    if(profile.weight_loss_speed === "aggressive") deficit = 750;
  }

  let surplus = 0;
  if(profile.goal === "fitness" && applySurplus){
    surplus = 250;
  }

  const targetCalories = Math.round(tdee - deficit + surplus);

  // ---------- MACROS ----------
  let macroPercent = { protein: 0.3, fat: 0.25, carbs: 0.45 };
  if(profile.goal === "fitness") macroPercent = { protein: 0.35, fat: 0.25, carbs: 0.4 };
  if(profile.goal === "health") macroPercent = { protein: 0.25, fat: 0.3, carbs: 0.45 };
  if(expertOverride && userSettings.customMacros){
    macroPercent = userSettings.customMacros;
  }

  const proteinG = Math.round((targetCalories * macroPercent.protein) / 4);
  const fatG = Math.round((targetCalories * macroPercent.fat) / 9);
  const carbsG = Math.round((targetCalories * macroPercent.carbs) / 4);

  // ---------- FETCH TODAY'S MEALS ----------
  const mealsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&created_at=gte.${today}&select=calories,protein,fat,carbs,title`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const meals = await mealsRes.json();
  let eatenCalories = 0, eatenProtein=0, eatenFat=0, eatenCarbs=0;

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = ""; // clear previous entries

  if(meals.length === 0){
    const li = document.createElement("li");
    li.style.color = "#666";
    li.innerText = "No meals logged today";
    foodList.appendChild(li);
  } else {
    meals.forEach((m, i) => {
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
  const remaining = targetCalories - eatenCalories;
  remainingEl.innerText = `${eatenCalories} / ${targetCalories} kcal`;

  // Update mini macro text
  document.getElementById("protein").innerText = `${eatenProtein} / ${proteinG} g`;
  document.getElementById("fat").innerText = `${eatenFat} / ${fatG} g`;
  document.getElementById("carbs").innerText = `${eatenCarbs} / ${carbsG} g`;

  // Update charts if drawing functions exist
  if(typeof drawCaloriesRing === "function") drawCaloriesRing(remaining, targetCalories);
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
  if (!input) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById("preview");
    preview.src = URL.createObjectURL(file);
  });
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadCalories();
  setupCamera();
  if(typeof startResetTimer === "function") startResetTimer();
});
