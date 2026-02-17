// Get references
const form = document.getElementById("settingsForm");
const unitSelect = document.getElementById("unitSelect");
const deficitToggle = document.getElementById("deficitToggle");
const surplusToggle = document.getElementById("surplusToggle");
const expertToggle = document.getElementById("expertToggle");

// Load saved settings (from localStorage)
document.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("userSettings")) || {};
  
  if(saved.units) unitSelect.value = saved.units;
  deficitToggle.checked = saved.weightLossDeficit ?? true;
  surplusToggle.checked = saved.muscleGainSurplus ?? true;
  expertToggle.checked = saved.expertMacroOverride ?? false;
});

// Save settings on submit
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const settings = {
    units: unitSelect.value,
    weightLossDeficit: deficitToggle.checked,
    muscleGainSurplus: surplusToggle.checked,
    expertMacroOverride: expertToggle.checked
  };

  localStorage.setItem("userSettings", JSON.stringify(settings));
  alert("Settings saved!");
});
