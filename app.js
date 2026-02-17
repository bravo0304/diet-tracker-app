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

// ---------- DASHBOARD ----------
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

  // ---------- DATE ----------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

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
  const goal = profile.goal || "weight_loss";

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
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&created_at=gte.${todayStr}&select=calories,protein,fat,carbs`,
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
        `${i + 1}. Entry - ${m.calories} Cal | ` +
        `P:${m.protein}g F:${m.fat}g C:${m.carbs}g`;
      foodList.appendChild(li);
    });
  }

  // ---------- UPDATE UI ----------
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

// ---------- CHARTS ----------
var caloriesChart;

function drawCaloriesRing(consumed, target) {
  const ctx = document.getElementById("caloriesRing").getContext("2d");
  if (caloriesChart) caloriesChart.destroy();

  caloriesChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Consumed", "Remaining"],
      datasets: [{
        data: [consumed, Math.max(target - consumed, 0)],
        backgroundColor: ["#FF6B4A", "#EEEEEE"],
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

function drawMacroPie(id, consumed, target, color) {
  const ctx = document.getElementById(id).getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Consumed", "Remaining"],
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

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadCalories();
});
