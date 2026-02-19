
import { deleteMeal } from "./api.js";
import { supabase, requireAuth } from "./auth.js";


/* ===========================
   INIT AUTH
=========================== */

initAuthListener();

let session = await requireAuth();
if (!session) throw new Error("No active session");

/* ===========================
   DATE STATE
=========================== */

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

/* ===========================
   WEEK SYSTEM
=========================== */

let currentWeekStart = getMonday(selectedDate);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
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

export function renderWeekStrip() {
  const container = document.getElementById("weekStrip");
  if (!container) return;

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

/* ===========================
   UI HELPERS
=========================== */

function animateRing(ring, targetPercent) {
  if (!ring) return;
  ring.style.background =
    `conic-gradient(#077a7d ${targetPercent}%, #e5e7eb ${targetPercent}%)`;
}

function updateBar(id, consumed, target) {
  const bar = document.getElementById(id);
  if (!bar || !target) return;
  const percent = Math.min((consumed / target) * 100, 100);
  bar.style.width = percent + "%";
}

/* ===========================
   TIMER
=========================== */

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

    sub.innerText = `Resets in ${h}:${m}:${s}`;
  }

  update();
  timerInterval = setInterval(update, 1000);
}

/* ===========================
   MAIN DASHBOARD LOAD
=========================== */

export async function loadDashboard(dateOverride = null) {

  session = await requireAuth();
  if (!session) return;

  const user_id = session.user.id;

  const activeDate = dateOverride ? new Date(dateOverride) : selectedDate;
  activeDate.setHours(0, 0, 0, 0);
  selectedDate = activeDate;

  const dateStr = activeDate.toISOString().split("T")[0];

  /* ===== PROFILE ===== */

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user_id)
    .single();

  if (profileError) {
    console.error("Profile error:", profileError);
    return;
  }

  const profile = profiles;

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

  /* ===== MEALS ===== */

  const { data: meals, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateStr);

  if (mealsError) {
    console.error("Meals error:", mealsError);
    return;
  }

  let eatenCalories = 0;
  let eatenProtein = 0;
  let eatenFat = 0;
  let eatenCarbs = 0;

  const foodList = document.getElementById("foodEntries");
  if (foodList) foodList.innerHTML = "";

  meals.forEach((m) => {
    eatenCalories += m.calories || 0;
    eatenProtein += m.protein || 0;
    eatenFat += m.fat || 0;
    eatenCarbs += m.carbs || 0;

    if (!foodList) return;

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
      loadDashboard(activeDate);
    });
  });

  /* ===== UPDATE UI ===== */

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

  /* ===== SUMMARY ===== */

  const goalBigNumber = document.getElementById("goalBigNumber");
  const goalLabel = document.getElementById("goalLabel");
  const goalSubtext = document.getElementById("goalSubtext");

  const todayISO = todayDate.toISOString().split("T")[0];
  const diff = targetCalories - eatenCalories;

  if (timerInterval) clearInterval(timerInterval);

  if (dateStr === todayISO) {

    goalBigNumber.innerText = Math.abs(diff);

    if (diff > 0) goalLabel.innerText = "Calories left";
    else if (diff < 0) goalLabel.innerText = "Calories over";
    else goalLabel.innerText = "Goal met exactly";

    startDailyTimer();

  } else {

    const weekday = activeDate.toLocaleDateString("en-US", { weekday: "long" });

    if (eatenCalories === 0) {
      goalBigNumber.innerText = "—";
      goalLabel.innerText = "No entries logged";
    } else if (diff > 0) {
      goalBigNumber.innerText = Math.abs(diff);
      goalLabel.innerText = "Under goal";
    } else if (diff < 0) {
      goalBigNumber.innerText = Math.abs(diff);
      goalLabel.innerText = "Over goal";
    } else {
      goalBigNumber.innerText = 0;
      goalLabel.innerText = "Goal met exactly";
    }

    goalSubtext.innerText = `${weekday} summary`;
  }
}

/* ===========================
   INITIAL LOAD
=========================== */

document.addEventListener("DOMContentLoaded", async () => {
  renderWeekStrip();
  await loadDashboard();
});
