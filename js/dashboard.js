import { getToken, getUserIdFromToken } from "./auth.js";
import { SUPABASE_URL, SUPABASE_KEY } from "./api.js";

let selectedDate = new Date();
const todayDate = new Date();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function isToday(date) {
  return formatDate(date) === formatDate(todayDate);
}

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export async function loadDashboard(date = selectedDate) {
  selectedDate = date;

  const token = getToken();
  const userId = getUserIdFromToken();
  if (!token || !userId) return;

  const dateStr = formatDate(date);

  // Load Profile
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );

  const profileData = await profileRes.json();
  const profile = profileData[0];

  const dailyCalories = 2287; // or calculate from profile if needed
  const proteinGoal = 172;
  const fatGoal = 64;
  const carbsGoal = 257;

  // Load Meals
  const mealsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${userId}&date=eq.${dateStr}&select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );

  const meals = await mealsRes.json();

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  meals.forEach(meal => {
    totalCalories += meal.calories || 0;
    totalProtein += meal.protein || 0;
    totalFat += meal.fat || 0;
    totalCarbs += meal.carbs || 0;
  });

  // ===== UPDATE BIG GOAL DISPLAY =====

  const caloriesLeft = dailyCalories - totalCalories;

  const goalBigNumber = document.getElementById("goalBigNumber");
  const goalLabel = document.getElementById("goalLabel");
  const goalSubtext = document.getElementById("goalSubtext");

  if (isToday(date)) {

    goalBigNumber.innerText = Math.abs(caloriesLeft);

    goalLabel.innerText =
      caloriesLeft >= 0 ? "Calories left" : "Calories over";

    goalSubtext.innerText = `Resets in ${formatTime(getTimeUntilMidnight())}`;

  } else {

    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    if (meals.length === 0) {
      goalBigNumber.innerText = "—";
      goalLabel.innerText = "No entries logged";
      goalSubtext.innerText = "";
    } else if (caloriesLeft >= 0) {
      goalBigNumber.innerText = Math.abs(caloriesLeft);
      goalLabel.innerText = `Under goal`;
      goalSubtext.innerText = `${dayName} summary`;
    } else {
      goalBigNumber.innerText = Math.abs(caloriesLeft);
      goalLabel.innerText = `Over goal`;
      goalSubtext.innerText = `${dayName} summary`;
    }
  }

  // ===== UPDATE RING =====

  const percent = Math.min((totalCalories / dailyCalories) * 100, 100);

  document.getElementById("caloriesLabel").innerText =
    `${totalCalories} / ${dailyCalories} kcal`;

  document.getElementById("caloriesRing").style.background =
    `conic-gradient(var(--primary) ${percent}%, #e5e7eb ${percent}%)`;

  // ===== UPDATE MACROS =====

  updateMacro("protein", totalProtein, proteinGoal);
  updateMacro("fat", totalFat, fatGoal);
  updateMacro("carbs", totalCarbs, carbsGoal);

  // ===== UPDATE FOOD LIST =====

  const list = document.getElementById("foodEntries");
  list.innerHTML = "";

  meals.forEach(meal => {
    const li = document.createElement("li");
    li.innerText = `${meal.food_name} - ${meal.calories} kcal`;
    list.appendChild(li);
  });

  startCountdownIfToday();
}

function updateMacro(type, value, goal) {
  const percent = Math.min((value / goal) * 100, 100);

  document.getElementById(`${type}Label`).innerText =
    `${value} / ${goal} g`;

  document.getElementById(`${type}Bar`).style.width =
    `${percent}%`;
}

function startCountdownIfToday() {
  if (!isToday(selectedDate)) return;

  const sub = document.getElementById("goalSubtext");

  setInterval(() => {
    if (isToday(selectedDate)) {
      sub.innerText = `Resets in ${formatTime(getTimeUntilMidnight())}`;
    }
  }, 1000);
}
