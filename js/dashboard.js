import { deleteMeal } from "./api.js";
import { supabase, requireAuth } from "./auth.js";

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

let weekOffset = 0;

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCurrentWeekStart() {
  const base = new Date(todayDate);
  base.setDate(base.getDate() + weekOffset * 7);
  return getMonday(base);
}

function shiftWeek(direction) {
  weekOffset += direction;
  renderWeekStrip();
}

export function getCurrentWeekDays() {
  const weekStart = getCurrentWeekStart();
  const days = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);

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
  container.innerHTML = "";

  const weekDays = getCurrentWeekDays();
  const selectedISO = selectedDate.toISOString().split("T")[0];
  const todayISO = todayDate.toISOString().split("T")[0];

  weekDays.forEach(day => {

    const el = document.createElement("div");
    el.classList.add("week-day");

    const diffDays = Math.floor((todayDate - day.date) / 86400000);
    const isFuture = diffDays < 0;
    const isSelected = day.iso === selectedISO;

    if (isSelected) el.classList.add("selected");
    else if (isFuture) el.classList.add("locked");
    else el.classList.add("clickable");

    el.innerHTML = `
      <span>${day.weekDay}</span>
      <span>${day.dayNumber}</span>
    `;

    if (!isFuture) {
      el.addEventListener("click", () => {
        setSelectedDate(day.date);
        renderWeekStrip();
        loadDashboard(day.date);
      });
    }

    container.appendChild(el);
  });

  /* Swipe Support */

  let touchStartX = null;

  container.ontouchstart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  container.ontouchend = (e) => {
    if (touchStartX === null) return;

    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > 50) {
  if (diff > 0) shiftWeek(-1);  // previous week
  else shiftWeek(1);            // next week
}

    touchStartX = null;
  };
}

/* ===========================
   UI HELPERS
=========================== */

function animateRing(ring, targetPercent) {
  ring.style.background =
    `conic-gradient(#077a7d ${targetPercent}%, #e5e7eb ${targetPercent}%)`;
}

function updateBar(id, consumed, target) {
  const bar = document.getElementById(id);
  const percent = target > 0
    ? Math.min((consumed / target) * 100, 100)
    : 0;
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

  const session = await requireAuth();
  if (!session) return;

  const user_id = session.user.id;

  const activeDate = dateOverride ? new Date(dateOverride) : selectedDate;
  activeDate.setHours(0, 0, 0, 0);
  selectedDate = activeDate;

  const dateStr = activeDate.toISOString().split("T")[0];
  const diffDays = Math.floor((todayDate - activeDate) / 86400000);

  const isFuture = diffDays < 0;
  const isEditable = diffDays >= 0 && diffDays <= 2;

  if (isFuture) return;

  /* PROFILE */

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user_id);

  if (!profiles || profiles.length === 0) {
    window.location.href = "/onboarding.html";
    return;
  }

  const profile = profiles[0];

  const W = profile.weight_kg || 72;
  const H = profile.height_cm || 170;
  const A = profile.age || 30;
  const sex = profile.sex || "male";
  const goal = profile.goal || "maintain";
  const multiplier = profile.activity_multiplier || 1.4;

  let bmr = sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * multiplier;

  let calorieMultiplier = 1;
  if (goal === "lose") calorieMultiplier = 0.85;
  if (goal === "gain") calorieMultiplier = 1.08;

  const targetCalories = Math.round(tdee * calorieMultiplier);

  const proteinTarget = Math.round(W * (goal === "lose" ? 2.0 : 1.8));
  const fatTarget = Math.round((targetCalories * 0.25) / 9);
  const carbsTarget = Math.max(
    0,
    Math.round((targetCalories - (proteinTarget * 4) - (fatTarget * 9)) / 4)
  );

  /* MEALS */

  const { data: meals } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateStr);

  let eatenCalories = 0;
  let eatenProtein = 0;
  let eatenFat = 0;
  let eatenCarbs = 0;

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = "";

  meals?.forEach((m) => {

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
        <div class="meal-calories">${m.calories} kcal</div>
        ${isEditable ? `<button class="delete-btn" data-id="${m.id}">✕</button>` : ""}
      </div>
    `;

    foodList.appendChild(li);
  });

  if (isEditable) {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteMeal(btn.getAttribute("data-id"));
        loadDashboard(activeDate);
      });
    });
  }

  const addBtn = document.getElementById("newEntryBtn");
  if (addBtn) {
    addBtn.style.display = isEditable ? "block" : "none";
  }

  /* UPDATE UI */

  document.getElementById("caloriesLabel").innerText =
    `${eatenCalories} / ${targetCalories} kcal`;

  animateRing(
    document.getElementById("caloriesRing"),
    Math.min((eatenCalories / targetCalories) * 100, 100)
  );

  updateBar("proteinBar", eatenProtein, proteinTarget);
  updateBar("fatBar", eatenFat, fatTarget);
  updateBar("carbsBar", eatenCarbs, carbsTarget);

  document.getElementById("proteinLabel").innerText =
    `${eatenProtein} / ${proteinTarget} g`;
  document.getElementById("fatLabel").innerText =
    `${eatenFat} / ${fatTarget} g`;
  document.getElementById("carbsLabel").innerText =
    `${eatenCarbs} / ${carbsTarget} g`;

  const goalBigNumber = document.getElementById("goalBigNumber");
  const goalLabel = document.getElementById("goalLabel");
  const goalSubtext = document.getElementById("goalSubtext");

  const diff = targetCalories - eatenCalories;

  if (timerInterval) clearInterval(timerInterval);

  if (diffDays === 0) {
    goalBigNumber.innerText = Math.abs(diff);
    goalLabel.innerText =
      diff > 0 ? "Calories left"
      : diff < 0 ? "Calories over"
      : "Goal met exactly";
    startDailyTimer();
  } else {
    const weekday = activeDate.toLocaleDateString("en-US", { weekday: "long" });
    goalBigNumber.innerText = eatenCalories === 0 ? "—" : Math.abs(diff);
    goalLabel.innerText =
      eatenCalories === 0 ? "No entries logged"
      : diff > 0 ? "Under goal"
      : diff < 0 ? "Over goal"
      : "Goal met exactly";
    goalSubtext.innerText = `${weekday} summary`;
  }
}
