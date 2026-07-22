const config = window.TRIAGE_APP_CONFIG;
const authConfig = window.AUTH_CONFIG || {
  users: [
    { id: "PAT-1001", pin: "1234", role: "patient", name: "Demo Patient" },
    { id: "DOC-DEL-01", pin: "4321", role: "doctor", name: "Dr. Demo" },
  ],
  roles: {
    patient: { label: "Patient", landing: "intake" },
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
  followupQuestions: [],
  followupAnswers: [],
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
  activePatientStage: "intake",
  activeDoctorPanel: "doctor",
  unlockedStages: ["intake"],
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPatientContext() {
  return {
    symptoms: $("#symptomInput").value.trim(),
    followupAnswers: state.followupAnswers,
    age: Number($("#ageInput").value || 0),
    sex: $("#sexInput").value,
    location: $("#locationInput").value.trim(),
    languageHints: config.languageHints,
    model: $("#modelSelect").value || config.llm.defaultModel,
    reports: state.reports,
  };
}

function setAgentStatus(message, tone = "info") {
  const status = $("#agentStatus");
  if (!status) return;
  status.textContent = message;
  status.className = `agent-status ${tone === "info" ? "" : tone}`.trim();
}

function setWorkspace(workspace) {
  state.workspace = workspace;
  state.isLoggedIn = true;
  $("#loginScreen").classList.add("is-hidden");
  $("#appShell").classList.remove("is-hidden");
  document.body.classList.toggle("patient-mode", workspace === "patient");
  document.body.classList.toggle("doctor-mode", workspace === "doctor");
  document.querySelector(".patient-care-path").classList.toggle("is-hidden", workspace !== "patient");
  document.querySelector(".doctor-care-path").classList.toggle("is-hidden", workspace !== "doctor");
  $("#workspaceEyebrow").textContent = workspace === "patient" ? "Patient view" : "Doctor view";
  $("#workspaceTitle").textContent = workspace === "patient" ? "Start a patient case" : "Doctor case workspace";
  $("#sessionLabel").textContent = state.currentUser ? `${state.currentUser.name} - ${authConfig.roles[state.currentUser.role].label}` : "Signed in";
  $("#riskBadge").style.display = workspace === "patient" ? "" : "none";
  renderStepVisibility();
  showActiveRolePanel();
  if (workspace === "doctor") {
    renderDoctorQueue();
    renderPrescriptionList();
    renderMedicineOptions();
  }
}

function logout() {
  state.isLoggedIn = false;
  state.currentUser = null;
  $("#appShell").classList.add("is-hidden");
  $("#loginScreen").classList.remove("is-hidden");
  document.body.classList.remove("patient-mode", "doctor-mode");
}

function authenticate() {
  const id = $("#loginId").value.trim() || "PAT-1001";
  const pin = $("#loginPin").value.trim();
  const user = authConfig.users.find((item) => item.id.toLowerCase() === id.toLowerCase() && item.pin === pin);
  if (!user) {
    $("#loginStatus").textContent = "Invalid user ID or PIN. Try PAT-1001 / 1234 or DOC-DEL-01 / 4321.";
    $("#loginStatus").className = "agent-status warning";
    return;
  }
  state.currentUser = user;
  $("#loginStatus").textContent = "Signed in.";
  $("#loginStatus").className = "agent-status";
  setWorkspace(user.role);
  if (user.role === "patient") showPatientStage(authConfig.roles.patient.landing);
  if (user.role === "doctor") showDoctorPanel(authConfig.roles.doctor.landing);
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
  document.querySelector(`[data-stage-panel="${stage}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showDoctorPanel(panelName) {
  state.activeDoctorPanel = panelName;
  document.querySelectorAll(".doctor-panel-view").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== panelName);
  });
  document.querySelectorAll(".doctor-care-path .path-step").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === panelName);
  });
  document.querySelector(`[data-panel="${panelName}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showActiveRolePanel() {
  if (state.workspace === "patient") {
    renderStepVisibility();
  } else {
    showDoctorPanel(state.activeDoctorPanel);
  }
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

  if (!arraysMatch(state.followupQuestions, questions)) {
    state.followupAnswers = [];
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
  const cityValue = cityElement ? cityElement.value : state.doctorFilters.city || extractCity($("#locationInput")?.value);
  const hospital = hospitalElement ? hospitalElement.value : state.doctorFilters.hospital;
  const filters = {
    specialty: specialtyElement ? specialtyElement.value : state.doctorFilters.specialty || getTopRoute(),
    city: appointmentService.canonicalCity(cityValue),
    hospital,
    radiusKm: Number(radiusElement ? radiusElement.value : state.doctorFilters.radiusKm || 0),
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
  if ($("#doctorHospitalInput")) $("#doctorHospitalInput").value = state.doctorFilters.hospital || "";
  if ($("#doctorRadiusInput")) $("#doctorRadiusInput").value = String(state.doctorFilters.radiusKm || 0);
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
    const hospitals = appointmentService.listHospitals();
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
  if (!state.reports.length) {
    panel.className = "mini-list empty-state";
    panel.textContent = "No reports uploaded.";
    return;
  }

  panel.className = "mini-list stack";
  panel.innerHTML = state.reports
    .map((report) => `<div><strong>${escapeHtml(report.name)}</strong><p>${escapeHtml(report.status)} · ${Math.ceil(report.size / 1024)} KB</p></div>`)
    .join("");
}

async function handleReportUpload(event) {
  state.reports = await reportService.parseFiles(event.target.files);
  renderReports();
  setAgentStatus(`${state.reports.length} report file${state.reports.length === 1 ? "" : "s"} attached to this case.`);
}

function saveCurrentCase() {
  if (!state.hasRun) return null;
  const record = careStore.upsertCase({
    id: state.currentCaseId,
    patientContext: state.lastContext,
    reports: state.reports,
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

function renderAppointmentOptions() {
  const panel = $("#appointmentList");
  if (!panel) return;

  const filters = getDoctorFilters();
  const selectedSpecialty = filters.specialty || getTopRoute();
  const doctors = appointmentService.findDoctors(selectedSpecialty, filters);
  state.lastDoctorResults = doctors;
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
      Search #${state.doctorSearchCount}: showing ${doctors.length} doctor${doctors.length === 1 ? "" : "s"} for ${escapeHtml(selectedSpecialty)} ${escapeHtml(searchScope)}.
      <a href="${externalSearchUrl}" target="_blank" rel="noreferrer">Open external directory search</a>
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
  setAgentStatus(`Appointment booked with ${appointment.doctorName} at ${appointment.slot}.`);
}

function renderDoctorQueue() {
  const data = careStore.read();
  const panel = $("#doctorQueue");
  const appointments = data.appointments || [];
  if (!appointments.length) {
    panel.className = "stack empty-state";
    panel.textContent = "Appointments will appear here after patients book a slot.";
    return;
  }

  panel.className = "stack";
  panel.innerHTML = appointments
    .map((appointment) => {
      const caseItem = data.cases.find((item) => item.id === appointment.caseId);
      return `
        <button class="case-card ${appointment.caseId === state.selectedDoctorCaseId ? "is-selected" : ""}" type="button" data-case-id="${escapeHtml(appointment.caseId)}">
          <strong>${escapeHtml(appointment.doctorName)} · ${escapeHtml(appointment.slot)}</strong>
          <span>${escapeHtml(caseItem?.patientContext?.symptoms || "No symptoms recorded")}</span>
          <span>${escapeHtml(appointment.hospitalName)} · ${escapeHtml(appointment.department)}</span>
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
      <strong>${escapeHtml(caseItem.route)}</strong>
      <p>${escapeHtml(caseItem.patientContext?.symptoms || "")}</p>
      <p>${escapeHtml(reportService.summarize(caseItem.reports || []))}</p>
      <div class="tag-row">${(caseItem.extractedSymptoms || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
    </article>
  `;
  $("#prescriptionInput").value = "";
  renderPrescriptionList();
  renderMedicineOptions();
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
  renderMedicineOptions(text);
  renderPatientTreatment();
  setAgentStatus("Prescription saved. Medicine options updated where salt matches were found.");
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

  button.disabled = true;
  $("#refineButton").disabled = true;
  button.textContent = "Analyzing...";
  updateCarePath("triage", ["intake"]);
  setAgentStatus(refine ? "Refining triage with follow-up answers..." : "Analyzing symptoms and checking red flags...");

  const result = await engine.run(getPatientContext(), { mode: $("#triageMode").value });
  state.hasRun = true;
  state.lastContext = getPatientContext();
  state.extracted = result.extractedSymptoms;
  state.results = result.possibleConditions;
  state.urgent = result.urgent;
  state.provider = result.provider;
  state.model = $("#modelSelect").value || config.llm.defaultModel;

  renderRiskBadge();
  renderConditions();
  renderQuestions();
  renderDoctorRouting();
  setDoctorFilters({ specialty: getTopRoute(), city: appointmentService.canonicalCity(extractCity(state.lastContext.location)) });
  saveCurrentCase();
  renderAppointmentOptions();
  unlockStages(["triage", "followup", "routing", "appointments"]);

  if (state.urgent.length) {
    unlockStages(["appointments"]);
    updateCarePath("routing", ["intake", "triage"]);
  } else if (refine && state.results.length) {
    unlockStages(["appointments"]);
    updateCarePath("routing", ["intake", "triage", "followup"]);
  } else if (state.results.length) {
    if (!state.followupQuestions.length) unlockStages(["appointments"]);
    updateCarePath(state.followupQuestions.length ? "followup" : "appointments", ["intake", "triage"]);
  } else {
    updateCarePath("triage", ["intake"]);
  }

  if (state.results.length) {
    if (!state.urgent.length) setAgentStatus("Case review completed. Check possible conditions, follow-up questions, and routing.");
  } else if (!state.urgent.length) {
    setAgentStatus("No strong match yet. Add more symptom detail and run the review again.", "warning");
  }

  button.disabled = false;
  button.textContent = "Run care triage";
  $("#refineButton").disabled = !state.followupQuestions.length;
  setFeedbackEnabled(Boolean(state.results.length || state.urgent.length));
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
  state.provider = "rules";
  state.model = config.llm.defaultModel;
  state.followupQuestions = [];
  state.followupAnswers = [];
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
  state.unlockedStages = ["intake"];
  $("#feedbackNote").value = "";
  $("#saveConsent").checked = false;
  $("#reportInput").value = "";
  renderRiskBadge();
  renderConditions();
  renderQuestions();
  renderDoctorRouting();
  renderReports();
  renderDoctorSearchOptions();
  renderAppointmentOptions();
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
  recognition.lang = "hi-IN";
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
    setAgentStatus("Voice symptoms captured. Click Run care triage when ready.");
  };

  button.addEventListener("click", () => recognition.start());
}

function setupNavigation() {
  document.querySelectorAll(".patient-care-path .path-step").forEach((button) => {
    button.addEventListener("click", () => {
      showPatientStage(button.dataset.stage);
    });
  });

  document.querySelectorAll(".doctor-care-path .path-step").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".doctor-care-path .path-step").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      const target = document.querySelector(`[data-panel="${button.dataset.view}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-prev-stage]").forEach((button) => {
    button.addEventListener("click", () => showPatientStage(button.dataset.prevStage));
  });

  document.querySelectorAll("[data-next-stage]").forEach((button) => {
    button.addEventListener("click", () => showPatientStage(button.dataset.nextStage));
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
  bind("#loginPin", "keydown", (event) => {
    if (event.key === "Enter") authenticate();
  });
  document.querySelectorAll("[data-demo-login]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = button.dataset.demoLogin === "doctor" ? authConfig.users.find((item) => item.role === "doctor") : authConfig.users.find((item) => item.role === "patient");
      if (!user) return;
      $("#loginId").value = user.id;
      $("#loginPin").value = user.pin;
      authenticate();
    });
  });
}

function bootApp() {
  bindLoginControls();
  logout();
  try {
    initializeDefaults();
    renderChips();
    renderReports();
    renderAppointmentOptions();
    renderDoctorQueue();
    renderPrescriptionList();
    renderMedicineOptions();
    renderPatientTreatment();
    renderDatasetStats();
    setFeedbackEnabled(false);
    setupVoice();
    setupNavigation();
    bind("#analyzeButton", "click", analyze);
    bind("#refineButton", "click", () => analyze({ refine: true }));
    bind("#clearButton", "click", clearSearch);
    bind("#searchDoctorsButton", "click", () => {
      setDoctorFilters(getDoctorFilters());
      state.doctorSearchCount += 1;
      const panel = $("#appointmentList");
      if (panel) {
        panel.className = "stack empty-state";
        panel.textContent = "Refreshing doctor results...";
      }
      renderAppointmentOptions();
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
    bind("#logoutButton", "click", logout);
    bind("#reportInput", "change", handleReportUpload);
    bind("#saveDoctorInputButton", "click", saveDoctorInput);
    bind("#savePrescriptionButton", "click", savePrescription);
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
