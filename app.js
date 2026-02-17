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
  window.location.href = "/dashboard.html";
}

// ---------- UTIL ----------
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

// ---------- ADD MEAL MODAL ----------
function openMealModal() {
  document.getElementById("mealModal")?.classList.remove("hidden");
}

function closeMealModal() {
  document.getElementById("mealModal")?.classList.add("hidden");
}

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
    const err = await res.text();
    console.error("Insert error:", err);
    alert("Error saving meal.");
    return;
  }

  closeMealModal();
  loadCalories();
}

// ---------- DASHBOARD ----------
var caloriesChart;

function drawCaloriesRing(consumed, target) {
  const ctx = document.getElementById("caloriesRing")?.getContext("2d");
  if (!ctx) return;

  if (caloriesChart) caloriesChart.destroy();

  const remaining = Math.max(target - consumed, 0);

  caloriesChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: consumed === 0 ? [1] : [consumed, remaining],
        backgroundColor: consumed === 0 ? ["#EEEEEE"] : ["#FF6B4A", "#EEEEEE"],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "75%",
      plugins: { legend: { display: false } },
      responsive: false,
      maintainAspectRatio: false
    }
  });
}

function drawMacroPie(id, consumed, target, color) {
  const ctx = document.getElementById(id)?.getContext("2d");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [consumed, Math.max(target - consumed, 0)],
        backgroundColor: [color, "#EEEEEE"],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "70%",
      plugins: { legend: { display: false } },
      responsive: false,
      maintainAspectRatio: false
    }
  });
}

async function loadCalories() {
  const caloriesLabel = document.getElementById("caloriesLabel");
  if (!caloriesLabel) return;

  const token = getToken();
  const user_id = getUserIdFromToken();

  if (!token || !user_id) {
    window.location.href = "/";
    return;
  }

  const todayStr = getTodayString();

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
  if (!Array.isArray(profiles) || profiles.length === 0) {
    console.error("Profile not found");
    return;
  }

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

  const proteinG = Math.round((targetCalories * 0.3) / 4);
  const fatG = Math.round((targetCalories * 0.25) / 9);
  const carbsG = Math.round((targetCalories * 0.45) / 4);

  // ---------- FETCH MEALS ----------
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

  if (!Array.isArray(meals)) {
    console.error("Meals error:", meals);
    return;
  }

  let eatenCalories = 0,
      eatenProtein = 0,
      eatenFat = 0,
      eatenCarbs = 0;

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = "";

  if (meals.length === 0) {
    const li = document.createElement("li");
    li.style.color = "#666";
    li.innerText = "No meals logged today";
    foodList.appendChild(li);
  } else {
    meals.forEach((m, i) => {
      eatenCalories += m.calories || 0;
      eatenProtein += m.protein || 0;
      eatenFat += m.fat || 0;
      eatenCarbs += m.carbs || 0;

      const li = document.createElement("li");
      li.innerText =
        `${i + 1}. ${m.food_name} - ${m.calories} Cal | ` +
        `P:${m.protein}g F:${m.fat}g C:${m.carbs}g`;
      foodList.appendChild(li);
    });
  }

  caloriesLabel.innerText = `${eatenCalories} / ${targetCalories} kcal`;
  document.getElementById("proteinLabel").innerText =
    `Protein: ${eatenProtein} / ${proteinG} g`;
  document.getElementById("fatLabel").innerText =
    `Fat: ${eatenFat} / ${fatG} g`;
  document.getElementById("carbsLabel").innerText =
    `Carbs: ${eatenCarbs} / ${carbsG} g`;

  drawCaloriesRing(eatenCalories, targetCalories);
  drawMacroPie("proteinPie", eatenProtein, proteinG, "#FF6B4A");
  drawMacroPie("fatPie", eatenFat, fatG, "#4ABEFF");
  drawMacroPie("carbsPie", eatenCarbs, carbsG, "#28A745");
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadCalories();

  const newEntryBtn = document.getElementById("newEntryBtn");
  if (newEntryBtn) {
    newEntryBtn.addEventListener("click", openMealModal);
  }

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
