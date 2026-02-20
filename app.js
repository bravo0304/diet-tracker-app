import { saveMeal, updateMeal } from "./js/api.js";
import { loadDashboard, renderWeekStrip, getSelectedDate } from "./js/dashboard.js";

document.addEventListener("DOMContentLoaded", () => {

  const sheet = document.getElementById("mealSheet");
  const overlay = document.getElementById("sheetOverlay");
  const openBtn = document.getElementById("newEntryBtn");
  const cancelBtn = document.getElementById("cancelMeal");
  const saveBtn = document.getElementById("saveMealBtn");

window.currentEditingMealId = null;


  function openSheet() {
    sheet.classList.add("open");
    overlay.classList.add("open");
  }

  function closeSheet() {
  sheet.classList.remove("open");
  overlay.classList.remove("open");

  // 🔹 Reset edit state
  window.currentEditingMealId = null;

  const saveBtn = document.getElementById("saveMealBtn");
  if (saveBtn) saveBtn.innerText = "Save";

  // Optional: clear inputs when closing manually
  document.getElementById("mealName").value = "";
  document.getElementById("mealCalories").value = "";
  document.getElementById("mealProtein").value = "";
  document.getElementById("mealCarbs").value = "";
  document.getElementById("mealFat").value = "";
}

  openBtn?.addEventListener("click", openSheet);
  cancelBtn?.addEventListener("click", closeSheet);
  overlay?.addEventListener("click", closeSheet);

  
  saveBtn?.addEventListener("click", async () => {

  if (saveBtn.dataset.loading === "true") return;
  saveBtn.dataset.loading = "true";

  const food_name = document.getElementById("mealName").value.trim();
  const calories = parseInt(document.getElementById("mealCalories").value, 10);
  const protein = parseInt(document.getElementById("mealProtein").value, 10) || 0;
  const carbs = parseInt(document.getElementById("mealCarbs").value, 10) || 0;
  const fat = parseInt(document.getElementById("mealFat").value, 10) || 0;

  if (!food_name || isNaN(calories)) {
    alert("Invalid input.");
    saveBtn.dataset.loading = "false";
    return;
  }

  if (window.currentEditingMealId) {

    // 🔹 UPDATE MODE
    await updateMeal(window.currentEditingMealId, {
      food_name,
      calories,
      protein,
      carbs,
      fat
    });

  } else {

    // 🔹 CREATE MODE
    const selectedDateObj = getSelectedDate();
    const dateString = selectedDateObj.toISOString().split("T")[0];

    await saveMeal(
      { food_name, calories, protein, carbs, fat },
      dateString
    );
  }

  // Reset editing state
  window.currentEditingMealId = null;
  saveBtn.innerText = "Save";

  closeSheet();
  await loadDashboard();

  document.getElementById("mealName").value = "";
  document.getElementById("mealCalories").value = "";
  document.getElementById("mealProtein").value = "";
  document.getElementById("mealCarbs").value = "";
  document.getElementById("mealFat").value = "";

  saveBtn.dataset.loading = "false";
});


  renderWeekStrip();
  loadDashboard();
});
