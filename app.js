import { saveMeal } from "./js/api.js";
import { loadDashboard, startDailyTimer } from "./js/dashboard.js";

document.addEventListener("DOMContentLoaded", () => {

  const sheet = document.getElementById("mealSheet");
  const overlay = document.getElementById("sheetOverlay");
  const openBtn = document.getElementById("newEntryBtn");
  const cancelBtn = document.getElementById("cancelMeal");
  const saveBtn = document.getElementById("saveMealBtn");

  function openSheet() {
    sheet.classList.add("active");
    overlay.classList.add("active");
  }

  function closeSheet() {
    sheet.classList.remove("active");
    overlay.classList.remove("active");
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

    await saveMeal({ food_name, calories, protein, carbs, fat });

    closeSheet();
    loadDashboard();

    document.getElementById("mealName").value = "";
    document.getElementById("mealCalories").value = "";
    document.getElementById("mealProtein").value = "";
    document.getElementById("mealCarbs").value = "";
    document.getElementById("mealFat").value = "";

    saveBtn.dataset.loading = "false";
  });

  loadDashboard();
  startDailyTimer();
});