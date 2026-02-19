function nextStep(step){
  document.querySelectorAll(".step").forEach(s => s.style.display="none");
  document.getElementById("step-" + step).style.display = "block";

  if(step === 2){
    toggleWeightLossOptions();
  }
}

function toggleWeightLossOptions(){
  const goal = document.getElementById("goal").value;
  const box = document.getElementById("weightloss_box");
  box.style.display = goal === "weight_loss" ? "block" : "none";
}

async function finishOnboarding(){
  const token = localStorage.getItem("token");
  if(!token) return;

  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const age = parseInt(document.getElementById("age").value);
  const sex = document.getElementById("sex").value;

  const heightInput = document.getElementById("height").value.split("'");
  const heightFt = parseInt(heightInput[0]);
  const heightIn = parseInt(heightInput[1]);
  const height_cm = heightFt*30.48 + heightIn*2.54;

  const weight_lb = parseFloat(document.getElementById("weight").value);
  const weight_kg = weight_lb * 0.453592;

  const goal = document.getElementById("goal").value;
  const weight_loss_speed = document.getElementById("weightLossSpeed")?.value || null;

  const profile = {
    first_name: firstName,
    last_name: lastName,
    age: age,
    sex: sex,
    height_cm: height_cm,
    weight_kg: weight_kg,
    goal: goal,
    weight_loss_speed: weight_loss_speed
  };

  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile)
  });

  window.location.href = "/dashboard.html";
}


window.nextStep = nextStep;
window.finishOnboarding = finishOnboarding;
