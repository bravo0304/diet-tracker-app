const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";


// ================= LOGIN =================

async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const status = document.getElementById("status");

  if (!email || !password) {
    if (status) status.innerText = "Enter email and password";
    return;
  }

  if (status) status.innerText = "Logging in...";

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
    if (status) status.innerText = "Login failed";
    return;
  }

  localStorage.setItem("token", data.access_token);
  window.location.href = "/dashboard.html";
}


// ================= UTIL =================

function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}

function getToken() {
  return localStorage.getItem("token");
}

function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  const user = parseJwt(token);
  return user.sub;
}

function getTodayString() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
}


// ================= MODAL =================

function openMealModal() {
  document.getElementById("mealModal")?.classList.remove("hidden");
}

function closeMealModal() {
  document.getElementById("mealModal")?.classList.add("hidden");
}


// ================= SAVE MEAL =================

async function saveMeal(meal) {
  const token = getToken();
  const user_id = getUserIdFromToken();

  if (!token || !user_id) {
    alert("Not authenticated.");
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
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      meal_type: "general",
      date: today
    })
  });

  if (!res.ok) {
    alert("Error saving meal.");
    return;
  }

  closeMealModal();
  loadDashboard();
}


// ================= DELETE MEAL =================

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


// ================= RING ANIMATION =================

function animateRing(ring, targetPercent) {
  let current = 0;
  const step = targetPercent / 30;

  function update() {
    current += step;

    if (current >= targetPercent) {
      current = targetPercent;
    }

    ring.style.background =
      `conic-gradient(#FF6B4A ${current}%, #E5E5E5 ${current}%)`;

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

  // ---- FETCH PROFILE ----
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
  if (!profiles || !profiles.length) return;

  const profile = profiles[0];

  const W = profile.weight_kg || 72;
  const H = profile.height_cm || 170;
  const A = profile.age || 32;
  const sex = profile.sex || "male";

  let bmr = sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * 1.4;
  const targetCalories = Math.round(tdee);

  const proteinTarget = Math.round((targetCalories * 0.3) / 4);
  const fatTarget = Math.round((targetCalories * 0.25) / 9);
  const carbsTarget = Math.round((targetCalories * 0.45) / 4);


  // ---- FETCH MEALS ----
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
  if (foodList) foodList.innerHTML = "";

  if (Array.isArray(meals)) {

    meals.forEach((m) => {

      eatenCalories += m.calories || 0;
      eatenProtein += m.protein || 0;
      eatenFat += m.fat || 0;
      eatenCarbs += m.carbs || 0;

      if (foodList) {
        const li = document.createElement("li");
        li.classList.add("meal-row");

        li.innerHTML = `
          <div class="meal-left">
            <div class="meal-name">${m.food_name}</div>
            <div class="meal-macros">
              P ${m.protein}g • F ${m.fat}g • C ${m.carbs}g
            </div>
          </div>

          <div class="meal-right">
            <div class="meal-calories">${m.calories} kcal</div>
            <button class="delete-btn" data-id="${m.id}">✕</button>
          </div>
        `;

        foodList.appendChild(li);
      }
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        deleteMeal(btn.getAttribute("data-id"));
      });
    });
  }

  // ---- UPDATE RING ----
  const caloriesLabel = document.getElementById("caloriesLabel");
  if (caloriesLabel) {
    caloriesLabel.innerText = `${eatenCalories} / ${targetCalories} kcal`;
  }

  const percent = Math.min((eatenCalories / targetCalories) * 100, 100);
  const ring = document.getElementById("caloriesRing");
  if (ring) {
    animateRing(ring, percent);
  }

  // ---- UPDATE BARS ----
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


// ================= UPDATE BAR =================

function updateBar(id, consumed, target) {
  const bar = document.getElementById(id);
  if (!bar) return;
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

  if (document.getElementById("caloriesLabel")) {
    loadDashboard();
    startDailyTimer();
  }

  document.getElementById("newEntryBtn")?.addEventListener("click", openMealModal);
  document.getElementById("cancelMeal")?.addEventListener("click", closeMealModal);

  document.getElementById("saveMealBtn")?.addEventListener("click", async () => {
    const food_name = document.getElementById("mealName").value;
    const calories = parseInt(document.getElementById("mealCalories").value, 10);
    const protein = parseInt(document.getElementById("mealProtein").value, 10);
    const carbs = parseInt(document.getElementById("mealCarbs").value, 10);
    const fat = parseInt(document.getElementById("mealFat").value, 10);

    if (!food_name || isNaN(calories)) {
      alert("Invalid input.");
      return;
    }

    await saveMeal({ food_name, calories, protein, carbs, fat });
  });

});
