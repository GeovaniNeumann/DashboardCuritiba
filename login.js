// js/login.js

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin123";

// Simulação de "usuários cadastrados"
let registeredUsers = JSON.parse(localStorage.getItem("registeredUsers")) || [];

// Função para criar JWT fake (simples e segura o suficiente para ambiente front-end)
function generateJWT(email, role) {
  const payload = {
    email,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 4 // expira em 4h
  };
  return btoa(JSON.stringify(payload));
}

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // ADMIN
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = generateJWT(email, "admin");
    localStorage.setItem("jwt", token);
    window.location.href = "dashboard.html";
    return;
  }

  // USUÁRIOS COMUNS CADASTRADOS
  const user = registeredUsers.find(u => u.email === email && u.password === password);
  if (user) {
    const token = generateJWT(email, "user");
    localStorage.setItem("jwt", token);
    window.location.href = "dashboard.html";
    return;
  }

  alert("❌ E-mail ou senha inválidos!");
});
