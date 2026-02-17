const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";


// ================= LOGIN =================
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  status.innerText = "Logging in...";

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      status.innerText = "Login success";
      window.location.href = "/dashboard.html";
    } else {
      status.innerText = data.error_description || "Login failed";
    }

  } catch (err) {
    status.innerText = "Network error";
    console.error(err);
  }
}



// ================= KEEP SESSION =================
function requireLogin() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
  }
}



// ================= CAMERA =================
function openCamera() {
  document.getElementById("cameraInput").click();
}


// runs when user takes picture
document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("cameraInput");
  if (!input) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Image captured:", file);

    // preview image so we KNOW camera works
    let preview = document.getElementById("preview");
    if (!preview) {
      preview = document.createElement("img");
      preview.id = "preview";
      preview.style.width = "200px";
      preview.style.marginTop = "20px";
      document.body.appendChild(preview);
    }

    preview.src = URL.createObjectURL(file);

    // next step will be AI analysis
  });

});
