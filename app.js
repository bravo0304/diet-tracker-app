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

  window.currentEditingMealId = null;

  const saveBtn = document.getElementById("saveMealBtn");
  if (saveBtn) saveBtn.innerText = "Save";

  const nameInput = document.getElementById("mealName");
  if (nameInput) nameInput.value = "";
}

  openBtn?.addEventListener("click", openSheet);
  cancelBtn?.addEventListener("click", closeSheet);
  overlay?.addEventListener("click", closeSheet);

  
  saveBtn?.addEventListener("click", async () => {

  if (saveBtn.dataset.loading === "true") return;
  saveBtn.dataset.loading = "true";

 const food_name = document.getElementById("mealName").value.trim();

  if (!food_name) {
  alert("Meal name required.");
  saveBtn.dataset.loading = "false";
  return;
}

  if (window.currentEditingMealId) {

    // 🔹 UPDATE MODE
    await updateMeal(window.currentEditingMealId, {
  food_name
});

  } else {

    // 🔹 CREATE MODE
    const selectedDateObj = getSelectedDate();
    const dateString = selectedDateObj.toISOString().split("T")[0];

    await saveMeal(
      { food_name },
      dateString
    );
  }

  // Reset editing state
  window.currentEditingMealId = null;
  saveBtn.innerText = "Save";

  closeSheet();
  await loadDashboard();

  document.getElementById("mealName").value = "";

  saveBtn.dataset.loading = "false";
});


  renderWeekStrip();
  loadDashboard();
});
