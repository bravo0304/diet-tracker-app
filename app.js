import { getToken, getUserIdFromToken } from "./js/auth.js";

const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

// ================= UTIL =================

function getTodayString() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
}

// ================= API =================

async function saveMeal(meal) {
  const token = getToken();
  const user_id = getUserIdFromToken();

  if (!token || !user_id) {
    window.location.href = "/";
    return;
  }

  const today = getTodayString();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/meals`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      user_id,
      food_name: meal.food_name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      meal_type: "general",
      date: today
    })
  });

  if (!res.ok) {
    alert("Error saving meal.");
  }
}

async function deleteMeal(id) {
  const token = getToken();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?id=eq.${id}`,
    {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    alert("Failed to delete meal.");
    return;
  }

  loadDashboard();
}

// ================= RING =================

function animateRing(ring, targetPercent) {
  let current = 0;
  const step = targetPercent / 30;

  function update() {
    current += step;
    if (current >= targetPercent) current = targetPercent;

    ring.style.background =
      `conic-gradient(#077a7d ${current}%, #e5e7eb ${current}%)`;

    if (current < targetPercent) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// ================= DASHBOARD =================

async function loadDashboard() {
  const token = getToken();
  const user_id = getUserIdFromToken();

  if (!token || !user_id) {
    window.location.href = "/";
    return;
  }

  const todayStr = getTodayString();

  // PROFILE
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
  if (!profiles.length) return;

  const profile = profiles[0];

  const W = profile.weight_kg || 72;
  const H = profile.height_cm || 170;
  const A = profile.age || 30;
  const sex = profile.sex || "male";

  let bmr = sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * 1.4;
  const targetCalories = Math.round(tdee);

  const proteinTarget = Math.round((targetCalories * 0.3) / 4);
  const fatTarget = Math.round((targetCalories * 0.25) / 9);
  const carbsTarget = Math.round((targetCalories * 0.45) / 4);

  // MEALS
  const mealsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&date=eq.${todayStr}&select=*`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const meals = await mealsRes.json();

  let eatenCalories = 0;
  let eatenProtein = 0;
  let eatenFat = 0;
  let eatenCarbs = 0;

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = "";

  meals.forEach((m) => {
    eatenCalories += m.calories || 0;
    eatenProtein += m.protein || 0;
    eatenFat += m.fat || 0;
    eatenCarbs += m.carbs || 0;

    const li = document.createElement("li");
    li.classList.add("meal-row");

    li.innerHTML = `
     <li class="meal-row">
  <div class="meal-left">
    <div class="meal-name">${m.food_name}</div>
    <div class="meal-macros">
      <span class="macro-protein">P ${m.protein}g</span> • 
      <span class="macro-fat">F ${m.fat}g</span> • 
      <span class="macro-carbs">C ${m.carbs}g</span>
    </div>
      </div>
      <div class="meal-right">
        <div class="meal-calories">${m.calories} kcal</div>
        <button class="delete-btn" data-id="${m.id}">✕</button>
      </div>
    `;

    foodList.appendChild(li);
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteMeal(btn.getAttribute("data-id"));
    });
  });

  document.getElementById("caloriesLabel").innerText =
    `${eatenCalories} / ${targetCalories} kcal`;

  const percent = Math.min((eatenCalories / targetCalories) * 100, 100);
  animateRing(document.getElementById("caloriesRing"), percent);

  updateBar("proteinBar", eatenProtein, proteinTarget);
  updateBar("fatBar", eatenFat, fatTarget);
  updateBar("carbsBar", eatenCarbs, carbsTarget);

  document.getElementById("proteinLabel").innerText =
    `${eatenProtein} / ${proteinTarget} g`;
  document.getElementById("fatLabel").innerText =
    `${eatenFat} / ${fatTarget} g`;
  document.getElementById("carbsLabel").innerText =
    `${eatenCarbs} / ${carbsTarget} g`;
}

function updateBar(id, consumed, target) {
  const bar = document.getElementById(id);
  const percent = Math.min((consumed / target) * 100, 100);
  bar.style.width = percent + "%";
}

// ================= TIMER =================

function startDailyTimer() {
  const timerEl = document.getElementById("timerText");
  if (!timerEl) return;

  function updateTimer() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight - now;

    const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const minutes = String(Math.floor((diff / 60000) % 60)).padStart(2, "0");
    const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");

    timerEl.innerText = `Reset in ${hours}:${minutes}:${seconds}`;
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// ================= INIT =================

document.addEventListener("DOMContentLoaded", () => {

  const sheet = document.getElementById("mealSheet");
  const overlay = document.getElementById("sheetOverlay");
  const openBtn = document.getElementById("newEntryBtn");
  const cancelBtn = document.getElementById("cancelMeal");
  const saveBtn = document.getElementById("saveMealBtn");

  function openSheet() {
    sheet.classList.add("active");
    overlay.classList.add("active");
  }

  function closeSheet() {
    sheet.classList.remove("active");
    overlay.classList.remove("active");
  }

  openBtn?.addEventListener("click", openSheet);
  cancelBtn?.addEventListener("click", closeSheet);
  overlay?.addEventListener("click", closeSheet);

  saveBtn?.addEventListener("click", async () => {

    if (saveBtn.dataset.loading === "true") return;
    saveBtn.dataset.loading = "true";

    const food_name = document.getElementById("mealName").value.trim();
    const calories = parseInt(document.getElementById("mealCalories").value, 10);
    const protein = parseInt(document.getElementById("mealProtein").value, 10) || 0;
    const carbs = parseInt(document.getElementById("mealCarbs").value, 10) || 0;
    const fat = parseInt(document.getElementById("mealFat").value, 10) || 0;

    if (!food_name || isNaN(calories)) {
      alert("Invalid input.");
      saveBtn.dataset.loading = "false";
      return;
    }

    await saveMeal({ food_name, calories, protein, carbs, fat });

    closeSheet();
    loadDashboard();

    document.getElementById("mealName").value = "";
    document.getElementById("mealCalories").value = "";
    document.getElementById("mealProtein").value = "";
    document.getElementById("mealCarbs").value = "";
    document.getElementById("mealFat").value = "";

    saveBtn.dataset.loading = "false";
  });

  loadDashboard();
  startDailyTimer();

});
