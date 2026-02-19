import { deleteMeal } from "./api.js";
import { getToken, getUserIdFromToken } from "./auth.js";

let todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);

let selectedDate = new Date(todayDate);

export function getSelectedDate() {
  return selectedDate;
}

export function setSelectedDate(date) {
  selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
}

let currentWeekStart = getMonday(selectedDate);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCurrentWeekDays() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    days.push({
      date: new Date(day),
      iso: day.toISOString().split("T")[0],
      dayNumber: day.getDate(),
      weekDay: day.toLocaleDateString("en-US", { weekday: "short" })
    });
  }
  return days;
}

const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

function animateRing(ring, targetPercent) {
  ring.style.background =
    `conic-gradient(#0f766e ${targetPercent}%, #e5e7eb ${targetPercent}%)`;
}

function updateBar(id, consumed, target) {
  const bar = document.getElementById(id);
  const percent = Math.min((consumed / target) * 100, 100);
  bar.style.width = percent + "%";
}

let timerInterval = null;

function startDailyTimer() {
  const sub = document.getElementById("goalSubtext");
  if (!sub) return;

  if (timerInterval) clearInterval(timerInterval);

  function update() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;

    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff / 60000) % 60)).padStart(2, "0");
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");

    sub.innerText = `Daily goal • Resets in ${h}:${m}:${s}`;
  }

  update();
  timerInterval = setInterval(update, 1000);
}

export async function loadDashboard(dateOverride = null) {
  const token = getToken();
  const user_id = getUserIdFromToken();
  if (!token || !user_id) return;

  const activeDate = dateOverride ? new Date(dateOverride) : selectedDate;
  activeDate.setHours(0, 0, 0, 0);
  selectedDate = activeDate;

  const dateStr = activeDate.toISOString().split("T")[0];

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }
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

  const mealsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&date=eq.${dateStr}&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }
  );
  const meals = await mealsRes.json();

  let eatenCalories = 0, eatenProtein = 0, eatenFat = 0, eatenCarbs = 0;

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
      <div class="meal-left">
        <div class="meal-name">${m.food_name}</div>
        <div class="meal-macros">
          <span>P ${m.protein}g</span>
          <span>F ${m.fat}g</span>
          <span>C ${m.carbs}g</span>
        </div>
      </div>
      <div class="meal-right">
        <div>${m.calories} kcal</div>
        <button class="delete-btn" data-id="${m.id}">✕</button>
      </div>`;
    foodList.appendChild(li);
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

  const goalTitle = document.getElementById("goalTitle");
  const goalStatus = document.getElementById("goalStatus");
  const goalSubtext = document.getElementById("goalSubtext");

  const todayISO = todayDate.toISOString().split("T")[0];
  const activeISO = dateStr;
  const diff = targetCalories - eatenCalories;

  if (activeISO === todayISO) {
    goalTitle.innerText = "Today’s Goal";
    goalStatus.innerText =
      diff >= 0 ? `${diff} Calories left` : `+${Math.abs(diff)} Calories over`;
    startDailyTimer();
  } else {
    const weekday = activeDate.toLocaleDateString("en-US", { weekday: "long" });
    goalTitle.innerText = `${weekday} Summary`;
    goalStatus.innerText =
      diff >= 0
        ? "You stayed within your goal."
        : `You went ${Math.abs(diff)} calories over.`;
    goalSubtext.innerText = "";
  }
}

export function renderWeekStrip() {
  const container = document.getElementById("weekStrip");
  container.innerHTML = "";

  const weekDays = getCurrentWeekDays();
  const todayISO = todayDate.toISOString().split("T")[0];
  const selectedISO = selectedDate.toISOString().split("T")[0];

  weekDays.forEach(day => {
    const el = document.createElement("div");
    el.classList.add("week-day");

    const diffDays = Math.floor((todayDate - day.date) / 86400000);
    const isFuture = diffDays < 0;
    const isLocked = diffDays > 3;
    const isSelected = day.iso === selectedISO;

    if (isSelected) el.classList.add("selected");
    else if (isLocked || isFuture) el.classList.add("locked");
    else el.classList.add("clickable");

    el.innerHTML = `
      <span>${day.weekDay}</span>
      <span>${day.dayNumber}</span>
    `;

    if (!isLocked && !isFuture) {
      el.addEventListener("click", () => {
        setSelectedDate(day.date);
        renderWeekStrip();
        loadDashboard(day.date);
      });
    }

    container.appendChild(el);
  });
}
