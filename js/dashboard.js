import { deleteMeal } from "./api.js";
import { supabase, requireAuth } from "./auth.js";
import { getOrCreateDailyTarget } from "./targets.js";


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
   WEEK SYSTEM (STABLE VERSION)
=========================== */

let currentAnchorDate = new Date(selectedDate);

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function shiftWeek(direction) {
  currentAnchorDate.setDate(currentAnchorDate.getDate() + direction * 7);
  renderWeekStrip();
}

export function getCurrentWeekDays() {
  const weekStart = getMonday(currentAnchorDate);
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

  weekDays.forEach(day => {

    const el = document.createElement("div");
    el.classList.add("week-day");

const diffDays = Math.floor((todayDate - day.date) / 86400000);
const isFuture = diffDays < 0;
const isEditable = diffDays >= 0 && diffDays <= 3;
const isToday = day.iso === todayDate.toISOString().split("T")[0];
const isSelected = day.iso === selectedISO;

if (isSelected) {
  el.classList.add("selected");
} else {
  el.classList.add("clickable");
}

if (isToday && !isSelected) {
  el.classList.add("today-outline");
}

if (!isEditable && !isFuture) {
  el.classList.add("view-only");
}

if (isFuture) {
  el.classList.add("future");
}

    el.innerHTML = `
      <span>${day.weekDay}</span>
      <span>${day.dayNumber}</span>
    `;

    el.addEventListener("click", () => {
      setSelectedDate(day.date);
      currentAnchorDate = new Date(day.date);
      renderWeekStrip();
      loadDashboard(day.date);
    });

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
  if (diff > 0) shiftWeek(1);   // swipe left → next week
  else shiftWeek(-1);           // swipe right → previous week
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
  const isEditable = diffDays >= 0 && diffDays <= 3;


if (isFuture) {
  // Clear food list
  const foodList = document.getElementById("foodEntries");
  if (foodList) foodList.innerHTML = "";

  // Hide add button
  const addBtn = document.getElementById("newEntryBtn");
  if (addBtn) addBtn.style.display = "none";

  // Reset summary display
  document.getElementById("caloriesLabel").innerText = `0 / 0 Calories`;
  document.getElementById("proteinLabel").innerText = `0 / 0 g`;
  document.getElementById("fatLabel").innerText = `0 / 0 g`;
  document.getElementById("carbsLabel").innerText = `0 / 0 g`;

  animateRing(document.getElementById("caloriesRing"), 0);
  updateBar("proteinBar", 0, 1);
  updateBar("fatBar", 0, 1);
  updateBar("carbsBar", 0, 1);

  document.getElementById("goalBigNumber").innerText = "—";
  document.getElementById("goalLabel").innerText = "Future day";
  document.getElementById("goalSubtext").innerText = "No data yet";

  return;
}

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

const snapshot = await getOrCreateDailyTarget(user_id, dateStr);
if (!snapshot) {
  console.error("No snapshot returned.");
  return;
}

const targetCalories = snapshot.calories_target;
const proteinTarget = snapshot.protein_target;
const fatTarget = snapshot.fat_target;
const carbsTarget = snapshot.carbs_target;
  
/* MEALS */

const { data: meals } = await supabase
  .from("meals")
  .select("*")
  .eq("user_id", user_id)
  .eq("date", dateStr);

// STEP 1 — Get meal IDs
const mealIds = meals?.map(m => m.id) || [];

// STEP 2 — Fetch meal_items
let mealItems = [];

if (mealIds.length > 0) {
  const { data } = await supabase
    .from("meal_items")
    .select("*")
    .in("meal_id", mealIds);

  mealItems = data || [];
}

// STEP 3 — Aggregate totals (ingredient-based only)
let eatenCalories = 0;
let eatenProtein = 0;
let eatenFat = 0;
let eatenCarbs = 0;

mealItems.forEach(item => {
  eatenCalories += item.calories || 0;
  eatenProtein += item.protein || 0;
  eatenFat += item.fat || 0;
  eatenCarbs += item.carbs || 0;
});

  const foodList = document.getElementById("foodEntries");
  foodList.innerHTML = "";

  meals?.forEach((m) => {
    // Aggregate ingredients for this meal
const ingredients = mealItems.filter(item => item.meal_id === m.id);

let mealCalories = 0;
let mealProtein = 0;
let mealFat = 0;
let mealCarbs = 0;

ingredients.forEach(item => {
  mealCalories += item.calories || 0;
  mealProtein += item.protein || 0;
  mealFat += item.fat || 0;
  mealCarbs += item.carbs || 0;
});
    const li = document.createElement("li");
    li.classList.add("meal-row", "clickable-meal");
    li.dataset.id = m.id;



    li.innerHTML = `
  <div class="meal-left">
    <div class="meal-name">${m.food_name}</div>
    <div class="meal-macros">
      <span class="macro-protein">P ${mealProtein}g</span>
      <span class="macro-fat">F ${mealFat}g</span>
      <span class="macro-carbs">C ${mealCarbs}g</span>
    </div>
  </div>

  <div class="meal-right">
    <div class="meal-calories">${mealCalories} Calories</div>
    ${isEditable ? `
      <button class="delete-btn" data-id="${m.id}">✕</button>
    ` : ""}
  </div>
`;

    foodList.appendChild(li);
  });

if (isEditable) {
  const deleteButtons = document.querySelectorAll(".delete-btn");

  deleteButtons.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const mealId = btn.dataset.id;

      await deleteMeal(mealId);
      await loadDashboard(activeDate);
    });
  });
}



// Meal row click → open ingredient view
document.querySelectorAll(".clickable-meal").forEach(row => {
  row.addEventListener("click", async (e) => {

    // Ignore edit/delete clicks
    if (e.target.closest(".edit-btn") || e.target.closest(".delete-btn")) {
      return;
    }

    const mealId = row.dataset.id;

    const { data: items } = await supabase
      .from("meal_items")
      .select("*")
      .eq("meal_id", mealId);

    openMealDetailSheet(items || [], mealId);
  });
});


  const addBtn = document.getElementById("newEntryBtn");
  if (addBtn) {
    addBtn.style.display = isEditable ? "block" : "none";
  }

  /* UPDATE UI */

const ringNumber = document.getElementById("ringNumber");
if (ringNumber) {
  ringNumber.innerText = `${eatenCalories} / ${targetCalories}`;
}

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

/* ===========================
   MEAL DETAIL SHEET
=========================== */

function openMealDetailSheet(items, mealId) { 
  const sheet = document.getElementById("mealDetailSheet");
  sheet.dataset.mealId = mealId;

  const overlay = document.getElementById("sheetOverlay");
  const container = document.getElementById("mealDetailList");

  container.innerHTML = "";

  items.forEach(item => {

    const row = document.createElement("div");
    row.classList.add("meal-row", "clickable-ingredient");

    row.dataset.id = item.id;

    row.innerHTML = `
      <div class="ingredient-left">
        <div class="ingredient-name">
          ${(item.food_name || "Ingredient").toUpperCase()}
        </div>
        <div class="meal-macros">
          <span class="macro-protein">P ${item.protein || 0}g</span>
          <span class="macro-fat">F ${item.fat || 0}g</span>
          <span class="macro-carbs">C ${item.carbs || 0}g</span>
        </div>
      </div>

      <div class="ingredient-right">
        <div class="ingredient-calories">
          ${item.calories || 0} Calories
        </div>
        <button class="ingredient-delete" data-id="${item.id}">✕</button>
      </div>
    `;

    container.appendChild(row);
  });

  /* Delete ingredient */
  container.querySelectorAll(".ingredient-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const id = btn.dataset.id;

      await supabase
        .from("meal_items")
        .delete()
        .eq("id", id);

      await loadDashboard(getSelectedDate());
    });
  });

  /* Edit ingredient */
  container.querySelectorAll(".clickable-ingredient").forEach(row => {
    row.addEventListener("click", async (e) => {

      if (e.target.closest(".ingredient-delete")) return;

      const ingredientId = row.dataset.id;

      const { data: ingredient } = await supabase
        .from("meal_items")
        .select("*")
        .eq("id", ingredientId)
        .single();

      if (!ingredient) return;

      openIngredientEditSheet(ingredient);
    });
  });

  sheet.classList.add("open");
  overlay.classList.add("open");
}


/* ===========================
   INGREDIENT EDIT SHEET
=========================== */

function openIngredientEditSheet(ingredient) {

  // Close meal detail
  document.getElementById("mealDetailSheet")?.classList.remove("open");

  const sheet = document.getElementById("ingredientEditSheet");
  const overlay = document.getElementById("sheetOverlay");

  document.getElementById("ingredientName").value = ingredient.food_name || "";
  document.getElementById("ingredientQuantity").value = ingredient.quantity || 1;
  document.getElementById("ingredientCalories").value = ingredient.base_calories || 0;
  document.getElementById("ingredientProtein").value = ingredient.base_protein || 0;
  document.getElementById("ingredientCarbs").value = ingredient.base_carbs || 0;
  document.getElementById("ingredientFat").value = ingredient.base_fat || 0;

  sheet.dataset.id = ingredient.id;

  sheet.classList.add("open");
  overlay.classList.add("open");
}


/* ===========================
   DOM READY
=========================== */

document.addEventListener("DOMContentLoaded", () => {

  const prevBtn = document.getElementById("prevWeekBtn");
  const nextBtn = document.getElementById("nextWeekBtn");
  const overlay = document.getElementById("sheetOverlay");

  /* Close Meal Detail */
  const closeDetail = document.getElementById("closeMealDetail");
  if (closeDetail) {
    closeDetail.addEventListener("click", () => {
      document.getElementById("mealDetailSheet")?.classList.remove("open");
      overlay?.classList.remove("open");
    });
  }

  /* Save Ingredient */
  const saveIngredientBtn = document.getElementById("saveIngredientBtn");

if (saveIngredientBtn) {
  saveIngredientBtn.addEventListener("click", async () => {

    const sheet = document.getElementById("ingredientEditSheet");
    const ingredientId = sheet?.dataset.id;
    const mealId = sheet?.dataset.mealId;

    const name = document.getElementById("ingredientName").value;
    const quantity = parseFloat(document.getElementById("ingredientQuantity").value) || 1;

    const baseCalories = parseFloat(document.getElementById("ingredientCalories").value) || 0;
    const baseProtein = parseFloat(document.getElementById("ingredientProtein").value) || 0;
    const baseCarbs = parseFloat(document.getElementById("ingredientCarbs").value) || 0;
    const baseFat = parseFloat(document.getElementById("ingredientFat").value) || 0;

    const payload = {
      food_name: name,
      quantity,
      base_calories: baseCalories,
      base_protein: baseProtein,
      base_carbs: baseCarbs,
      base_fat: baseFat,
      calories: baseCalories * quantity,
      protein: baseProtein * quantity,
      carbs: baseCarbs * quantity,
      fat: baseFat * quantity
    };

    if (ingredientId) {
      // UPDATE
      await supabase
        .from("meal_items")
        .update(payload)
        .eq("id", ingredientId);
    } else {
      // INSERT
      await supabase
        .from("meal_items")
        .insert([{ ...payload, meal_id: mealId }]);
    }

    // Close edit sheet
    document.getElementById("ingredientEditSheet")?.classList.remove("open");

    // Reopen meal detail
    const { data: items } = await supabase
      .from("meal_items")
      .select("*")
      .eq("meal_id", mealId);

    openMealDetailSheet(items || [], mealId);

    await loadDashboard(getSelectedDate());
  });
}

  /* Cancel Ingredient */
  const cancelIngredientBtn = document.getElementById("cancelIngredientBtn");
  if (cancelIngredientBtn) {
    cancelIngredientBtn.addEventListener("click", () => {
      document.getElementById("ingredientEditSheet")?.classList.remove("open");
      overlay?.classList.remove("open");
    });
  }

  /* Overlay click closes everything */
  if (overlay) {
    overlay.addEventListener("click", () => {
      document.getElementById("mealDetailSheet")?.classList.remove("open");
      document.getElementById("ingredientEditSheet")?.classList.remove("open");
      overlay.classList.remove("open");
    });
  }

  if (prevBtn) prevBtn.addEventListener("click", () => shiftWeek(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => shiftWeek(1));


const addIngredientBtn = document.getElementById("addIngredientBtn");

if (addIngredientBtn) {
  addIngredientBtn.addEventListener("click", () => {

    const mealSheet = document.getElementById("mealDetailSheet");
    const mealId = mealSheet.dataset.mealId;

    if (!mealId) return;

    const editSheet = document.getElementById("ingredientEditSheet");

    editSheet.dataset.id = ""; // no ingredient id
    editSheet.dataset.mealId = mealId; // store meal id

    // Clear fields
    document.getElementById("ingredientName").value = "";
    document.getElementById("ingredientQuantity").value = 1;
    document.getElementById("ingredientCalories").value = 0;
    document.getElementById("ingredientProtein").value = 0;
    document.getElementById("ingredientCarbs").value = 0;
    document.getElementById("ingredientFat").value = 0;

    // Close meal detail first
document.getElementById("mealDetailSheet")?.classList.remove("open");

// Then open edit
editSheet.classList.add("open");
  });
}


});