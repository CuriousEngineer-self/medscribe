// ============ APP STATE ============
const AppState = {
  doctorId: null,
  doctorProfile: null,
  schemas: [],
  currentPatientId: null,
  trendChart: null,
};

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function nl2brEscaped(value) {
  return escapeHTML(value).replace(/\n/g, "<br>");
}

// ============ INIT ============
document.addEventListener("DOMContentLoaded", async () => {
  // Check for reset token in URL
  if (window.location.pathname === "/reset-password.html") return;

  const token = API.token;
  if (token) {
    try {
      await initApp();
    } catch {
      API.setToken(null);
      showPage("page-login");
    }
  } else {
    showPage("page-login");
  }
});

async function initApp() {
  showPage("page-app");
  await loadProfile();
  await loadSchemas();
  await showView("dashboard");
}

// ============ PAGES ============
function showPage(id) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ============ AUTH ============
async function login() {
  const email = document.getElementById("login-email").value.trim();
  const pw = document.getElementById("login-password").value;
  const err = document.getElementById("login-error");
  err.textContent = "";
  try {
    const data = await API.post("/api/auth/login", { email, password: pw });
    API.setToken(data.token);
    AppState.doctorId = data.doctorId;
    await initApp();
  } catch (e) {
    err.textContent = e.message;
  }
}

async function register() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pw = document.getElementById("reg-password").value;
  const err = document.getElementById("reg-error");
  err.textContent = "";
  if (!email || !pw) {
    err.textContent = "All fields required";
    return;
  }
  if (pw.length < 8) {
    err.textContent = "Password must be at least 8 characters";
    return;
  }
  try {
    const data = await API.post("/api/auth/register", {
      email,
      password: pw,
      name,
    });
    API.setToken(data.token);
    AppState.doctorId = data.doctorId;
    await initApp();
    showView("profile");
  } catch (e) {
    err.textContent = e.message;
  }
}

async function forgotPassword() {
  const email = document.getElementById("forgot-email").value.trim();
  const err = document.getElementById("forgot-error");
  const suc = document.getElementById("forgot-success");
  err.textContent = "";
  suc.textContent = "";
  try {
    const data = await API.post("/api/auth/forgot-password", { email });
    suc.textContent = data.message;
    if (data.devLink) {
      suc.innerHTML += `<br><small style="color:#0d6e6e">Dev link: <a href="${data.devLink}" target="_blank">Reset Password</a></small>`;
    }
  } catch (e) {
    err.textContent = e.message;
  }
}

function logout() {
  API.setToken(null);
  AppState.doctorId = null;
  AppState.doctorProfile = null;
  showPage("page-login");
  showLogin();
}

function showLogin() {
  document.getElementById("login-form").style.display = "";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("forgot-form").style.display = "none";
}
function showRegister() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "";
  document.getElementById("forgot-form").style.display = "none";
}
function showForgot() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("forgot-form").style.display = "";
}

// Enter key on login
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const lf = document.getElementById("login-form");
    if (
      lf &&
      lf.style.display !== "none" &&
      document.getElementById("page-login").classList.contains("active")
    ) {
      login();
    }
  }
});

// ============ VIEWS ============
async function showView(name) {
  document.querySelectorAll(".view").forEach((v) => (v.style.display = "none"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

  const view = document.getElementById("view-" + name);
  if (view) {
    view.style.display = "";
  }

  const navItem = document.querySelector(`[data-view="${name}"]`);
  if (navItem) navItem.classList.add("active");

  switch (name) {
    case "dashboard":
      await loadDashboard();
      break;
    case "patients":
      await loadPatients();
      break;
    case "visits":
      await loadAllVisits();
      break;
    case "profile":
      await loadProfilePage();
      break;
  }
}

// ============ PROFILE ============
async function loadProfile() {
  try {
    AppState.doctorProfile = await API.get("/api/doctor/profile");
    const p = AppState.doctorProfile;
    const badge = document.getElementById("doctor-badge");
    if (badge)
      badge.innerHTML = `<strong>${p.name || p.email}</strong><br>${p.specialization || "Doctor"}`;
  } catch {}
}

async function loadSchemas() {
  try {
    AppState.schemas = await API.get("/api/doctor/schemas");
  } catch {}
}

async function loadProfilePage() {
  await loadProfile();
  const p = AppState.doctorProfile || {};
  document.getElementById("prof-name").value = p.name || "";
  document.getElementById("prof-qualifications").value = p.qualifications || "";
  document.getElementById("prof-specialization").value = p.specialization || "";
  document.getElementById("prof-license").value = p.license_number || "";
  document.getElementById("prof-hospital").value = p.hospital_name || "";
  document.getElementById("prof-address").value = p.hospital_address || "";
  document.getElementById("prof-emergency").value = p.emergency_contact || "";
  document.getElementById("prof-phone").value = p.phone || "";
  document.getElementById("prof-signature").value = p.signature_note || "";
  switchTab("profile");
  renderSchemas();
  renderLetterheadPreview();
}

async function saveProfile() {
  const err = document.getElementById("profile-error");
  const suc = document.getElementById("profile-success");
  err.textContent = "";
  suc.textContent = "";
  const data = {
    name: document.getElementById("prof-name").value,
    qualifications: document.getElementById("prof-qualifications").value,
    specialization: document.getElementById("prof-specialization").value,
    license_number: document.getElementById("prof-license").value,
    hospital_name: document.getElementById("prof-hospital").value,
    hospital_address: document.getElementById("prof-address").value,
    emergency_contact: document.getElementById("prof-emergency").value,
    phone: document.getElementById("prof-phone").value,
    signature_note: document.getElementById("prof-signature").value,
  };
  try {
    await API.put("/api/doctor/profile", data);
    suc.textContent = "Profile saved successfully!";
    await loadProfile();
    renderLetterheadPreview();
    setTimeout(() => (suc.textContent = ""), 3000);
  } catch (e) {
    err.textContent = e.message;
  }
}

function switchTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => (t.style.display = "none"));
  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("tab-content-" + name).style.display = "";
  if (name === "preview") renderLetterheadPreview();
  if (name === "schemas") renderSchemas();
}

function renderLetterheadPreview() {
  const p = AppState.doctorProfile || {};
  const box = document.getElementById("letterhead-preview-box");
  if (!box) return;
  box.innerHTML = buildLetterheadHTML(p);
}

function buildLetterheadHTML(p) {
  return `
    <div class="lh-top">
      <div>
        <div class="lh-name">${p.name || "Dr. Your Name"}</div>
        <div class="lh-quals">${p.qualifications || "Qualifications"}</div>
        <div class="lh-spec">${p.specialization || "Specialization"}</div>
      </div>
      <div class="lh-right">
        <div>${p.hospital_name || "Hospital / Clinic Name"}</div>
        <div>${(p.hospital_address || "Hospital Address").replace(/\n/g, "<br>")}</div>
        <div>📞 ${p.phone || "Phone"}</div>
        <div>🚨 Emergency: ${p.emergency_contact || "Emergency Contact"}</div>
        <div class="lh-license">Reg. No: ${p.license_number || "License Number"}</div>
      </div>
    </div>
    <div style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:#9999b0;text-align:center;font-style:italic">${p.signature_note || ""}</div>
  `;
}

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    const patients = await API.get("/api/patients");
    const visits = await API.get("/api/visits/patient/all").catch(() => []);

    const p = AppState.doctorProfile || {};
    const hour = new Date().getHours();
    const greet =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    document.getElementById("dash-greeting").textContent =
      `${greet}, ${p.name ? p.name.replace(/^Dr\.\s*/i, "") : "Doctor"}`;

    // Stats
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("stats-grid").innerHTML = `
      <div class="stat-card"><div class="stat-num">${patients.length}</div><div class="stat-label">Total Patients</div></div>
      <div class="stat-card"><div class="stat-num">${AppState.schemas.length}</div><div class="stat-label">Parameters</div></div>
    `;

    // Recent patients
    const recent = [...patients].slice(0, 8);
    document.getElementById("recent-patients-list").innerHTML = recent.length
      ? recent
          .map(
            (pt) => `
        <div class="recent-item" onclick="openPatientDetail(${pt.id})">
          <div class="patient-avatar">${initials(pt.first_name, pt.last_name)}</div>
          <div>
            <div class="ri-name">${pt.first_name} ${pt.last_name}</div>
            <div class="ri-sub">${calcAge(pt.date_of_birth)} yrs · ${pt.phone}</div>
          </div>
          ${pt.drug_allergies ? '<span class="allergy-badge">⚠ Allergies</span>' : ""}
        </div>`,
          )
          .join("")
      : '<div class="empty-state"><p>No patients yet. Add your first patient!</p></div>';
  } catch (e) {
    console.error(e);
  }
}

// ============ HELPERS ============
function initials(fn, ln) {
  return ((fn || "").charAt(0) + (ln || "").charAt(0)).toUpperCase();
}

function calcAge(dob) {
  if (!dob) return "?";
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function calcBMI(h, w) {
  if (!h || !w) return null;
  const bmi = w / (h / 100) ** 2;
  return bmi.toFixed(1);
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    setTimeout(() => (el.textContent = ""), 3000);
  }
}

// ============ MODAL ============
function openModal(title, bodyHTML, large) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  document.getElementById("modal-box").style.maxWidth = large
    ? "840px"
    : "640px";
  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal(e) {
  if (!e || e.target === document.getElementById("modal-overlay")) {
    document.getElementById("modal-overlay").classList.remove("open");
  }
}
