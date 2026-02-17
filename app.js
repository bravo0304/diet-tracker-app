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
    surplus = 250; // optional muscle gain surplus
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
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&created_at=gte.${today}&select=calories`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const meals = await mealsRes.json();
  let eaten = 0;
  meals.forEach(m => eaten += m.calories);

  const remaining = targetCalories - eaten;

  // ---------- UPDATE DOM ----------
  remainingEl.innerText = remaining + " kcal";

  const proteinEl = document.getElementById("protein");
  const fatEl = document.getElementById("fat");
  const carbsEl = document.getElementById("carbs");
  if(proteinEl) proteinEl.innerText = proteinG;
  if(fatEl) fatEl.innerText = fatG;
  if(carbsEl) carbsEl.innerText = carbsG;
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
});
