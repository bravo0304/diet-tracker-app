const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

// ---------- helpers ----------
function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = atob(base64Url);
  return JSON.parse(base64);
}

function lbToKg(lb) {
  return lb * 0.453592;
}

function ftInToCm(ft, inch) {
  return Math.round(ft * 30.48 + inch * 2.54);
}

// ---------- main ----------
async function finishOnboarding() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  const user = parseJwt(token);
  const user_id = user.sub;

  // form values
  const first_name = document.getElementById("first_name").value.trim();
  const last_name  = document.getElementById("last_name").value.trim();
  const goal = document.getElementById("goal").value;
  const sex  = document.getElementById("sex").value;

  const age    = parseInt(document.getElementById("age").value, 10);
  const feet   = parseFloat(document.getElementById("feet").value);
  const inches = parseFloat(document.getElementById("inches").value);
  const pounds = parseFloat(document.getElementById("weight_lb").value);

  // basic validation
  if (!first_name) return alert("Please enter your first name.");
  if (!last_name)  return alert("Please enter your last name.");
  if (!age || age < 5 || age > 120) return alert("Please enter a valid age.");
  if (!feet || feet < 3 || feet > 8) return alert("Please enter a valid height (feet).");
  if (inches < 0 || inches > 11) return alert("Inches must be 0–11.");
  if (!pounds || pounds < 50 || pounds > 800) return alert("Please enter a valid weight (lb).");

  // convert units
  const height_cm = ftInToCm(feet, inches);
  const weight_kg = lbToKg(pounds);

  // Upsert profile (insert if new, update if exists)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      id: user_id,
      first_name,
      last_name,
      goal,
      sex,
      age,
      height_cm,
      weight_kg
    })
  });

  if (res.ok) {
    window.location.href = "/dashboard.html";
  } else {
    const text = await res.text();
    console.error("Profile save failed:", text);
    alert("Failed saving profile. Check console.");
  }
}
