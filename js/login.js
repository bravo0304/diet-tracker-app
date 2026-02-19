import { supabase } from "./auth.js";

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  status.innerText = "Logging in...";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    status.innerText = error.message;
    return;
  }

  window.location.href = "/dashboard.html";
}

async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  status.innerText = "Creating account...";

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    status.innerText = error.message;
    return;
  }

  status.innerText = "Check your email to confirm signup.";
}

window.login = login;
window.signup = signup;
