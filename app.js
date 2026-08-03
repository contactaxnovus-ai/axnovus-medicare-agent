const config = window.TRIAGE_APP_CONFIG;
const authConfig = window.AUTH_CONFIG || {
  localUserStorageKey: "axnovus-care-users-v1",
  sessionStorageKey: "axnovus-care-session-v1",
  verificationEndpoint: "/api/send-verification",
  passwordResetEndpoint: "/api/send-password-reset",
  users: [],
  roles: {
    customer: { label: "Customer", landing: "members" },
    receptionist: { label: "Hospital Receptionist", landing: "receptionPatients" },
    doctor: { label: "Doctor", landing: "doctor" },
  },
};
const engine = window.createTriageEngine(config, {
  getLlmEndpoint: () => $("#llmEndpoint").value.trim() || config.llm.endpoint,
  getModel: () => $("#modelSelect").value || config.llm.defaultModel,
  onStatus: setAgentStatus,
});
const caseStore = window.createCaseStore(config.feedback.storageKey, {
  minimumApprovedCases: config.feedback.minimumApprovedCasesForLocalUse,
});
const careStore = window.createCareDataStore();
const reportService = window.createReportService();
const appointmentService = window.createAppointmentService(window.HOSPITAL_CONFIG);
const medicineService = window.createMedicineService(window.MEDICINE_CONFIG);

const state = {
  extracted: [],
  results: [],
  urgent: [],
  reports: [],
  provider: "rules",
  model: config.llm.defaultModel,
  outputLanguage: { code: "en", label: "English", speechRecognitionLanguage: "en-IN", googleLanguageCode: "en" },
  followupQuestions: [],
  followupAnswers: [],
  triagePhase: "idle",
  lastRefinedAnswers: [],
  hasRun: false,
  lastContext: null,
  currentCaseId: null,
  selectedDoctorCaseId: null,
  lastDoctorResults: [],
  doctorFilters: {
    specialty: "",
    city: "",
    hospital: "",
    radiusKm: 0,
  },
  doctorSearchCount: 0,
  workspace: "patient",
  isLoggedIn: false,
  currentUser: null,
  activePatientStage: "members",
  activeReceptionPanel: "receptionPatients",
  activeDoctorPanel: "doctor",
  selectedPersonId: "",
  selectedReceptionPatientId: "",
  selectedReportIds: [],
  pendingSignup: null,
  unlockedStages: ["members", "reports", "intake", "medicineSearch"],
};

const $ = (selector) => document.querySelector(selector);

const hindiRomanTokens = new Set([
  "bukhar",
  "khansi",
  "saans",
  "dard",
  "sir",
  "gala",
  "ulti",
  "chakkar",
  "pet",
  "pait",
  "kamjori",
  "badan",
  "daane",
  "jalna",
  "sujan",
  "kabz",
  "dast",
  "seene",
  "chhati",
  "peshab",
]);

function detectCareLanguage(text) {
  const value = String(text || "");
  const devanagariCount = (value.match(/[\u0900-\u097F]/g) || []).length;
  const latinWords = value.toLowerCase().match(/[a-z]+/g) || [];
  const romanHindiCount = latinWords.filter((word) => hindiRomanTokens.has(word)).length;
  const englishClinicalCount = latinWords.filter((word) =>
    ["fever", "cough", "pain", "headache", "cold", "vomit", "loose", "motion", "breathing", "rash", "chest"].includes(word)
  ).length;
  const hindiScore = devanagariCount * 2 + romanHindiCount;
  const englishScore = englishClinicalCount + Math.max(0, latinWords.length - romanHindiCount) * 0.25;
  const code = hindiScore > englishScore ? "hi" : "en";
  return code === "hi"
    ? { code: "hi", label: "Hindi", speechRecognitionLanguage: "hi-IN", googleLanguageCode: "hi" }
    : { code: "en", label: "English", speechRecognitionLanguage: "en-IN", googleLanguageCode: "en" };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTriageConfigHints() {
  return {
    task: config.llm.task,
    safetyInstruction: config.llm.safetyInstruction,
    models: config.llm.models,
    knownSignals: config.signals,
    configuredConditions: (config.items || []).slice(0, 80).map((item) => ({
      name: item.name,
      specialty: item.specialty || item.route,
      match: item.match || [],
      questions: item.questions || [],
      nextStep: item.nextStep || "",
    })),
    urgencyRules: config.urgencyRules || [],
  };
}

function getPatientContext(refinementMode = "initial") {
  const symptoms = $("#symptomInput").value.trim();
  const outputLanguage = detectCareLanguage(`${symptoms} ${state.followupAnswers.map((item) => item.answer).join(" ")}`);
  return {
    personId: state.selectedPersonId,
    createdByRole: state.workspace,
    symptoms,
    followupAnswers: state.followupAnswers,
    refinementMode,
    age: Number($("#ageInput").value || 0),
    sex: $("#sexInput").value,
    location: $("#locationInput").value.trim(),
    languageHints: config.languageHints,
    outputLanguage,
    model: $("#modelSelect").value || config.llm.defaultModel,
    reports: getSelectedReportsForCase(),
    configHints: getTriageConfigHints(),
  };
}

function setAgentStatus(message, tone = "info") {
  const status = $("#agentStatus");
  if (!status) return;
  status.textContent = message;
  status.className = `agent-status ${tone === "info" ? "" : tone}`.trim();
}

function showBookingToast(message) {
  const toast = $("#bookingToast");
  if (!toast) {
    window.alert(message);
    return;
  }
  toast.innerHTML = `
    <strong>Appointment booked</strong>
    <span>${escapeHtml(message)}</span>
  `;
  toast.classList.remove("is-hidden");
  window.clearTimeout(showBookingToast.timer);
  showBookingToast.timer = window.setTimeout(() => toast.classList.add("is-hidden"), 5200);
}

function readLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(authConfig.localUserStorageKey || "axnovus-care-users-v1") || "[]");
  } catch (error) {
    console.warn("Could not read local users:", error);
    return [];
  }
}

function writeLocalUsers(users) {
  localStorage.setItem(authConfig.localUserStorageKey || "axnovus-care-users-v1", JSON.stringify(users));
}

function getAllUsers() {
  const localUsers = readLocalUsers();
  const localKeys = new Set(localUsers.flatMap((user) => [user.id, user.email].filter(Boolean).map((value) => value.toLowerCase())));
  const seededUsers = authConfig.users.filter((user) => ![user.id, user.email].filter(Boolean).some((value) => localKeys.has(value.toLowerCase())));
  return [...localUsers, ...seededUsers];
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(authConfig.sessionStorageKey || "axnovus-care-session-v1") || "null");
  } catch (error) {
    console.warn("Could not read session:", error);
    return null;
  }
}

function writeSession(user) {
  localStorage.setItem(
    authConfig.sessionStorageKey || "axnovus-care-session-v1",
    JSON.stringify({ userId: user.id, email: user.email, signedInAt: new Date().toISOString() })
  );
}

function clearSession() {
  localStorage.removeItem(authConfig.sessionStorageKey || "axnovus-care-session-v1");
}

function passwordMeetsPolicy(password) {
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password) && password.length >= 8;
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  if (window.crypto?.subtle?.digest) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return sha256Fallback(password);
}

function sha256Fallback(message) {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const maxWord = 2 ** 32;
  const words = [];
  const messageBytes = unescape(encodeURIComponent(message));
  const messageBitLength = messageBytes.length * 8;
  let hash = sha256Fallback.initialHash.slice();
  const k = sha256Fallback.k;

  let paddedMessage = `${messageBytes}\x80`;
  while ((paddedMessage.length % 64) - 56) paddedMessage += "\x00";

  for (let i = 0; i < paddedMessage.length; i += 1) {
    words[i >> 2] |= paddedMessage.charCodeAt(i) << (((3 - i) % 4) * 8);
  }
  words.push((messageBitLength / maxWord) | 0);
  words.push(messageBitLength);

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    hash = hash.slice(0, 8);

    for (let i = 0; i < 64; i += 1) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (let i = 0; i < 8; i += 1) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  let result = "";
  for (let i = 0; i < 8; i += 1) {
    for (let j = 3; j + 1; j -= 1) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? "0" : "") + byte.toString(16);
    }
  }
  return result;
}
sha256Fallback.initialHash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
sha256Fallback.k = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function generateTemporaryPassword() {
  const array = new Uint32Array(3);
  crypto.getRandomValues(array);
  return `Axn@${array[0].toString(36)}${array[1].toString(36)}${array[2].toString(36)}7`;
}

function roleLabel(role) {
  return authConfig.roles[role]?.label || role;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AX";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function setAccountMenu(open) {
  const menu = $("#accountMenu");
  const button = $("#accountMenuButton");
  if (!menu || !button) return;
  menu.classList.toggle("is-hidden", !open);
  button.setAttribute("aria-expanded", String(open));
}

function setWorkspace(workspace) {
  state.workspace = workspace;
  state.isLoggedIn = true;
  $("#loginScreen").classList.add("is-hidden");
  $("#appShell").classList.remove("is-hidden");
  document.body.classList.toggle("patient-mode", workspace === "customer");
  document.body.classList.toggle("receptionist-mode", workspace === "receptionist");
  document.body.classList.toggle("doctor-mode", workspace === "doctor");
  document.querySelector(".patient-care-path").classList.toggle("is-hidden", workspace !== "customer");
  document.querySelector(".receptionist-care-path").classList.toggle("is-hidden", workspace !== "receptionist");
  document.querySelector(".doctor-care-path").classList.toggle("is-hidden", workspace !== "doctor");
  const titles = {
    customer: ["Customer profile", "Manage patient care"],
    receptionist: ["Receptionist profile", "Patient registration and booking"],
    doctor: ["Doctor profile", "Appointments and treatment"],
  };
  $("#workspaceEyebrow").textContent = titles[workspace]?.[0] || "Workspace";
  $("#workspaceTitle").textContent = titles[workspace]?.[1] || "Care workspace";
  $("#sessionLabel").textContent = state.currentUser?.name || "Signed in";
  $("#sessionRoleLabel").textContent = state.currentUser ? roleLabel(state.currentUser.role) : "Workspace";
  $("#accountAvatar").textContent = getInitials(state.currentUser?.name);
  $("#riskBadge").style.display = workspace === "doctor" ? "none" : "";
  ensureDefaultMember();
  renderStepVisibility();
  showActiveRolePanel();
  renderFamilyMembers();
  renderPersonSelect();
  renderReports();
  renderIntakeReportSelect();
  renderReceptionPatients();
  if (workspace === "doctor") {
    renderDoctorQueue();
    renderPrescriptionList();
    renderMedicineOptions();
    renderDoctorHistory();
  }
}

function ensureDefaultMember() {
  if (state.currentUser?.role !== "customer") return;
  const data = careStore.read();
  const existing = data.members.find((member) => member.ownerUserId === state.currentUser.id && member.relation === "Self");
  if (existing) {
    if (!state.selectedPersonId) state.selectedPersonId = `member:${existing.id}`;
    return;
  }
  const member = careStore.upsertMember({
    ownerUserId: state.currentUser.id,
    name: state.currentUser.name,
    relation: "Self",
    age: config.defaultPatient.age,
    sex: config.defaultPatient.sex,
    location: state.currentUser.city || config.defaultPatient.location,
  });
  state.selectedPersonId = `member:${member.id}`;
}

function logout() {
  state.isLoggedIn = false;
  state.currentUser = null;
  clearSession();
  setAccountMenu(false);
  $("#appShell").classList.add("is-hidden");
  $("#loginScreen").classList.remove("is-hidden");
  document.body.classList.remove("patient-mode", "receptionist-mode", "doctor-mode");
  showSignup(false);
}

function showLoggedOutView() {
  state.isLoggedIn = false;
  state.currentUser = null;
  $("#appShell").classList.add("is-hidden");
  $("#loginScreen").classList.remove("is-hidden");
  document.body.classList.remove("patient-mode", "receptionist-mode", "doctor-mode");
  showSignup(false);
}

async function authenticate() {
  const id = $("#loginId").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  const passwordHash = await hashPassword(password);
  const user = getAllUsers().find((item) => {
    const loginMatches = [item.id, item.email].filter(Boolean).some((value) => value.toLowerCase() === id);
    return loginMatches && item.passwordHash === passwordHash && item.emailVerified;
  });
  if (!user) {
    $("#loginStatus").textContent = "Invalid login or email is not verified. Complete signup verification first.";
    $("#loginStatus").className = "agent-status warning";
    return;
  }
  state.currentUser = user;
  $("#loginStatus").textContent = "Signed in.";
  $("#loginStatus").className = "agent-status";
  writeSession(user);
  setWorkspace(user.role);
  if (user.role === "customer") showPatientStage(authConfig.roles.customer.landing);
  if (user.role === "receptionist") showReceptionPanel(authConfig.roles.receptionist.landing);
  if (user.role === "doctor") showDoctorPanel(authConfig.roles.doctor.landing);
  if (user.mustChangePassword) {
    showChangePassword(true, "Temporary password accepted. Change it before continuing.");
  }
}

function restoreSession() {
  const session = readSession();
  if (!session) return false;
  const user = getAllUsers().find((item) => item.email === session.email && item.id === session.userId && item.emailVerified);
  if (!user) {
    clearSession();
    return false;
  }
  state.currentUser = user;
  setWorkspace(user.role);
  if (user.role === "customer") showPatientStage(authConfig.roles.customer.landing);
  if (user.role === "receptionist") showReceptionPanel(authConfig.roles.receptionist.landing);
  if (user.role === "doctor") showDoctorPanel(authConfig.roles.doctor.landing);
  return true;
}

function showSignup(show) {
  $("#loginCard").classList.toggle("is-hidden", show);
  $("#signupCard").classList.toggle("is-hidden", !show);
  document.querySelector(".login-grid").classList.add("single-login");
  $("#loginStatus").textContent = show ? "Complete signup and email verification before signing in." : "Create an account and verify your email before signing in.";
  $("#loginStatus").className = "agent-status";
}

async function requestSignupVerification() {
  const name = $("#signupName").value.trim();
  const email = $("#signupEmail").value.trim().toLowerCase();
  const password = $("#signupPassword").value;
  const role = $("#signupRole").value;
  if (!name || !email || !password) {
    $("#signupStatus").textContent = "Name, email, and password are required.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    $("#signupStatus").textContent = "Enter a valid email address.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  if (!passwordMeetsPolicy(password)) {
    $("#signupStatus").textContent = "Use a stronger password: minimum 8 characters with uppercase, lowercase, number, and symbol.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  if (getAllUsers().some((user) => user.email?.toLowerCase() === email)) {
    $("#signupStatus").textContent = "This email already exists. Sign in with the same email.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  const prefix = role === "doctor" ? "DOC" : role === "receptionist" ? "REC" : "CUS";
  const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  const record = {
    id: `${prefix}-${Date.now().toString().slice(-6)}`,
    email,
    passwordHash: await hashPassword(password),
    role,
    name,
    phone: $("#signupPhone").value.trim(),
    city: $("#signupCity").value.trim(),
    hospital: $("#signupHospital").value.trim(),
    createdAt: new Date().toISOString(),
    passwordChangedAt: new Date().toISOString(),
  };
  state.pendingSignup = {
    record,
    verificationCode,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  $("#signupButton").disabled = true;
  $("#signupStatus").textContent = "Sending verification email...";
  $("#signupStatus").className = "agent-status";
  try {
    const response = await fetch(authConfig.verificationEndpoint || "/api/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, code: verificationCode }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Verification email could not be sent.");
    $("#verificationBox").classList.remove("is-hidden");
    $("#signupStatus").textContent = data.devMode
      ? `Local email fallback active. Verification code: ${verificationCode}`
      : "Verification email sent. Enter the code to activate this account.";
  } catch (error) {
    $("#signupStatus").textContent = `${error.message} Configure Gmail API or SMTP on the server, then try again.`;
    $("#signupStatus").className = "agent-status warning";
  } finally {
    $("#signupButton").disabled = false;
  }
}

function verifySignup() {
  if (!state.pendingSignup) {
    $("#signupStatus").textContent = "Send verification email first.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  if (Date.now() > state.pendingSignup.expiresAt) {
    $("#signupStatus").textContent = "Verification code expired. Send a new verification email.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  if ($("#verificationCodeInput").value.trim() !== state.pendingSignup.verificationCode) {
    $("#signupStatus").textContent = "Incorrect verification code.";
    $("#signupStatus").className = "agent-status warning";
    return;
  }
  const users = readLocalUsers();
  users.unshift({ ...state.pendingSignup.record, emailVerified: true, verifiedAt: new Date().toISOString() });
  writeLocalUsers(users);
  state.pendingSignup = null;
  $("#signupStatus").textContent = "Email verified. Account created. Use your email and password to sign in.";
  $("#signupStatus").className = "agent-status";
  $("#verificationBox").classList.add("is-hidden");
  $("#verificationCodeInput").value = "";
  $("#loginId").value = "";
  $("#loginPassword").value = "";
}

function goToSigninAfterVerification() {
  showSignup(false);
  $("#loginStatus").textContent = "Sign in with your verified email and password.";
  $("#loginStatus").className = "agent-status";
  $("#loginId").focus();
}

async function forgotPassword() {
  const email = $("#loginId").value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    $("#loginStatus").textContent = "Enter your verified email, then use Forgot password.";
    $("#loginStatus").className = "agent-status warning";
    return;
  }
  const allUsers = getAllUsers();
  const targetUser = allUsers.find((item) => item.email?.toLowerCase() === email && item.emailVerified);
  if (!targetUser) {
    $("#loginStatus").textContent = "No verified account found for this email.";
    $("#loginStatus").className = "agent-status warning";
    return;
  }
  const users = readLocalUsers();
  let userIndex = users.findIndex((item) => item.email?.toLowerCase() === email);
  if (userIndex < 0) {
    users.unshift({ ...targetUser, seeded: false });
    userIndex = 0;
  }
  const temporaryPassword = generateTemporaryPassword();
  $("#loginStatus").textContent = "Sending a temporary password to your email...";
  $("#loginStatus").className = "agent-status";
  try {
    const response = await fetch(authConfig.passwordResetEndpoint || "/api/send-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: targetUser.name, temporaryPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Temporary password email could not be sent.");
    users[userIndex] = {
      ...users[userIndex],
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      passwordResetAt: new Date().toISOString(),
    };
    writeLocalUsers(users);
    $("#loginPassword").value = "";
    $("#loginStatus").textContent = data.devMode
      ? `Local email fallback active. Temporary password: ${temporaryPassword}`
      : "Temporary password sent. Sign in with it and change your password.";
    $("#loginStatus").className = data.devMode ? "agent-status warning" : "agent-status";
  } catch (error) {
    $("#loginStatus").textContent = `${error.message} Configure Gmail API or SMTP on the server, then try again.`;
    $("#loginStatus").className = "agent-status warning";
  }
}

function showChangePassword(show, message = "Use a strong password that is not shared with any other service.") {
  const panel = $("#changePasswordPanel");
  if (!panel) return;
  panel.classList.toggle("is-hidden", !show);
  $("#changePasswordStatus").textContent = message;
  $("#changePasswordStatus").className = message.toLowerCase().includes("accepted") ? "agent-status warning" : "agent-status";
  if (show) $("#oldPasswordInput").focus();
}

async function changePassword() {
  if (!state.currentUser) return;
  const oldPassword = $("#oldPasswordInput").value;
  const newPassword = $("#newPasswordInput").value;
  const confirmPassword = $("#confirmPasswordInput").value;
  if (!oldPassword || !newPassword || !confirmPassword) {
    $("#changePasswordStatus").textContent = "Current password, new password, and confirmation are required.";
    $("#changePasswordStatus").className = "agent-status warning";
    return;
  }
  if ((await hashPassword(oldPassword)) !== state.currentUser.passwordHash) {
    $("#changePasswordStatus").textContent = "Current password is incorrect.";
    $("#changePasswordStatus").className = "agent-status warning";
    return;
  }
  if (!passwordMeetsPolicy(newPassword)) {
    $("#changePasswordStatus").textContent = "Use minimum 8 characters with uppercase, lowercase, number, and symbol.";
    $("#changePasswordStatus").className = "agent-status warning";
    return;
  }
  if (oldPassword === newPassword) {
    $("#changePasswordStatus").textContent = "New password must be different from the current password.";
    $("#changePasswordStatus").className = "agent-status warning";
    return;
  }
  if (newPassword !== confirmPassword) {
    $("#changePasswordStatus").textContent = "New password and confirmation do not match.";
    $("#changePasswordStatus").className = "agent-status warning";
    return;
  }
  const users = readLocalUsers();
  let userIndex = users.findIndex((item) => item.id === state.currentUser.id || item.email === state.currentUser.email);
  if (userIndex < 0) {
    users.unshift({ ...state.currentUser, seeded: false });
    userIndex = 0;
  }
  const updatedUser = {
    ...users[userIndex],
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
    passwordChangedAt: new Date().toISOString(),
  };
  users[userIndex] = updatedUser;
  writeLocalUsers(users);
  state.currentUser = updatedUser;
  writeSession(updatedUser);
  $("#oldPasswordInput").value = "";
  $("#newPasswordInput").value = "";
  $("#confirmPasswordInput").value = "";
  $("#changePasswordStatus").textContent = "Password updated.";
  $("#changePasswordStatus").className = "agent-status";
  window.setTimeout(() => showChangePassword(false), 900);
}

function getWalletReportsForSelectedPerson() {
  const data = careStore.read();
  if (!state.selectedPersonId) return [];
  return (data.reports || []).filter((report) => report.personId === state.selectedPersonId);
}

function getSelectedReportsForCase() {
  const walletReports = getWalletReportsForSelectedPerson();
  if (!state.selectedReportIds.length) return [];
  return walletReports.filter((report) => state.selectedReportIds.includes(report.id));
}

function appointmentCasesForReception() {
  const data = careStore.read();
  const hospital = state.currentUser?.hospital || "";
  if (state.workspace !== "receptionist" || !hospital) return [];
  const hospitalAppointments = (data.appointments || []).filter((appointment) => appointment.hospitalName === hospital);
  const caseIds = new Set(hospitalAppointments.map((appointment) => appointment.caseId));
  return (data.cases || []).filter((caseItem) => caseIds.has(caseItem.id));
}

function latestCaseForPerson(personId = state.selectedPersonId) {
  if (!personId) return null;
  const data = careStore.read();
  return (data.cases || []).find((caseItem) => caseItem.personId === personId);
}

function patientNameForPersonId(personId, data = careStore.read()) {
  const [type, id] = String(personId || "").split(":");
  if (type === "member") return data.members.find((item) => item.id === id)?.name || "Customer patient";
  if (type === "patient") return data.patients.find((item) => item.id === id)?.name || "Walk-in patient";
  return "Patient";
}

function caseHasDoctorReview(caseId, data = careStore.read()) {
  return (data.doctorInputs || []).some((item) => item.caseId === caseId) || (data.prescriptions || []).some((item) => item.caseId === caseId);
}

function unlockStages(stages) {
  state.unlockedStages = Array.from(new Set([...state.unlockedStages, ...stages]));
  renderStepVisibility();
}

function renderStepVisibility() {
  document.querySelectorAll("[data-stage-panel]").forEach((panel) => {
    const locked = !state.unlockedStages.includes(panel.dataset.stagePanel);
    panel.classList.toggle("is-locked", locked || panel.dataset.stagePanel !== state.activePatientStage);
  });
  document.querySelectorAll(".patient-care-path .path-step").forEach((button) => {
    button.classList.toggle("is-disabled", !state.unlockedStages.includes(button.dataset.stage));
  });
  document.querySelectorAll("[data-next-stage]").forEach((button) => {
    const nextStage = button.dataset.nextStage;
    button.disabled = !state.unlockedStages.includes(nextStage);
    button.title = button.disabled ? "Complete this step first" : "";
  });
}

function showPatientStage(stage) {
  if (!state.unlockedStages.includes(stage)) {
    setAgentStatus("Complete the current step before moving ahead.", "warning");
    return;
  }
  state.activePatientStage = stage;
  renderStepVisibility();
  updateCarePath(stage, state.unlockedStages.filter((item) => item !== stage));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCareStage(stage) {
  if (state.workspace === "receptionist") {
    if (!state.unlockedStages.includes(stage)) {
      setAgentStatus("Complete the current step before moving ahead.", "warning");
      return;
    }
    showReceptionPanel(stage);
    return;
  }
  showPatientStage(stage);
}

function showReceptionPanel(panelName) {
  state.activeReceptionPanel = panelName;
  if (["intake", "reports", "triage", "followup", "routing", "appointments"].includes(panelName)) {
    state.activePatientStage = panelName;
  }
  const sharedPanels = new Set(["intake", "reports", "triage", "followup", "routing", "appointments"]);
  document.querySelectorAll(".receptionist-panel-view").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== panelName);
  });
  document.querySelectorAll("[data-stage-panel]").forEach((panel) => {
    panel.classList.toggle("is-locked", !sharedPanels.has(panel.dataset.stagePanel) || panel.dataset.stagePanel !== panelName);
  });
  document.querySelectorAll(".receptionist-care-path .path-step").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === panelName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDoctorPanel(panelName) {
  state.activeDoctorPanel = panelName;
  document.querySelectorAll(".doctor-panel-view").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== panelName);
  });
  document.querySelectorAll(".doctor-care-path .path-step").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === panelName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showActiveRolePanel() {
  if (state.workspace === "customer") {
    renderStepVisibility();
  } else if (state.workspace === "receptionist") {
    showReceptionPanel(state.activeReceptionPanel);
  } else {
    showDoctorPanel(state.activeDoctorPanel);
  }
}

function renderFamilyMembers() {
  const data = careStore.read();
  const panel = $("#familyMemberList");
  if (!panel) return;
  const members = data.members.filter((member) => !member.ownerUserId || member.ownerUserId === state.currentUser?.id);
  if (!members.length) {
    panel.className = "stack empty-state";
    panel.textContent = "No patients added yet.";
    return;
  }
  panel.className = "stack";
  panel.innerHTML = members
    .map(
      (member) => `
        <button class="case-card ${member.id === state.selectedPersonId ? "is-selected" : ""}" type="button" data-member-id="${escapeHtml(member.id)}">
          <strong>${escapeHtml(member.name)}</strong>
          <span>${escapeHtml(member.relation || "Patient")} | ${escapeHtml(member.age || "")} ${escapeHtml(member.sex || "")}</span>
          <span>${escapeHtml(member.location || "")}</span>
        </button>
      `
    )
    .join("");
  document.querySelectorAll("[data-member-id]").forEach((button) => {
    button.addEventListener("click", () => selectPerson(button.dataset.memberId, "member"));
  });
}

function renderReceptionPatients() {
  const data = careStore.read();
  const panel = $("#receptionPatientList");
  if (!panel) return;
  const hospital = state.currentUser?.hospital;
  const patients = data.patients.filter((patient) => !hospital || !patient.hospital || patient.hospital === hospital);
  const bookedCasePersonIds = new Set(appointmentCasesForReception().map((caseItem) => caseItem.personId));
  const bookedMembers = data.members.filter((member) => bookedCasePersonIds.has(`member:${member.id}`));
  const combined = [
    ...patients.map((patient) => ({ ...patient, type: "patient" })),
    ...bookedMembers.map((member) => ({ ...member, type: "member", phone: member.relation || "customer booking", city: member.location || "" })),
  ];
  if (!combined.length) {
    panel.className = "stack empty-state";
    panel.textContent = "No patients registered or booked for this hospital yet.";
    return;
  }
  panel.className = "stack";
  panel.innerHTML = combined
    .map(
      (patient) => `
        <button class="case-card ${`${patient.type}:${patient.id}` === state.selectedPersonId ? "is-selected" : ""}" type="button" data-reception-person="${escapeHtml(`${patient.type}:${patient.id}`)}">
          <strong>${escapeHtml(patient.name)}</strong>
          <span>${escapeHtml(patient.phone || "No mobile")} · ${escapeHtml(patient.age || "")} ${escapeHtml(patient.sex || "")}</span>
          <span>${escapeHtml(patient.city || "")}</span>
        </button>
      `
    )
    .join("");
  document.querySelectorAll("[data-reception-person]").forEach((button) => {
    button.addEventListener("click", () => handlePersonSelectChange(button.dataset.receptionPerson));
  });
}

function renderPersonSelect() {
  const selects = ["#casePersonSelect", "#intakePersonSelect"].map((selector) => $(selector)).filter(Boolean);
  if (!selects.length) return;
  const data = careStore.read();
  const bookedCasePersonIds = new Set(appointmentCasesForReception().map((caseItem) => caseItem.personId));
  const members = data.members.filter((member) =>
    state.workspace === "receptionist"
      ? bookedCasePersonIds.has(`member:${member.id}`)
      : !member.ownerUserId || member.ownerUserId === state.currentUser?.id
  );
  const patients = data.patients.filter((patient) => state.workspace !== "receptionist" || !state.currentUser?.hospital || patient.hospital === state.currentUser.hospital);
  const options = [
    ...members.map((member) => ({ value: `member:${member.id}`, label: `${member.name} (${member.relation || "patient"})` })),
    ...patients.map((patient) => ({ value: `patient:${patient.id}`, label: `${patient.name} (${patient.phone || "walk-in"})` })),
  ];
  const markup = `<option value="">Current patient</option>${options.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join("")}`;
  selects.forEach((select) => {
    select.innerHTML = markup;
    if (state.selectedPersonId) select.value = state.selectedPersonId;
  });
}

function saveFamilyMember() {
  const name = $("#memberNameInput").value.trim();
  if (!name) {
    setAgentStatus("Enter patient name before saving.", "warning");
    return;
  }
  const member = careStore.upsertMember({
    ownerUserId: state.currentUser?.id,
    name,
    age: Number($("#memberAgeInput").value || 0),
    sex: $("#memberSexInput").value,
    relation: $("#memberRelationInput").value.trim(),
    location: $("#memberLocationInput").value.trim() || state.currentUser?.city || config.defaultPatient.location,
  });
  selectPerson(member.id, "member");
  ["#memberNameInput", "#memberAgeInput", "#memberRelationInput", "#memberLocationInput"].forEach((selector) => {
    const input = $(selector);
    if (input) input.value = "";
  });
  renderFamilyMembers();
  renderPersonSelect();
  renderReports();
  renderIntakeReportSelect();
  setAgentStatus("Patient saved. Reports and symptoms can now be attached to this profile.");
}

function saveReceptionPatient() {
  const name = $("#receptionPatientName").value.trim();
  if (!name) {
    setAgentStatus("Enter patient name before saving.", "warning");
    return;
  }
  const patient = careStore.upsertPatient({
    name,
    phone: $("#receptionPatientPhone").value.trim(),
    age: Number($("#receptionPatientAge").value || 0),
    sex: $("#receptionPatientSex").value,
    city: $("#receptionPatientCity").value.trim() || state.currentUser?.city || "",
    hospital: state.currentUser?.hospital || "",
    createdByUserId: state.currentUser?.id,
  });
  selectPerson(patient.id, "patient");
  ["#receptionPatientName", "#receptionPatientPhone", "#receptionPatientAge", "#receptionPatientCity"].forEach((selector) => {
    const input = $(selector);
    if (input) input.value = "";
  });
  renderReceptionPatients();
  renderPersonSelect();
  setAgentStatus("Patient saved for reception workflow.");
}

function selectPerson(id, type) {
  const key = `${type}:${id}`;
  state.selectedPersonId = key;
  if (type === "patient") state.selectedReceptionPatientId = id;
  const data = careStore.read();
  const person = type === "member" ? data.members.find((item) => item.id === id) : data.patients.find((item) => item.id === id);
  if (!person) return;
  $("#ageInput").value = String(person.age || config.defaultPatient.age);
  $("#sexInput").value = person.sex || config.defaultPatient.sex;
  $("#locationInput").value = person.location || person.city || config.defaultPatient.location;
  const availableReportIds = getWalletReportsForSelectedPerson().map((report) => report.id);
  state.selectedReportIds = state.selectedReportIds.filter((id) => availableReportIds.includes(id));
  const latestCase = latestCaseForPerson(key);
  if (state.workspace === "receptionist" && latestCase?.patientContext?.symptoms) {
    $("#symptomInput").value = latestCase.patientContext.symptoms;
    state.selectedReportIds = (latestCase.reports || []).map((report) => report.id).filter(Boolean);
  }
  state.reports = getSelectedReportsForCase();
  renderFamilyMembers();
  renderReceptionPatients();
  renderPersonSelect();
  renderReports();
  renderIntakeReportSelect();
}

function handlePersonSelectChange(value) {
  const [type, id] = String(value || "").split(":");
  if (type && id) selectPerson(id, type);
}

function handleIntakeReportSelection() {
  const select = $("#intakeReportSelect");
  if (!select) return;
  state.selectedReportIds = Array.from(select.selectedOptions).map((option) => option.value).filter(Boolean);
  state.reports = getSelectedReportsForCase();
  renderReports();
  setAgentStatus(
    state.selectedReportIds.length
      ? `${state.selectedReportIds.length} report${state.selectedReportIds.length === 1 ? "" : "s"} selected for triage.`
      : "No reports selected for triage. Symptoms and patient details will still be used."
  );
}

function setAllReportsSelected(selected) {
  const reports = getWalletReportsForSelectedPerson();
  state.selectedReportIds = selected ? reports.map((report) => report.id) : [];
  state.reports = getSelectedReportsForCase();
  renderIntakeReportSelect();
  renderReports();
  setAgentStatus(selected ? "All available reports selected for triage." : "Reports cleared for this triage.");
}

function renderIntakeReportSelect() {
  const select = $("#intakeReportSelect");
  if (!select) return;
  const reports = getWalletReportsForSelectedPerson();
  if (!reports.length) {
    select.innerHTML = `<option value="">No reports in wallet for selected patient</option>`;
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = reports
    .map((report) => `<option value="${escapeHtml(report.id)}">${escapeHtml(report.reportType || "Report")} - ${escapeHtml(report.name)}</option>`)
    .join("");
  Array.from(select.options).forEach((option) => {
    option.selected = state.selectedReportIds.includes(option.value);
  });
}

function renderChips() {
  $("#quickSymptoms").innerHTML = config.quickInputs
    .map((symptom) => `<button class="chip" type="button">${escapeHtml(symptom)}</button>`)
    .join("");

  document.querySelectorAll("#quickSymptoms .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const input = $("#symptomInput");
      input.value = `${input.value}${input.value ? ", " : ""}${chip.textContent}`;
      input.focus();
    });
  });
}

function renderConditions() {
  const list = $("#conditionList");
  const refinePanel = $("#refineDecisionPanel");
  if (refinePanel) refinePanel.classList.add("is-hidden");
  if (!state.results.length) {
    list.className = "stack empty-state";
    list.textContent = state.hasRun
      ? "No strong match yet. Add duration, symptom severity, pain location, or any known medical history."
      : "Step 1 is waiting for symptoms and patient details.";
    return;
  }

  list.className = "stack";
  list.innerHTML = state.results
    .map(
      (condition) => `
        <article class="condition">
          <strong>${escapeHtml(condition.name)}</strong>
          <span>${escapeHtml(condition.specialty || condition.route)}</span>
          <div class="tag-row">${(condition.hits || []).map((hit) => `<span class="tag">${escapeHtml(hit)}</span>`).join("")}</div>
          <div class="confidence" aria-label="Confidence ${condition.score}%"><span style="width:${condition.score}%"></span></div>
        </article>
      `
    )
    .join("");

  if (state.triagePhase === "refined" && state.lastRefinedAnswers.length) {
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="agent-status">Refined using ${state.lastRefinedAnswers.length} follow-up answer${state.lastRefinedAnswers.length === 1 ? "" : "s"}.</div>`
    );
  }

  if (refinePanel && state.triagePhase === "initial" && state.followupQuestions.length) {
    refinePanel.classList.remove("is-hidden");
  }
}

function renderQuestions() {
  const panel = $("#questionList");
  const questions = state.results.flatMap((condition) => (condition.questions || []).slice(0, 2)).slice(0, 6);
  if (!questions.length) {
    panel.className = "questions empty-state";
    panel.textContent = "Follow-up questions appear after triage.";
    $("#refineButton").disabled = true;
    return;
  }

  const priorAnswers = new Map(state.followupAnswers.map((item) => [item.question, item.answer]));
  if (!arraysMatch(state.followupQuestions, questions) && state.triagePhase !== "refined") {
    state.followupAnswers = questions
      .map((question) => ({ question, answer: priorAnswers.get(question) || "" }))
      .filter((item) => item.answer);
  }
  state.followupQuestions = questions;
  panel.className = "questions";
  panel.innerHTML = questions
    .map(
      (question, index) => `
        <div class="question">
          <label for="followup-${index}">${escapeHtml(question)}</label>
          <textarea id="followup-${index}" data-followup-index="${index}" rows="2" placeholder="Answer here, or leave blank if not known"></textarea>
        </div>
      `
    )
    .join("");
  if (state.provider !== "llm") {
    panel.insertAdjacentHTML("afterbegin", `<div class="empty-state">Limited offline questions are shown because full review is unavailable.</div>`);
  }
  $("#refineButton").disabled = false;

  state.followupAnswers.forEach((item) => {
    const index = state.followupQuestions.indexOf(item.question);
    const input = document.querySelector(`[data-followup-index="${index}"]`);
    if (input) input.value = item.answer;
  });
}

function renderDoctorRouting() {
  const panel = $("#doctorPanel");
  const top = state.results[0];

  if (state.urgent.length) {
    panel.className = "stack";
    panel.innerHTML = `
      <article class="doctor urgent-card">
        <strong>Emergency / Triage Desk</strong>
        <p>${escapeHtml(state.urgent.map((item) => item.text).join(" "))}</p>
        <p>Recommended action: urgent vitals check and clinician review before routine OPD routing.</p>
      </article>
    `;
    return;
  }

  if (!top) {
    panel.className = "stack empty-state";
    panel.textContent = "Specialist routing appears after triage.";
    return;
  }

  panel.className = "stack";
  panel.innerHTML = `
    <article class="doctor">
      <strong>${escapeHtml(top.specialty || top.route)}</strong>
      <p>${escapeHtml(top.nextStep)}</p>
      <div class="tag-row">
        <span class="tag">OPD routing</span>
        <span class="tag">Human review</span>
        <span class="tag">Clinical review</span>
      </div>
    </article>
  `;
}

function getTopRoute() {
  if (state.urgent.length) return "Emergency / Triage Desk";
  return state.results[0]?.specialty || state.results[0]?.route || "General Physician / Internal Medicine";
}

function extractCity(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function getDoctorFilters() {
  const specialtyElement = $("#doctorSpecialtyInput");
  const cityElement = $("#doctorCityInput");
  const hospitalElement = $("#doctorHospitalInput");
  const radiusElement = $("#doctorRadiusInput");
  const forcedHospital = state.workspace === "receptionist" && state.currentUser?.hospital ? state.currentUser.hospital : "";
  const hospital = forcedHospital || (hospitalElement ? hospitalElement.value : state.doctorFilters.hospital);
  const cityValue = cityElement ? cityElement.value : state.doctorFilters.city || extractCity($("#locationInput")?.value);
  const radiusKm = hospital ? 0 : Number(radiusElement ? radiusElement.value : state.doctorFilters.radiusKm || 0);
  const filters = {
    specialty: specialtyElement ? specialtyElement.value : state.doctorFilters.specialty || getTopRoute(),
    city: appointmentService.canonicalCity(cityValue),
    hospital,
    radiusKm,
  };
  if (filters.hospital) {
    return {
      ...filters,
      city: "",
      radiusKm: 0,
      searchMode: "hospital",
    };
  }
  return {
    ...filters,
    searchMode: filters.radiusKm > 0 ? "nearby" : "city",
  };
}

function setDoctorFilters(nextFilters = {}) {
  state.doctorFilters = {
    ...state.doctorFilters,
    ...nextFilters,
  };
  if ($("#doctorSpecialtyInput")) {
    const specialty = state.doctorFilters.specialty || getTopRoute();
    if (specialty && !Array.from($("#doctorSpecialtyInput").options).some((option) => option.value === specialty)) {
      $("#doctorSpecialtyInput").insertAdjacentHTML("afterbegin", `<option value="${escapeHtml(specialty)}">${escapeHtml(specialty)}</option>`);
    }
    $("#doctorSpecialtyInput").value = specialty;
  }
  if ($("#doctorCityInput")) $("#doctorCityInput").value = appointmentService.canonicalCity(state.doctorFilters.city || extractCity($("#locationInput")?.value));
  if ($("#doctorHospitalInput")) {
    $("#doctorHospitalInput").value = state.workspace === "receptionist" && state.currentUser?.hospital ? state.currentUser.hospital : state.doctorFilters.hospital || "";
    $("#doctorHospitalInput").disabled = state.workspace === "receptionist" && Boolean(state.currentUser?.hospital);
  }
  if ($("#doctorRadiusInput")) {
    const lockedToHospital = Boolean(state.workspace === "receptionist" && state.currentUser?.hospital) || Boolean($("#doctorHospitalInput")?.value);
    $("#doctorRadiusInput").value = lockedToHospital ? "0" : String(state.doctorFilters.radiusKm || 0);
    $("#doctorRadiusInput").disabled = lockedToHospital;
  }
}

function renderDoctorSearchOptions() {
  const specialtySelect = $("#doctorSpecialtyInput");
  if (specialtySelect) {
    const specialties = appointmentService.listSpecialties();
    specialtySelect.innerHTML = specialties.map((specialty) => `<option value="${escapeHtml(specialty)}">${escapeHtml(specialty)}</option>`).join("");
  }

  const citySelect = $("#doctorCityInput");
  if (citySelect) {
    const selectedCity = appointmentService.canonicalCity(state.doctorFilters.city || extractCity($("#locationInput")?.value));
    citySelect.innerHTML = `<option value="">Any city</option>${appointmentService
      .listCities()
      .map((city) => `<option value="${escapeHtml(city.value)}">${escapeHtml(city.label)}</option>`)
      .join("")}`;
    citySelect.value = selectedCity;
  }

  const hospitalSelect = $("#doctorHospitalInput");
  if (hospitalSelect) {
    const hospitals = state.workspace === "receptionist" && state.currentUser?.hospital
      ? appointmentService.listHospitals().filter((hospital) => hospital.name === state.currentUser.hospital)
      : appointmentService.listHospitals();
    hospitalSelect.innerHTML = `<option value="">Any hospital</option>${hospitals
      .map((hospital) => `<option value="${escapeHtml(hospital.name)}">${escapeHtml(hospital.name)} - ${escapeHtml(hospital.area)}, ${escapeHtml(hospital.city)}</option>`)
      .join("")}`;
    if (hospitals.some((hospital) => hospital.name === state.doctorFilters.hospital)) {
      hospitalSelect.value = state.doctorFilters.hospital;
    }
  }

  setDoctorFilters({
    specialty: state.doctorFilters.specialty || getTopRoute(),
    city: state.doctorFilters.city || extractCity($("#locationInput")?.value),
  });
}

function renderReports() {
  const panel = $("#reportList");
  const walletReports = getWalletReportsForSelectedPerson();
  if (!walletReports.length) {
    panel.className = "mini-list empty-state";
    panel.textContent = state.selectedPersonId ? "No reports uploaded for this patient." : "Select a patient before uploading reports.";
    return;
  }

  panel.className = "mini-list stack";
  panel.innerHTML = walletReports
    .map((report) => `<div><strong>${escapeHtml(report.name)}</strong><p>${escapeHtml(report.reportType || "Report")} · ${escapeHtml(report.status)} · ${Math.ceil(report.size / 1024)} KB</p></div>`)
    .join("");
}

async function handleReportUpload(event) {
  if (!state.selectedPersonId) {
    setAgentStatus("Select a patient before uploading reports.", "warning");
    return;
  }
  const parsedReports = await reportService.parseFiles(event.target.files);
  const savedReports = careStore.addReports(parsedReports.map((report) => ({
    ...report,
    personId: $("#casePersonSelect")?.value || state.selectedPersonId,
    reportType: $("#reportTypeInput")?.value || "Report",
  })));
  state.reports = getSelectedReportsForCase();
  renderReports();
  renderIntakeReportSelect();
  setAgentStatus(`${savedReports.length} report file${savedReports.length === 1 ? "" : "s"} added to the patient wallet. Select specific reports in Intake before triage.`);
}

function saveCurrentCase() {
  if (!state.hasRun) return null;
  const record = careStore.upsertCase({
    id: state.currentCaseId,
    patientContext: state.lastContext,
    personId: state.selectedPersonId,
    createdByUserId: state.currentUser?.id,
    createdByRole: state.workspace,
    reports: getSelectedReportsForCase(),
    extractedSymptoms: state.extracted,
    possibleConditions: state.results,
    urgent: state.urgent,
    followupQuestions: state.followupQuestions,
    followupAnswers: state.followupAnswers,
    route: getTopRoute(),
    status: state.urgent.length ? "Urgent routing" : "Triage complete",
  });
  state.currentCaseId = record.id;
  renderDoctorQueue();
  return record;
}

function getGoogleDoctorOrigin(filters) {
  if (filters.city) return appointmentService.cityCenter(filters.city);
  const hospital = appointmentService.hospitalByName(filters.hospital);
  return hospital ? { latitude: hospital.latitude, longitude: hospital.longitude } : null;
}

async function fetchGoogleDoctorResults(selectedSpecialty, filters) {
  try {
    const response = await fetch("/api/google-doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialty: selectedSpecialty,
        city: filters.city || appointmentService.cityForHospital(filters.hospital),
        hospital: filters.hospital,
        radiusKm: filters.radiusKm,
        origin: getGoogleDoctorOrigin(filters),
        languageCode: state.outputLanguage.googleLanguageCode,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Google doctor search returned ${response.status}`);
    return data;
  } catch (error) {
    console.warn("Google doctor search failed:", error);
    return { configured: false, places: [], error: error.message };
  }
}

function renderIntegratedDoctorCard(doctor) {
  return `
    <article class="appointment-card">
      <strong>${escapeHtml(doctor.name)}</strong>
      <p>${escapeHtml(doctor.department)} · ${escapeHtml(doctor.hospitalName)}, ${escapeHtml(doctor.area ? `${doctor.area}, ` : "")}${escapeHtml(doctor.city)} · ${escapeHtml(doctor.experience)}</p>
      <div class="doctor-meta">
        <span>${Number(doctor.rating || 0).toFixed(1)} rating</span>
        <span>${escapeHtml((doctor.languages || []).join(", ") || "Language not listed")}</span>
        <span>${doctor.consultationFee ? `Rs. ${doctor.consultationFee}` : "Fee not listed"}</span>
        ${doctor.distanceKm !== null && doctor.distanceKm !== undefined ? `<span>${doctor.distanceKm.toFixed(1)} km approx.</span>` : ""}
      </div>
      <div class="slot-grid">
        ${doctor.slots
          .map(
            (slot) =>
              `<button class="slot-button" type="button" data-doctor-id="${escapeHtml(doctor.id)}" data-slot="${escapeHtml(slot)}">${escapeHtml(slot)}</button>`
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderGoogleDoctorCard(place) {
  return `
    <article class="appointment-card external-doctor-card">
      <strong>${escapeHtml(place.name)}</strong>
      <p>${escapeHtml(place.address || "Address not available")}</p>
      <div class="doctor-meta">
        <span>Google Maps result</span>
        ${place.rating ? `<span>${Number(place.rating).toFixed(1)} rating</span>` : ""}
        ${place.phone ? `<span>${escapeHtml(place.phone)}</span>` : ""}
      </div>
      <div class="inline-actions">
        ${place.googleMapsUri ? `<a class="secondary-action" href="${escapeHtml(place.googleMapsUri)}" target="_blank" rel="noreferrer">Open Maps</a>` : ""}
        ${place.websiteUri ? `<a class="secondary-action" href="${escapeHtml(place.websiteUri)}" target="_blank" rel="noreferrer">Website</a>` : ""}
      </div>
    </article>
  `;
}

async function renderAppointmentOptions() {
  const panel = $("#appointmentList");
  if (!panel) return;

  const filters = getDoctorFilters();
  const selectedSpecialty = filters.specialty || getTopRoute();
  const doctors = appointmentService.findDoctors(selectedSpecialty, filters);
  state.lastDoctorResults = doctors;
  const useExternalDiscovery = state.workspace !== "receptionist";
  const googleResult = useExternalDiscovery ? await fetchGoogleDoctorResults(selectedSpecialty, filters) : { configured: true, places: [] };
  const googlePlaces = googleResult.places || [];
  const externalSearchUrl = appointmentService.buildExternalSearchUrl({
    specialty: selectedSpecialty,
    city: filters.city || appointmentService.cityForHospital(filters.hospital) || "",
    hospital: filters.hospital,
  });
  const searchScope =
    filters.searchMode === "hospital"
      ? `at ${filters.hospital}`
      : filters.searchMode === "nearby"
        ? `within ${filters.radiusKm} km of ${filters.city || "selected city"}`
        : filters.city
          ? `in ${filters.city}`
          : "across all configured cities";
  panel.className = "stack";
  panel.innerHTML = `
    <div class="agent-status">
      ${state.hasRun ? "" : "Directory search only. Run triage first to prefill the recommended specialty. "}
      Search #${state.doctorSearchCount}: showing ${doctors.length} integrated doctor${doctors.length === 1 ? "" : "s"}${useExternalDiscovery ? ` and ${googlePlaces.length} Google Maps result${googlePlaces.length === 1 ? "" : "s"}` : ""} for ${escapeHtml(selectedSpecialty)} ${escapeHtml(searchScope)}.
      ${state.workspace === "receptionist" ? "Only doctors in this hospital network are shown for receptionist booking." : ""}
      ${googleResult.configured === false ? "Google Maps API is not configured on this server." : ""}
      ${useExternalDiscovery ? `<a href="${externalSearchUrl}" target="_blank" rel="noreferrer">Open browser search</a>` : ""}
    </div>
    ${
      doctors.length
        ? doctors
            .map(
              (doctor) => `
        <article class="appointment-card">
          <strong>${escapeHtml(doctor.name)}</strong>
          <p>${escapeHtml(doctor.department)} · ${escapeHtml(doctor.hospitalName)}, ${escapeHtml(doctor.area ? `${doctor.area}, ` : "")}${escapeHtml(doctor.city)} · ${escapeHtml(doctor.experience)}</p>
          <div class="doctor-meta">
            <span>${Number(doctor.rating || 0).toFixed(1)} rating</span>
            <span>${escapeHtml((doctor.languages || []).join(", ") || "Language not listed")}</span>
            <span>${doctor.consultationFee ? `Rs. ${doctor.consultationFee}` : "Fee not listed"}</span>
            ${doctor.distanceKm !== null && doctor.distanceKm !== undefined ? `<span>${doctor.distanceKm.toFixed(1)} km approx.</span>` : ""}
          </div>
          <div class="slot-grid">
            ${doctor.slots
              .map(
                (slot) =>
                  `<button class="slot-button" type="button" data-doctor-id="${escapeHtml(doctor.id)}" data-slot="${escapeHtml(slot)}">${escapeHtml(slot)}</button>`
              )
              .join("")}
          </div>
        </article>
      `
            )
            .join("")
        : `<div class="empty-state">No matching doctors found in the local directory. Try a wider radius, another city, or open the external directory search.</div>`
    }
  `;

  panel.innerHTML = `
    <div class="agent-status">
      ${state.hasRun ? "" : "Directory search only. Run triage first to prefill the recommended specialty. "}
      Search #${state.doctorSearchCount}: showing ${doctors.length} integrated doctor${doctors.length === 1 ? "" : "s"}${useExternalDiscovery ? ` and ${googlePlaces.length} Google Maps result${googlePlaces.length === 1 ? "" : "s"}` : ""} for ${escapeHtml(selectedSpecialty)} ${escapeHtml(searchScope)}.
      ${state.workspace === "receptionist" ? "Only doctors in this hospital network are shown for receptionist booking." : ""}
      ${googleResult.configured === false ? "Google Maps API is not configured on this server." : ""}
      ${useExternalDiscovery ? `<a href="${externalSearchUrl}" target="_blank" rel="noreferrer">Open browser search</a>` : ""}
    </div>
    ${
      doctors.length
        ? doctors.map(renderIntegratedDoctorCard).join("")
        : `<div class="empty-state">No matching integrated doctors found. Try a wider radius, another city, or use a Google Maps result below.</div>`
    }
  `;

  if (googlePlaces.length) {
    panel.insertAdjacentHTML(
      "beforeend",
      `<div class="section-divider">Google Maps results</div>${googlePlaces.map(renderGoogleDoctorCard).join("")}`
    );
  }

  document.querySelectorAll(".slot-button").forEach((button) => {
    button.addEventListener("click", () => bookAppointment(button.dataset.doctorId, button.dataset.slot));
  });
}

function bookAppointment(doctorId, slot) {
  const caseRecord = saveCurrentCase();
  if (!caseRecord) {
    setAgentStatus("Run triage before booking an appointment.", "warning");
    return;
  }
  const doctor = state.lastDoctorResults.find((item) => item.id === doctorId) || appointmentService.findDoctorById(doctorId);
  const appointment = careStore.addAppointment({
    caseId: caseRecord.id,
    personId: state.selectedPersonId,
    bookedByUserId: state.currentUser?.id,
    bookedByRole: state.workspace,
    doctorId,
    doctorName: doctor?.name || "",
    hospitalName: doctor?.hospitalName || "",
    department: doctor?.department || getTopRoute(),
    slot,
  });
  careStore.upsertCase({ ...caseRecord, appointment, status: "Appointment booked" });
  renderDoctorQueue();
  unlockStages(["treatment", "feedback"]);
  updateCarePath("appointments", ["intake", "triage", "followup", "routing"]);
  renderPatientTreatment();
  const message = `${appointment.doctorName} at ${appointment.hospitalName}, ${appointment.slot}.`;
  setAgentStatus(`Appointment booked with ${message}`);
  showBookingToast(message);
}

function renderDoctorQueue() {
  const data = careStore.read();
  const panel = $("#doctorQueue");
  const dashboard = $("#doctorDashboard");
  const doctorHospital = state.currentUser?.hospital || "";
  const appointments = (data.appointments || []).filter((appointment) => {
    if (state.workspace !== "doctor") return true;
    if (appointment.doctorName === state.currentUser?.name) return true;
    return doctorHospital && appointment.hospitalName === doctorHospital;
  });
  const sortedAppointments = [...appointments].sort((a, b) => String(a.slot || "").localeCompare(String(b.slot || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const todayCount = sortedAppointments.filter((appointment) => /^today/i.test(appointment.slot || "")).length;
  const reviewedCount = sortedAppointments.filter((appointment) => caseHasDoctorReview(appointment.caseId, data)).length;
  const pendingCount = Math.max(0, sortedAppointments.length - reviewedCount);

  if (dashboard) {
    dashboard.className = "doctor-dashboard";
    dashboard.innerHTML = `
      <article>
        <span>Total appointments</span>
        <strong>${sortedAppointments.length}</strong>
      </article>
      <article>
        <span>Today</span>
        <strong>${todayCount}</strong>
      </article>
      <article>
        <span>Pending review</span>
        <strong>${pendingCount}</strong>
      </article>
      <article>
        <span>Reviewed</span>
        <strong>${reviewedCount}</strong>
      </article>
    `;
  }

  if (!appointments.length) {
    panel.className = "stack empty-state";
    panel.textContent = "Appointments will appear here after patients book a slot.";
    return;
  }

  panel.className = "appointment-list";
  panel.innerHTML = sortedAppointments
    .map((appointment) => {
      const caseItem = data.cases.find((item) => item.id === appointment.caseId);
      const reviewed = caseHasDoctorReview(appointment.caseId, data);
      const patientName = patientNameForPersonId(appointment.personId || caseItem?.personId, data);
      return `
        <button class="case-card ${appointment.caseId === state.selectedDoctorCaseId ? "is-selected" : ""}" type="button" data-case-id="${escapeHtml(appointment.caseId)}">
          <strong>${escapeHtml(patientName)} · ${escapeHtml(appointment.slot)}</strong>
          <span>${escapeHtml(caseItem?.patientContext?.symptoms || "No symptoms recorded")}</span>
          <span>${escapeHtml(appointment.doctorName)} · ${escapeHtml(appointment.hospitalName)} · ${escapeHtml(appointment.department)}</span>
          <span class="queue-status ${reviewed ? "reviewed" : "pending"}">${reviewed ? "Reviewed" : "Pending review"}</span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll("[data-case-id]").forEach((button) => {
    button.addEventListener("click", () => selectDoctorCase(button.dataset.caseId));
  });
}

function selectDoctorCase(caseId) {
  state.selectedDoctorCaseId = caseId;
  const data = careStore.read();
  const caseItem = data.cases.find((item) => item.id === caseId);
  const details = $("#doctorCaseDetails");
  renderDoctorQueue();

  if (!caseItem) {
    details.className = "stack empty-state";
    details.textContent = "Select a patient case.";
    return;
  }

  details.className = "stack";
  details.innerHTML = `
    <article class="case-card">
      <strong>${escapeHtml(patientNameForPersonId(caseItem.personId, data))} · ${escapeHtml(caseItem.route)}</strong>
      <p><strong>Symptoms:</strong> ${escapeHtml(caseItem.patientContext?.symptoms || "")}</p>
      <p><strong>Reports:</strong> ${escapeHtml(reportService.summarize(caseItem.reports || []))}</p>
      <p><strong>Follow-up answers:</strong> ${escapeHtml((caseItem.followupAnswers || []).map((item) => `${item.question}: ${item.answer}`).join(" | ") || "None")}</p>
      <div class="tag-row">${(caseItem.extractedSymptoms || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
    </article>
  `;
  $("#prescriptionInput").value = "";
  renderPrescriptionList();
  renderDoctorHistory();
}

function saveDoctorInput() {
  if (!state.selectedDoctorCaseId) {
    setAgentStatus("Select a patient case before saving doctor input.", "warning");
    return;
  }

  careStore.addDoctorInput({
    caseId: state.selectedDoctorCaseId,
    note: $("#doctorNote").value.trim(),
    additionalQuestions: $("#doctorFollowup").value.trim(),
    reportRequests: $("#doctorReportRequest").value.trim(),
  });
  const data = careStore.read();
  const caseItem = data.cases.find((item) => item.id === state.selectedDoctorCaseId);
  if (caseItem) {
    careStore.upsertCase({
      ...caseItem,
      doctorInputs: [...(caseItem.doctorInputs || []), {
        note: $("#doctorNote").value.trim(),
        additionalQuestions: $("#doctorFollowup").value.trim(),
        reportRequests: $("#doctorReportRequest").value.trim(),
      }],
      status: "Doctor reviewed",
    });
  }
  setAgentStatus("Doctor input saved to the patient case.");
  renderDoctorQueue();
  renderDoctorHistory();
  renderPatientTreatment();
}

function renderPrescriptionList() {
  const data = careStore.read();
  const list = $("#prescriptionList");
  const prescriptions = data.prescriptions.filter((item) => !state.selectedDoctorCaseId || item.caseId === state.selectedDoctorCaseId);
  if (!prescriptions.length) {
    list.className = "stack empty-state";
    list.textContent = "No prescription saved yet.";
    return;
  }
  list.className = "stack";
  list.innerHTML = prescriptions
    .map((item) => `<article class="case-card"><strong>${escapeHtml(item.fileName || "Prescription")}</strong><p>${escapeHtml(item.text || "File uploaded")}</p></article>`)
    .join("");
}

function renderDoctorHistory() {
  const panel = $("#doctorHistoryPanel");
  if (!panel) return;
  if (!state.selectedDoctorCaseId) {
    panel.className = "stack empty-state";
    panel.textContent = "Select a booked patient from Appointments to see history.";
    return;
  }
  const data = careStore.read();
  const caseItem = data.cases.find((item) => item.id === state.selectedDoctorCaseId);
  const appointments = data.appointments.filter((item) => item.caseId === state.selectedDoctorCaseId);
  const prescriptions = data.prescriptions.filter((item) => item.caseId === state.selectedDoctorCaseId);
  const doctorInputs = data.doctorInputs.filter((item) => item.caseId === state.selectedDoctorCaseId);
  panel.className = "stack";
  panel.innerHTML = `
    <article class="case-card">
      <strong>${escapeHtml(caseItem?.route || "Selected case")}</strong>
      <p>${escapeHtml(caseItem?.patientContext?.symptoms || "No symptoms recorded")}</p>
      <p>${escapeHtml(reportService.summarize(caseItem?.reports || []))}</p>
    </article>
    ${appointments.map((item) => `<article class="case-card"><strong>${escapeHtml(item.slot)}</strong><p>${escapeHtml(item.doctorName)} · ${escapeHtml(item.hospitalName)} · ${escapeHtml(item.status)}</p></article>`).join("")}
    ${doctorInputs.map((item) => `<article class="case-card"><strong>Doctor note</strong><p>${escapeHtml(item.note || "No note")}</p><p>${escapeHtml(item.reportRequests || "No additional reports")}</p></article>`).join("")}
    ${prescriptions.map((item) => `<article class="case-card"><strong>Prescription</strong><p>${escapeHtml(item.text || item.fileName || "Prescription uploaded")}</p></article>`).join("")}
  `;
}

async function savePrescription() {
  if (!state.selectedDoctorCaseId) {
    setAgentStatus("Select a patient case before saving a prescription.", "warning");
    return;
  }
  const file = $("#prescriptionFile").files[0];
  const text = $("#prescriptionInput").value.trim() || (file && /\.(txt|csv|json)$/i.test(file.name) ? await file.text() : "");
  careStore.addPrescription({
    caseId: state.selectedDoctorCaseId,
    text,
    fileName: file?.name || "",
    fileType: file?.type || "",
  });
  renderPrescriptionList();
  renderDoctorHistory();
  renderPatientTreatment();
  setAgentStatus("Prescription saved for the selected patient case.");
}

function renderMedicineOptions(prescriptionText = "") {
  const data = careStore.read();
  const latest = prescriptionText || data.prescriptions.find((item) => item.caseId === state.selectedDoctorCaseId)?.text || "";
  const matches = medicineService.findMatches(latest);
  const panel = $("#medicineList");
  if (!panel) return;
  if (!matches.length) {
    panel.className = "stack empty-state";
    panel.textContent = "Save prescription text to see salt matches and brand prices.";
    return;
  }
  panel.className = "stack";
  panel.innerHTML = matches
    .map(
      (match) => `
        <article class="medicine-card">
          <strong>${escapeHtml(match.salt)}</strong>
          ${match.brands
            .map((brand) => `<div class="price-row"><span>${escapeHtml(brand.brand)} · ${escapeHtml(brand.company)} · ${escapeHtml(brand.unit)}</span><strong>₹${brand.price}</strong></div>`)
            .join("")}
        </article>
      `
    )
    .join("");
}

function renderMedicineSearch() {
  const panel = $("#medicineSearchList");
  const input = $("#medicineSearchInput");
  if (!panel || !input) return;
  const query = input.value.trim();
  if (!query) {
    panel.className = "stack empty-state";
    panel.textContent = "Search a salt or brand to see matching medicine options.";
    return;
  }
  const matches = medicineService.findMatches(query);
  if (!matches.length) {
    panel.className = "stack empty-state";
    panel.textContent = "No matching salt found in the configured medicine catalog. Try another salt or brand name.";
    return;
  }
  panel.className = "stack";
  panel.innerHTML = matches
    .map(
      (match) => `
        <article class="medicine-card">
          <strong>${escapeHtml(match.salt)}</strong>
          ${match.brands
            .map(
              (brand) => `
                <div class="price-row medicine-result-row">
                  <span>
                    <b>${escapeHtml(brand.brand)}</b>
                    <small>Company: ${escapeHtml(brand.company)} | Pack: ${escapeHtml(brand.unit)}</small>
                  </span>
                  <strong>Rs ${brand.price}</strong>
                </div>
              `
            )
            .join("")}
        </article>
      `
    )
    .join("");
}

function renderPatientTreatment() {
  const panel = $("#patientTreatmentPanel");
  if (!panel) return;
  if (!state.currentCaseId) {
    panel.className = "stack empty-state";
    panel.textContent = "No treatment details available yet.";
    return;
  }

  const data = careStore.read();
  const caseItem = data.cases.find((item) => item.id === state.currentCaseId);
  const prescriptions = data.prescriptions.filter((item) => item.caseId === state.currentCaseId);
  const latestPrescription = prescriptions[0]?.text || "";
  const medicineMatches = medicineService.findMatches(latestPrescription);

  if (!caseItem?.doctorInputs?.length && !prescriptions.length) {
    panel.className = "stack empty-state";
    panel.textContent = "Treatment details will appear after the doctor completes the visit.";
    return;
  }

  panel.className = "stack";
  panel.innerHTML = `
    ${(caseItem.doctorInputs || [])
      .map(
        (input) => `
          <article class="case-card">
            <strong>Doctor advice</strong>
            <p>${escapeHtml(input.note || "No note added")}</p>
            <p><strong>Additional questions:</strong> ${escapeHtml(input.additionalQuestions || "None")}</p>
            <p><strong>Requested reports:</strong> ${escapeHtml(input.reportRequests || "None")}</p>
          </article>
        `
      )
      .join("")}
    ${prescriptions
      .map((item) => `<article class="case-card"><strong>Prescription</strong><p>${escapeHtml(item.text || item.fileName || "Prescription uploaded")}</p></article>`)
      .join("")}
    ${medicineMatches
      .map(
        (match) => `
          <article class="medicine-card">
            <strong>${escapeHtml(match.salt)}</strong>
            ${match.brands
              .map((brand) => `<div class="price-row"><span>${escapeHtml(brand.brand)} - ${escapeHtml(brand.company)} - ${escapeHtml(brand.unit)}</span><strong>Rs ${brand.price}</strong></div>`)
              .join("")}
          </article>
        `
      )
      .join("")}
  `;
}

function renderModelOptions() {
  $("#modelSelect").innerHTML = config.llm.models
    .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`)
    .join("");
  $("#modelSelect").value = config.llm.defaultModel;
}

function renderDatasetStats() {
  const stats = caseStore.stats();
  const needed = Math.max(config.feedback.minimumApprovedCasesForLocalUse - stats.approved, 0);
  $("#datasetStats").textContent = `${stats.approved} confirmed cases, ${stats.rejected} cases needing review, ${stats.total} total saved on this device. ${
    stats.readyForEvaluation ? "Enough confirmed cases are available for internal review." : `${needed} more confirmed cases recommended before internal review.`
  }`;
}

function setFeedbackEnabled(enabled) {
  $("#thumbsUpButton").disabled = !enabled;
  $("#thumbsDownButton").disabled = !enabled;
}

function renderRiskBadge() {
  const badge = $("#riskBadge");
  if (state.urgent.length) {
    badge.textContent = "Urgent red flag";
    badge.className = "status-pill urgent";
    return;
  }
  if (state.results.length) {
    badge.textContent = "Follow-up needed";
    badge.className = "status-pill warning";
    return;
  }
  badge.textContent = "Awaiting symptoms";
  badge.className = "status-pill";
}

function updateCarePath(activeStage, completedStages = []) {
  document.querySelectorAll(".patient-care-path .path-step").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.stage === activeStage);
    button.classList.toggle("is-complete", completedStages.includes(button.dataset.stage));
  });
}

function collectFollowupAnswers() {
  state.followupAnswers = state.followupQuestions
    .map((question, index) => {
      const input = document.querySelector(`[data-followup-index="${index}"]`);
      return { question, answer: input ? input.value.trim() : "" };
    })
    .filter((item) => item.answer);
}

function arraysMatch(first, second) {
  return first.length === second.length && first.every((item, index) => item === second[index]);
}

async function analyze({ refine = false } = {}) {
  const button = $("#analyzeButton");
  if (!$("#symptomInput").value.trim()) {
    setAgentStatus("Please type symptoms first, for example: fever for 3 days, cough, body pain.", "warning");
    return;
  }

  if (refine) collectFollowupAnswers();
  if (!refine) state.followupAnswers = [];
  if (refine) state.lastRefinedAnswers = [...state.followupAnswers];
  if (!refine) state.lastRefinedAnswers = [];

  button.disabled = true;
  $("#refineButton").disabled = true;
  button.textContent = "Analyzing...";
  updateCarePath("triage", ["intake"]);
  setAgentStatus(refine ? "Refining triage with follow-up answers..." : "Analyzing symptoms and checking red flags...");

  const context = getPatientContext(refine ? "refine_with_followup_answers" : "initial_from_intake");
  const result = await engine.run(context, { mode: $("#triageMode").value });
  state.hasRun = true;
  state.lastContext = context;
  state.extracted = result.extractedSymptoms;
  state.results = result.possibleConditions;
  state.urgent = result.urgent;
  state.provider = result.provider;
  state.model = $("#modelSelect").value || config.llm.defaultModel;
  state.outputLanguage = result.outputLanguage || context.outputLanguage || state.outputLanguage;
  state.triagePhase = refine ? "refined" : "initial";

  renderRiskBadge();
  renderQuestions();
  renderConditions();
  renderDoctorRouting();
  setDoctorFilters({ specialty: getTopRoute(), city: appointmentService.canonicalCity(extractCity(state.lastContext.location)) });
  saveCurrentCase();
  renderAppointmentOptions();
  unlockStages(refine ? ["triage", "followup", "routing", "appointments"] : ["triage"]);
  showCareStage("triage");

  if (state.urgent.length) {
    unlockStages(["routing", "appointments"]);
    updateCarePath("routing", ["intake", "triage"]);
  } else if (refine && state.results.length) {
    unlockStages(["routing", "appointments"]);
    showCareStage("triage");
    updateCarePath("triage", ["intake", "followup"]);
  } else if (state.results.length) {
    if (!state.followupQuestions.length) unlockStages(["routing", "appointments"]);
    updateCarePath("triage", ["intake"]);
  } else {
    updateCarePath("triage", ["intake"]);
  }

  if (state.results.length) {
    if (!state.urgent.length) {
      setAgentStatus(
        refine
          ? "Refined review completed. Check updated conditions and continue to doctor search."
          : "Initial review completed. Check possible conditions and choose whether to answer follow-up questions."
      );
    }
  } else if (!state.urgent.length) {
    setAgentStatus("No strong match yet. Add more symptom detail and run the review again.", "warning");
  }

  button.disabled = false;
  button.textContent = "Run care triage";
  $("#refineButton").disabled = !state.followupQuestions.length;
  setFeedbackEnabled(Boolean(state.results.length || state.urgent.length));
}

function startRefinement() {
  if (!state.followupQuestions.length) {
    setAgentStatus("No follow-up questions were generated for this case.", "warning");
    return;
  }
  unlockStages(["followup"]);
  showCareStage("followup");
  setAgentStatus("Answer the follow-up questions, then run refinement.");
}

function skipRefinement() {
  unlockStages(["routing", "appointments"]);
  showCareStage("routing");
  setAgentStatus("Follow-up refinement skipped. Continue with specialist routing and doctor search.");
}

function clearSearch() {
  $("#symptomInput").value = "";
  $("#ageInput").value = String(config.defaultPatient.age);
  $("#sexInput").value = config.defaultPatient.sex;
  $("#locationInput").value = config.defaultPatient.location;
  state.extracted = [];
  state.results = [];
  state.urgent = [];
  state.reports = [];
  state.selectedReportIds = [];
  state.provider = "rules";
  state.model = config.llm.defaultModel;
  state.followupQuestions = [];
  state.followupAnswers = [];
  state.triagePhase = "idle";
  state.lastRefinedAnswers = [];
  state.hasRun = false;
  state.lastContext = null;
  state.currentCaseId = null;
  state.lastDoctorResults = [];
  state.doctorSearchCount = 0;
  state.doctorFilters = {
    specialty: "",
    city: appointmentService.canonicalCity(extractCity(config.defaultPatient.location)),
    hospital: "",
    radiusKm: 0,
  };
  state.unlockedStages = ["members", "reports", "intake", "medicineSearch"];
  state.activePatientStage = state.workspace === "customer" ? "intake" : state.activePatientStage;
  $("#feedbackNote").value = "";
  $("#saveConsent").checked = false;
  $("#reportInput").value = "";
  renderRiskBadge();
  renderConditions();
  renderQuestions();
  renderDoctorRouting();
  renderReports();
  renderIntakeReportSelect();
  renderDoctorSearchOptions();
  renderAppointmentOptions();
  renderPersonSelect();
  setFeedbackEnabled(false);
  updateCarePath("intake", []);
  renderStepVisibility();
  setAgentStatus("Ready for a new patient case.");
}

function buildCaseRecord(rating) {
  return {
    rating,
    approvedForDataset: rating === "up" && $("#saveConsent").checked,
    note: $("#feedbackNote").value.trim(),
    provider: state.provider,
    model: state.model,
    patientContext: state.lastContext,
    extractedSymptoms: state.extracted,
    possibleConditions: state.results,
    urgent: state.urgent,
    topRoute: state.urgent.length ? "Emergency / Triage Desk" : state.results[0]?.specialty || state.results[0]?.route || "",
  };
}

function submitFeedback(rating) {
  if (!state.hasRun) {
    setAgentStatus("Run a case review before saving feedback.", "warning");
    return;
  }

  if (rating === "up" && !$("#saveConsent").checked) {
    setAgentStatus("Select the reviewed-case checkbox before saving this case.", "warning");
    return;
  }

  caseStore.add(buildCaseRecord(rating));
  renderDatasetStats();
  setAgentStatus(
    rating === "up"
      ? "Reviewed case saved on this device."
      : "Case marked for review on this device."
  );
}

function exportDataset() {
  const blob = new Blob([caseStore.exportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "axnovus-care-agent-reviewed-cases.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function clearDataset() {
  if (!confirm("Clear all locally saved feedback records? This cannot be undone.")) return;
  caseStore.clear();
  renderDatasetStats();
  setAgentStatus("Reviewed cases cleared from this device.");
}

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = $("#voiceButton");

  if (!SpeechRecognition) {
    button.disabled = true;
    button.title = "Speech input is not available in this browser";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    button.classList.add("listening");
    $("#micIcon").textContent = "Stop";
  };

  recognition.onend = () => {
    button.classList.remove("listening");
    $("#micIcon").textContent = "Mic";
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    const input = $("#symptomInput");
    input.value = `${input.value}${input.value ? " " : ""}${transcript}`;
    state.outputLanguage = detectCareLanguage(input.value);
    setAgentStatus(`Voice symptoms captured. Output language set to ${state.outputLanguage.label}. Click Run care triage when ready.`);
  };

  button.addEventListener("click", () => {
    const requested = $("#voiceLanguageSelect")?.value || "auto";
    recognition.lang = requested === "auto" ? detectCareLanguage($("#symptomInput")?.value || "").speechRecognitionLanguage : requested;
    recognition.start();
  });
}

function setupNavigation() {
  document.querySelectorAll(".patient-care-path .path-step").forEach((button) => {
    button.addEventListener("click", () => {
      showPatientStage(button.dataset.stage);
    });
  });

  document.querySelectorAll(".doctor-care-path .path-step").forEach((button) => {
    button.addEventListener("click", () => {
      showDoctorPanel(button.dataset.view);
    });
  });

  document.querySelectorAll(".receptionist-care-path .path-step").forEach((button) => {
    button.addEventListener("click", () => {
      const sharedStages = ["intake", "reports", "triage", "followup", "routing", "appointments"];
      if (sharedStages.includes(button.dataset.view)) showCareStage(button.dataset.view);
      else showReceptionPanel(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-prev-stage]").forEach((button) => {
    button.addEventListener("click", () => showCareStage(button.dataset.prevStage));
  });

  document.querySelectorAll("[data-next-stage]").forEach((button) => {
    button.addEventListener("click", () => showCareStage(button.dataset.nextStage));
  });

  document.querySelectorAll("[data-doctor-prev]").forEach((button) => {
    button.addEventListener("click", () => showDoctorPanel(button.dataset.doctorPrev));
  });

  document.querySelectorAll("[data-doctor-next]").forEach((button) => {
    button.addEventListener("click", () => showDoctorPanel(button.dataset.doctorNext));
  });
}

function initializeDefaults() {
  renderModelOptions();
  $("#ageInput").value = String(config.defaultPatient.age);
  $("#sexInput").value = config.defaultPatient.sex;
  $("#locationInput").value = config.defaultPatient.location;
  $("#llmEndpoint").value = config.llm.endpoint;
  $("#triageMode").value = config.llm.primary ? "llm" : "rules";
  renderDoctorSearchOptions();
}

function bind(selector, eventName, handler) {
  const element = $(selector);
  if (element) element.addEventListener(eventName, handler);
}

function bindLoginControls() {
  bind("#loginButton", "click", authenticate);
  bind("#openSignupButton", "click", () => showSignup(true));
  bind("#forgotPasswordButton", "click", forgotPassword);
  bind("#signupButton", "click", requestSignupVerification);
  bind("#verifySignupButton", "click", verifySignup);
  bind("#goToSigninButton", "click", goToSigninAfterVerification);
  bind("#loginPassword", "keydown", (event) => {
    if (event.key === "Enter") authenticate();
  });
}

function bootApp() {
  bindLoginControls();
  showLoggedOutView();
  try {
    initializeDefaults();
    renderChips();
    renderFamilyMembers();
    renderReceptionPatients();
    renderPersonSelect();
    renderReports();
    renderIntakeReportSelect();
    renderAppointmentOptions();
    renderDoctorQueue();
    renderPrescriptionList();
    renderMedicineOptions();
    renderPatientTreatment();
    renderMedicineSearch();
    renderDatasetStats();
    setFeedbackEnabled(false);
    setupVoice();
    setupNavigation();
    bind("#analyzeButton", "click", analyze);
    bind("#refineButton", "click", () => analyze({ refine: true }));
    bind("#startRefinementButton", "click", startRefinement);
    bind("#skipRefinementButton", "click", skipRefinement);
    bind("#clearButton", "click", clearSearch);
    bind("#searchDoctorsButton", "click", async () => {
      setDoctorFilters(getDoctorFilters());
      state.doctorSearchCount += 1;
      const panel = $("#appointmentList");
      if (panel) {
        panel.className = "stack empty-state";
        panel.textContent = "Refreshing doctor results...";
      }
      await renderAppointmentOptions();
      const filters = getDoctorFilters();
      setAgentStatus(
        filters.searchMode === "hospital"
          ? `Doctor search updated for ${filters.hospital}.`
          : `Doctor search updated${filters.city ? ` for ${filters.city}` : ""}${filters.radiusKm ? ` within ${filters.radiusKm} km` : ""}.`
      );
    });
    bind("#doctorCityInput", "change", () => {
      setDoctorFilters({ ...getDoctorFilters(), hospital: "" });
      renderDoctorSearchOptions();
    });
    bind("#doctorHospitalInput", "change", () => {
      if ($("#doctorHospitalInput").value) {
        setDoctorFilters({ ...getDoctorFilters(), radiusKm: 0 });
      }
      renderDoctorSearchOptions();
    });
    bind("#doctorRadiusInput", "change", () => {
      if (Number($("#doctorRadiusInput").value || 0) > 0 && $("#doctorHospitalInput") && state.workspace !== "receptionist") {
        $("#doctorHospitalInput").value = "";
      }
      setDoctorFilters({ ...getDoctorFilters(), hospital: "", radiusKm: Number($("#doctorRadiusInput").value || 0) });
      renderDoctorSearchOptions();
    });
    bind("#selectAllReportsButton", "click", () => setAllReportsSelected(true));
    bind("#clearSelectedReportsButton", "click", () => setAllReportsSelected(false));
    bind("#accountMenuButton", "click", () => setAccountMenu($("#accountMenu")?.classList.contains("is-hidden")));
    document.addEventListener("click", (event) => {
      if (!$("#accountMenu") || $("#accountMenu").classList.contains("is-hidden")) return;
      if (!event.target.closest(".session-switch")) setAccountMenu(false);
    });
    bind("#logoutButton", "click", logout);
    bind("#openChangePasswordButton", "click", () => {
      setAccountMenu(false);
      showChangePassword(true);
    });
    bind("#cancelChangePasswordButton", "click", () => showChangePassword(false));
    bind("#changePasswordButton", "click", changePassword);
    bind("#saveMemberButton", "click", saveFamilyMember);
    bind("#saveReceptionPatientButton", "click", saveReceptionPatient);
    bind("#casePersonSelect", "change", () => handlePersonSelectChange($("#casePersonSelect").value));
    bind("#intakePersonSelect", "change", () => handlePersonSelectChange($("#intakePersonSelect").value));
    bind("#intakeReportSelect", "change", handleIntakeReportSelection);
    bind("#reportInput", "change", handleReportUpload);
    bind("#saveDoctorInputButton", "click", saveDoctorInput);
    bind("#savePrescriptionButton", "click", savePrescription);
    bind("#searchMedicineButton", "click", renderMedicineSearch);
    bind("#medicineSearchInput", "keydown", (event) => {
      if (event.key === "Enter") renderMedicineSearch();
    });
    bind("#thumbsUpButton", "click", () => submitFeedback("up"));
    bind("#thumbsDownButton", "click", () => submitFeedback("down"));
    bind("#exportDatasetButton", "click", exportDataset);
    bind("#clearDatasetButton", "click", clearDataset);
    bind("#triageMode", "change", () => {
      if ($("#triageMode").value === "llm") {
        setAgentStatus("Full review mode selected.", "warning");
      } else {
        setAgentStatus("Limited offline review selected.");
      }
    });
    bind("#modelSelect", "change", () => {
      setAgentStatus("Assessment profile updated. Run triage to use it.");
    });
    restoreSession();
  } catch (error) {
    console.error(error);
    const loginStatus = $("#loginStatus");
    if (loginStatus) {
      loginStatus.textContent = "The workspace could not finish loading. Refresh once, then check the browser console if this repeats.";
      loginStatus.className = "agent-status warning";
    }
  }
}

bootApp();
