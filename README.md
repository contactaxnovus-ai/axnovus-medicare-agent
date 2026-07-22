# Axnovus Care Agent

A static prototype for an India-context healthcare AI agent that accepts symptom text or Hindi speech, generates possible conditions, asks follow-up questions, and recommends hospital specialists.

## What is included

- Axnovus-aligned product framing: agentic workflow, SaaS-ready layout, operational UI.
- Hindi voice input through the browser Web Speech API using `hi-IN`.
- Config-driven symptoms, follow-up questions, condition rules, emergency rules, and doctor routing in `config/healthcare.config.js`.
- Extended clinical seed pack in `config/clinical-seed.config.js` with 50 additional OPD-oriented triage/routing records and expanded symptom aliases.
- Extended medicine seed pack in `config/medicine-seed.config.js` with additional salt/brand options for demo price comparison.
- Configurable hospital/doctor directory in `config/hospitals.config.js` with city, hospital, specialty, radius, language, fee, rating, and slot metadata.
- Generic triage matching, LLM-primary provider logic, and local fallback in `js/triage-engine.js`.
- UI-only orchestration in `app.js`.
- Browser-local feedback dataset storage in `js/case-store.js`.
- Patient-case workspace storage in `js/care-data-store.js`.
- Report upload parsing in `js/report-service.js`.
- Hospital doctor/slot matching in `js/appointment-service.js`.
- Prescription salt matching and medicine options in `js/medicine-service.js`.
- Internal implementation and safety notes in `PRODUCT_REFERENCE.md`.

## File structure

```text
config/healthcare.config.js   Symptoms, aliases, diseases, doctors, questions, red flags, checklist
config/clinical-seed.config.js Additional triage/routing seed records and symptom aliases
config/hospitals.config.js    Hospital, city, doctor, specialty, radius-search seed directory
config/medicines.config.js    Base medicine salt catalog
config/medicine-seed.config.js Extended medicine salt/brand demo catalog
js/triage-engine.js           Generic matching, scoring, LLM provider, red-flag merge
js/case-store.js              Browser-local thumbs-up/down dataset storage
js/care-data-store.js         Patient cases, appointments, doctor notes, prescriptions
js/report-service.js          Patient report upload parsing
js/appointment-service.js     Hospital, doctor, and slot matching
js/medicine-service.js        Salt composition matching and price options
app.js                        UI event handling, rendering, clear/refine workflow
server.example.js             Optional backend for OpenAI LLM triage
PRODUCT_REFERENCE.md          Internal safety, compliance, and implementation notes
index.html                    Static page shell
styles.css                    Visual design
```

To change healthcare content, edit `config/healthcare.config.js`. The code component does not need changes for normal additions like a new symptom alias, disease rule, specialist, or follow-up question.

## How to run

For easiest testing, open the local URL:

```text
http://localhost:4173/index.html
```

## Run With Docker

Build the image:

```powershell
docker build -t axnovus-care-agent .
```

Run the container without an OpenAI key. The UI will load, and triage falls back to local rules when the review endpoint cannot call the model:

```powershell
docker run --name axnovus-care-agent --rm -p 4174:4173 axnovus-care-agent
```

Open:

```text
http://localhost:4174/index.html
```

Run with an OpenAI key:

```powershell
$env:OPENAI_API_KEY="your_api_key"
docker run --name axnovus-care-agent --rm -p 4174:4173 -e OPENAI_API_KEY=$env:OPENAI_API_KEY axnovus-care-agent
```

Using Docker Compose:

```powershell
$env:OPENAI_API_KEY="your_api_key"
docker compose up --build
```

Compose serves the app at:

```text
http://localhost:4174/index.html
```

Type symptoms and patient details, click `Run care triage`, then read the three result areas:

1. `Possible conditions`
2. `Doctor routing`
3. `Follow-up questions`

Additional modules now cover:

1. Patient report upload during intake.
2. Doctor and appointment slot booking after triage.
3. Separate Doctor view for case review, notes, additional questions, and report requests.
4. Prescription text/file capture after the physical visit.
5. Salt-based medicine option and price comparison from the saved prescription text.

The UI is split into two workspaces:

1. `Patient view`: intake, triage, follow-up, routing, booking, and case review.
2. `Doctor view`: patient queue, case details, doctor notes, prescription capture, and medicine options.

Patient steps unlock in sequence so users are guided through the flow instead of seeing every panel at once.

The booking step includes specialist doctor search by specialty, city, hospital name, and nearby radius. Hospital search and nearby-radius search are treated as separate modes: if a hospital is selected, the app searches that hospital; if no hospital is selected, the app uses city/radius. The current implementation uses the configurable local hospital directory and exposes an external directory-search link. For production, replace the local provider with a hospital appointment API, a verified doctor-directory API, Google Maps Places/Distance Matrix APIs for facility discovery and distance calculation, or a compliant scraping-backed backend service after legal review. Do not scrape hospital/doctor websites directly from browser JavaScript because it is brittle, often blocked by CORS, and may violate site terms.

The app does not analyze while you type or after voice capture. After the first result, answer the follow-up question boxes and click `Refine with answers` to narrow the triage. Use `New case` to reset the current case and start a new search.

The left side is a care path, not a settings menu:

1. `Intake`: enter symptoms and patient details.
2. `Triage`: review possible conditions.
3. `Follow-up`: answer narrowing questions.
4. `Routing`: send the case to a specialist or emergency desk.

For Hindi speech input, Chrome or Edge usually gives the best Web Speech API support.

The default triage mode is `LLM primary + safety rules`. The UI calls `POST /api/triage` with the selected model. If that endpoint is not available, the app falls back to local config rules.

To try the LLM-backed flow, use the example server:

```powershell
$env:OPENAI_API_KEY="your_api_key"
node server.example.js
```

The model is configurable:

```powershell
$env:OPENAI_MODEL="your_preferred_model"
node server.example.js
```

You can also select an allowed model from the UI. Model options are configured in `config/healthcare.config.js`.

## Feedback dataset

After a result appears, use:

1. `Thumbs up`: saves an approved case only when the local dataset checkbox is ticked.
2. `Thumbs down`: saves a rejected review case for quality analysis, not direct reuse.
3. `Export`: downloads the local dataset as JSON.
4. `Clear data`: removes locally stored feedback records.

The browser-local store is a preparation layer, not a production medical database. Before using approved cases for retrieval, fine-tuning, or decision support, they should be de-identified, clinician-reviewed, versioned, and audited.

## LLM backend contract

Do not call a commercial LLM directly from browser JavaScript because it exposes API keys and sends sensitive health text from the client. Put the model behind a backend endpoint such as `/api/triage`.

Expected request:

```json
{
  "task": "india_healthcare_symptom_triage",
  "safetyInstruction": "Return possible conditions, follow-up questions, red flags, and specialist routing. Do not diagnose, prescribe, or replace a clinician.",
  "context": {
    "symptoms": "3 days fever, cough, body pain",
    "age": 32,
    "sex": "Male",
    "location": "Delhi, India",
    "languageHints": ["en-IN", "hi-IN"]
  }
}
```

Expected response:

```json
{
  "extractedSymptoms": ["fever", "cough", "body ache"],
  "possibleConditions": [
    {
      "name": "Viral upper respiratory infection",
      "specialty": "General Physician / Internal Medicine",
      "score": 72,
      "hits": ["fever", "cough", "body ache"],
      "questions": ["How high was the fever?", "Any breathing difficulty?"],
      "nextStep": "Book OPD physician review if symptoms persist or worsen."
    }
  ],
  "urgent": []
}
```

Recommended model prompt:

```text
You are a healthcare triage assistant for Indian hospital OPD workflows. You do not diagnose or prescribe. You infer possible conditions from symptoms in English, Hindi, Hinglish, and transliterated Hindi. First identify emergency red flags. Then return 3-5 possible conditions, targeted follow-up questions, and the best hospital specialist. Keep advice conservative and require clinician review.
```

The example server uses OpenAI's Responses API with Structured Outputs so the model response follows a JSON schema instead of returning free-form text. See the official OpenAI docs for [Responses](https://platform.openai.com/docs/api-reference/responses) and [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs).

## Suggested production architecture

1. Intake component: text, Hindi/English voice, language detection, transliteration, demographic context.
2. Safety component: emergency red flags, contraindications, pediatric/pregnancy/elderly escalation.
3. Clinical reasoning component: LLM triage over reviewed medical knowledge base, symptom ontology, disease likelihood ranking, confidence thresholds.
4. Conversation component: follow-up question planner, answer memory, hallucination guardrails, doctor handoff.
5. Routing component: hospital departments, doctor schedules, insurance/PM-JAY support, location-aware appointment booking.
6. Compliance component: consent, DPDP controls, ABDM/ABHA integration, audit logs, retention, deletion, and role-based access.

## Important limitation

This prototype is not a medical device and must not be used for diagnosis or treatment without qualified clinical review.

The expanded seed records are realistic demo records for triage/routing and medicine salt matching. Medicine prices are illustrative and must be replaced by a licensed pharmacy/pricing API before customer or patient use.
