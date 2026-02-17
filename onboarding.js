const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";


// ---------- helpers ----------
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = atob(base64Url);
  return JSON.parse(base64);
}

function lbToKg(lb){
  return (lb * 0.453592);
}

function ftInToCm(ft, inch){
  return Math.round((ft * 30.48) + (inch * 2.54));
}


// ---------- main ----------
async function finishOnboarding(){

  const token = localStorage.getItem("token");
  if(!token){
    window.location.href = "/";
    return;
  }

  const user = parseJwt(token);
  const user_id = user.sub;

  // form values
  const name   = document.getElementById("name").value;
  const goal   = document.getElementById("goal").value;
  const sex    = document.getElementById("sex").value;
  const age    = parseInt(document.getElementById("age").value);

  const feet   = parseFloat(document.getElementById("feet").value);
  const inches = parseFloat(document.getElementById("inches").value);
  const pounds = parseFloat(document.getElementById("weight_lb").value);

  // convert units
  const height_cm = ftInToCm(feet, inches);
  const weight_kg = lbToKg(pounds);

  // save profile
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      id: user_id,
      name: name,
      goal: goal,
      sex: sex,
      age: age,
      height_cm: height_cm,
      weight_kg: weight_kg
    })
  });

  if(res.ok){
    window.location.href = "/dashboard.html";
  }else{
    alert("Failed saving profile");
  }
}
