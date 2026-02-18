const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "YOUR_KEY_HERE";

let caloriesChart;

// ===== UTIL =====

function getToken() {
  return localStorage.getItem("token");
}

function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}

function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  return parseJwt(token).sub;
}

function getTodayString() {
  const today = new Date();
  today.setHours(0,0,0,0);
  return today.toISOString().split("T")[0];
}

// ===== DRAW RING =====

function drawCaloriesRing(consumed, target) {
  const canvas = document.getElementById("caloriesRing");
  if (!canvas) return;

  canvas.width = 260;
  canvas.height = 260;

  const ctx = canvas.getContext("2d");

  if (caloriesChart) caloriesChart.destroy();

  const remaining = Math.max(target - consumed, 0);

  caloriesChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [Math.min(consumed, target), remaining],
        backgroundColor: ["#FF6B4A", "#E5E5E5"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: false,
      animation: false,
      cutout: "70%",
      plugins: { legend: { display: false } }
    }
  });
}

// ===== LOAD DASHBOARD =====

async function loadCalories() {
  const token = getToken();
  const user_id = getUserIdFromToken();
  if (!token || !user_id) return;

  const today = getTodayString();

  const mealsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&date=eq.${today}&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }
  );

  const meals = await mealsRes.json();

  let eatenCalories = 0, eatenProtein = 0, eatenFat = 0, eatenCarbs = 0;

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = "";

  meals.forEach(m => {
    eatenCalories += m.calories || 0;
    eatenProtein += m.protein || 0;
    eatenFat += m.fat || 0;
    eatenCarbs += m.carbs || 0;

    const li = document.createElement("li");
    li.classList.add("meal-row");

    li.innerHTML = `
      <div class="meal-left">
        <div class="meal-name">${m.food_name}</div>
        <div class="meal-macros">P ${m.protein}g • F ${m.fat}g • C ${m.carbs}g</div>
      </div>
      <div class="meal-right">
        <div class="meal-calories">${m.calories} kcal</div>
        <button class="delete-btn" data-id="${m.id}">✕</button>
      </div>
    `;

    foodList.appendChild(li);
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await fetch(`${SUPABASE_URL}/rest/v1/meals?id=eq.${btn.dataset.id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
      });
      loadCalories();
    });
  });

  const target = 2287; // temporary static target

  document.getElementById("caloriesLabel").innerText =
    `${eatenCalories} / ${target} kcal`;

  document.getElementById("proteinLabel").innerText =
    `${eatenProtein} / 172 g`;
  document.getElementById("fatLabel").innerText =
    `${eatenFat} / 64 g`;
  document.getElementById("carbsLabel").innerText =
    `${eatenCarbs} / 257 g`;

  document.getElementById("proteinBar").style.width =
    Math.min((eatenProtein / 172) * 100, 100) + "%";
  document.getElementById("fatBar").style.width =
    Math.min((eatenFat / 64) * 100, 100) + "%";
  document.getElementById("carbsBar").style.width =
    Math.min((eatenCarbs / 257) * 100, 100) + "%";

  drawCaloriesRing(eatenCalories, target);
}

// ===== INIT =====

document.addEventListener("DOMContentLoaded", () => {
  loadCalories();
});
