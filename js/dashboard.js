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

let currentWeekStart = getMonday(selectedDate);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function shiftWeek(days) {
  currentWeekStart.setDate(currentWeekStart.getDate() + days);
  renderWeekStrip();
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
  container.innerHTML = "";

  const weekDays = getCurrentWeekDays();
  const selectedISO = selectedDate.toISOString().split("T")[0];
  const todayISO = todayDate.toISOString().split("T")[0];

  weekDays.forEach(day => {

    const el = document.createElement("div");
    el.classList.add("week-day");

    const isFuture = day.iso > todayISO;
    const isPast = day.iso < todayISO;
    const isSelected = day.iso === selectedISO;

    if (isSelected) el.classList.add("selected");
    else if (isPast || isFuture) el.classList.add("locked");
    else el.classList.add("clickable");

    el.innerHTML = `
      <span>${day.weekDay}</span>
      <span>${day.dayNumber}</span>
    `;

    if (!isPast && !isFuture) {
      el.addEventListener("click", () => {
        setSelectedDate(day.date);
        renderWeekStrip();
        loadDashboard(day.date);
      });
    }

    container.appendChild(el);
  });

  /* ===== Swipe Support ===== */

  let touchStartX = null;

  container.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  container.addEventListener("touchend", e => {
    if (touchStartX === null) return;

    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        shiftWeek(-7); // swipe left → previous week
      } else {
        shiftWeek(7);  // swipe right → next week
      }
    }

    touchStartX = null;
  });
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

  const session = await requireAuth();
  if (!session) return;

  const user_id = session.user.id;

  const activeDate = dateOverride ? new Date(dateOverride) : selectedDate;
  activeDate.setHours(0, 0, 0, 0);
  selectedDate = activeDate;

  const dateStr = activeDate.toISOString().split("T")[0];
  const todayISO = todayDate.toISOString().split("T")[0];
  const isToday = dateStr === todayISO;

  /* ===== PROFILE ===== */

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

  /* ===== CALCULATION ===== */

  let bmr = sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * multiplier;

  let calorieMultiplier = 1;
  if (goal === "lose") calorieMultiplier = 0.85;
  if (goal === "gain") calorieMultiplier = 1.08;

  const targetCalories = Math.round(tdee * calorieMultiplier);

  let proteinPerKg = goal === "lose" ? 2.0 : 1.8;
  const proteinTarget = Math.round(W * proteinPerKg);

  const fatTarget = Math.round((targetCalories * 0.25) / 9);
  const carbsTarget = Math.max(
    0,
    Math.round((targetCalories - (proteinTarget * 4) - (fatTarget * 9)) / 4)
  );

  /* ===== MEALS ===== */

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
        ${isToday ? `<button class="delete-btn" data-id="${m.id}">✕</button>` : ""}
      </div>
    `;

    foodList.appendChild(li);
  });

  if (isToday) {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteMeal(btn.getAttribute("data-id"));
        loadDashboard(activeDate);
      });
    });
  }

  const addBtn = document.getElementById("newEntryBtn");
  if (addBtn) {
    addBtn.style.display = isToday ? "block" : "none";
  }

  /* ===== UI UPDATE ===== */

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

  /* ===== SUMMARY ===== */

  const goalBigNumber = document.getElementById("goalBigNumber");
  const goalLabel = document.getElementById("goalLabel");
  const goalSubtext = document.getElementById("goalSubtext");

  const diff = targetCalories - eatenCalories;

  if (timerInterval) clearInterval(timerInterval);

  if (isToday) {

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
