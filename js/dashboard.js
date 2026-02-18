import { deleteMeal } from "./api.js";
import { getToken, getUserIdFromToken } from "./auth.js";

// ================= DATE STATE =================

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

// ================= End =================

// ================= WEEK STATE =================

let currentWeekStart = getMonday(selectedDate);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getCurrentWeekStart() {
  return currentWeekStart;
}

export function setCurrentWeekStart(date) {
  currentWeekStart = getMonday(date);
}



export function getCurrentWeekDays() {
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

// ================= End =================



const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

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

function updateBar(id, consumed, target) {
  const bar = document.getElementById(id);
  const percent = Math.min((consumed / target) * 100, 100);
  bar.style.width = percent + "%";
}

// ================= DASHBOARD =================

export async function loadDashboard(dateOverride = null) {
  const token = getToken();
  const user_id = getUserIdFromToken();

  if (!token || !user_id) {
    window.location.href = "/";
    return;
  }

  const activeDate = dateOverride 
  ? new Date(dateOverride) 
  : selectedDate;

activeDate.setHours(0, 0, 0, 0);

const todayStr = activeDate.toISOString().split("T")[0];


  // PROFILE
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`
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
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`
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
      <div class="meal-left">
        <div class="meal-name">${m.food_name}</div>
        <div class="meal-macros">
          <span class="macro-protein">P ${m.protein}g</span>
          <span class="macro-fat">F ${m.fat}g</span>
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
    btn.addEventListener("click", async () => {
      await deleteMeal(btn.getAttribute("data-id"));
      loadDashboard();
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



// ==================== Week strip ============

export function renderWeekStrip() {
 const todayISO = todayDate.toISOString().split("T")[0];
const selectedISO = selectedDate.toISOString().split("T")[0];

const diffDays = Math.floor(
  (todayDate - day.date) / (1000 * 60 * 60 * 24)
);

const isFuture = diffDays < 0;
const isLocked = diffDays > 3;
const isToday = day.iso === todayISO;
const isSelected = day.iso === selectedISO;

if (isSelected) {
  el.classList.add("selected");
} else if (isLocked || isFuture) {
  el.classList.add("locked");
} else {
  el.classList.add("clickable");
}

if (isToday && !isSelected) {
  el.classList.add("today");
}





// ================= TIMER =================

export function startDailyTimer() {
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
