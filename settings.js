// ---------- LOAD SAVED SETTINGS ----------
document.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("userSettings")) || {};

  if(saved.units) document.getElementById("unitSelect").value = saved.units;
  document.getElementById("deficitToggle").checked = saved.weightLossDeficit ?? true;
  document.getElementById("surplusToggle").checked = saved.muscleGainSurplus ?? true;
  document.getElementById("expertToggle").checked = saved.expertMacroOverride ?? false;
});

// ---------- SAVE SETTINGS ----------
const form = document.getElementById("settingsForm");
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const settings = {
    units: document.getElementById("unitSelect").value,
    weightLossDeficit: document.getElementById("deficitToggle").checked,
    muscleGainSurplus: document.getElementById("surplusToggle").checked,
    expertMacroOverride: document.getElementById("expertToggle").checked
  };

  localStorage.setItem("userSettings", JSON.stringify(settings));
  alert("Settings saved!");
});
