document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("settingsForm");
  const unitSelect = document.getElementById("unitSelect");
  const deficitToggle = document.getElementById("deficitToggle");
  const surplusToggle = document.getElementById("surplusToggle");
  const expertToggle = document.getElementById("expertToggle");

  // ---------- LOAD SAVED SETTINGS ----------
  const saved = JSON.parse(localStorage.getItem("userSettings")) || {};

  if (saved.units) unitSelect.value = saved.units;

  deficitToggle.checked = saved.weightLossDeficit ?? true;
  surplusToggle.checked = saved.muscleGainSurplus ?? true;
  expertToggle.checked = saved.expertMacroOverride ?? false;

  // ---------- SAVE SETTINGS ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const settings = {
      units: unitSelect.value,
      weightLossDeficit: deficitToggle.checked,
      muscleGainSurplus: surplusToggle.checked,
      expertMacroOverride: expertToggle.checked
    };

    localStorage.setItem("userSettings", JSON.stringify(settings));

    const btn = form.querySelector("button[type='submit']");
    const originalText = btn.innerText;

    btn.innerText = "Saved ✓";
    btn.disabled = true;

    setTimeout(() => {
      btn.innerText = originalText;
      btn.disabled = false;
    }, 1500);
  });

});
