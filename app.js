const config = window.TRIAGE_APP_CONFIG;
const engine = window.createTriageEngine(config, {
  getLlmEndpoint: () => $("#llmEndpoint").value.trim() || config.llm.endpoint,
  getModel: () => $("#modelSelect").value || config.llm.defaultModel,
  onStatus: setAgentStatus,
});
const caseStore = window.createCaseStore(config.feedback.storageKey, {
  minimumApprovedCases: config.feedback.minimumApprovedCasesForLocalUse,
});

const state = {
  extracted: [],
  results: [],
  urgent: [],
  provider: "rules",
  model: config.llm.defaultModel,
  followupQuestions: [],
  followupAnswers: [],
  hasRun: false,
  lastContext: null,
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
  };
}

function setAgentStatus(message, tone = "info") {
  const status = $("#agentStatus");
  status.textContent = message;
  status.className = `agent-status ${tone === "info" ? "" : tone}`.trim();
}

function renderChips() {
  $("#quickSymptoms").innerHTML = config.quickInputs
    .map((symptom) => `<button class="chip" type="button">${escapeHtml(symptom)}</button>`)
    .join("");

  document.querySelectorAll(".chip").forEach((chip) => {
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
  document.querySelectorAll(".path-step").forEach((button) => {
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

  if (state.urgent.length) {
    updateCarePath("routing", ["intake", "triage"]);
  } else if (refine && state.results.length) {
    updateCarePath("routing", ["intake", "triage", "followup"]);
  } else if (state.results.length) {
    updateCarePath("followup", ["intake", "triage"]);
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
  state.provider = "rules";
  state.model = config.llm.defaultModel;
  state.followupQuestions = [];
  state.followupAnswers = [];
  state.hasRun = false;
  state.lastContext = null;
  $("#feedbackNote").value = "";
  $("#saveConsent").checked = false;
  renderRiskBadge();
  renderConditions();
  renderQuestions();
  renderDoctorRouting();
  setFeedbackEnabled(false);
  updateCarePath("intake", []);
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
  document.querySelectorAll(".path-step").forEach((button) => {
    button.addEventListener("click", () => {
      const completed = Array.from(document.querySelectorAll(".path-step.is-complete")).map((item) => item.dataset.stage);
      updateCarePath(button.dataset.stage, completed);
      const target = document.querySelector(`[data-panel="${button.dataset.view}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initializeDefaults() {
  renderModelOptions();
  $("#ageInput").value = String(config.defaultPatient.age);
  $("#sexInput").value = config.defaultPatient.sex;
  $("#locationInput").value = config.defaultPatient.location;
  $("#llmEndpoint").value = config.llm.endpoint;
  $("#triageMode").value = config.llm.primary ? "llm" : "rules";
}

initializeDefaults();
renderChips();
renderDatasetStats();
setFeedbackEnabled(false);
setupVoice();
setupNavigation();
$("#analyzeButton").addEventListener("click", analyze);
$("#refineButton").addEventListener("click", () => analyze({ refine: true }));
$("#clearButton").addEventListener("click", clearSearch);
$("#thumbsUpButton").addEventListener("click", () => submitFeedback("up"));
$("#thumbsDownButton").addEventListener("click", () => submitFeedback("down"));
$("#exportDatasetButton").addEventListener("click", exportDataset);
$("#clearDatasetButton").addEventListener("click", clearDataset);
$("#triageMode").addEventListener("change", () => {
  if ($("#triageMode").value === "llm") {
    setAgentStatus("Full review mode selected.", "warning");
  } else {
    setAgentStatus("Limited offline review selected.");
  }
});
$("#modelSelect").addEventListener("change", () => {
  setAgentStatus(`Assessment profile updated. Run triage to use it.`);
});
