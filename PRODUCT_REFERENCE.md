# Axnovus Care Agent Reference Notes

These notes are for internal review and implementation planning. They should not be shown on the customer-facing demo screen.

## Clinical Safety

- Use a medically reviewed clinical knowledge base with versioning, audit trails, and doctor sign-off.
- Keep deterministic emergency red-flag detection outside the model response.
- Never prescribe medicines automatically.
- Route severe symptoms to emergency triage before normal OPD routing.
- Require clinician review for final diagnosis, prescriptions, investigations, and treatment plans.

## India Context

- Support English, Hindi, Hinglish, and transliterated Hindi.
- Consider common Indian OPD presentations such as fever, dengue-like illness, gastroenteritis, respiratory infection, UTI, diabetes-related symptoms, and pregnancy-related risk.
- Keep hospital routing configurable by department, doctor availability, location, and care level.
- Support ABDM/ABHA integration only with explicit patient consent.

## Data And Privacy

- Collect only the minimum patient data needed for triage.
- Add consent, retention, deletion, and access-control policies before production use.
- Keep audit logs for case review, model output, clinician override, and feedback.
- De-identify cases before using them for evaluation, retrieval, or model improvement.

## Feedback Dataset

- Treat thumbs-up cases as candidate reviewed examples, not medical truth.
- Keep thumbs-down cases for quality review and error analysis.
- Require a minimum number of approved cases before considering local retrieval or offline evaluation.
- Add clinician review status, reviewer identity, timestamps, source hospital, and version information before production use.

## Recommended Production Components

- Intake: symptom text, Hindi voice, demographic context, and language handling.
- Reports: OCR/document parsing, lab-value extraction, abnormal-range flagging, and source verification.
- Safety: emergency red flags, contraindications, pregnancy, pediatric, elderly, and chronic disease escalation.
- Reasoning: model-backed triage with structured outputs and medically reviewed guardrails.
- Follow-up: targeted question planner and answer memory.
- Routing: department, doctor, emergency desk, appointment slot, and handoff notes.
- Doctor search: city, hospital, specialty, fee, language, slot, and vicinity search through a verified hospital/directory provider.
- Doctor workspace: queue, case review, additional report requests, prescription capture, and audit trail.
- Pharmacy layer: prescription parsing, salt mapping, branded/generic alternatives, availability, and price source validation.
- Governance: consent, DPDP-aligned data handling, ABDM readiness, audit logs, and clinical review workflow.

## Suggested Next Improvements

- Add authenticated patient, doctor, and admin roles.
- Separate patient and doctor applications at routing/deployment level, not only in the client UI.
- Add role-based access control, session expiry, MFA for doctors, and audit logs for every case access.
- Replace browser-local storage with a secure backend database.
- Add OCR for PDF/image reports and prescriptions.
- Integrate hospital HIS/EMR appointment APIs instead of static slots.
- For open-market facility discovery, prefer Google Maps Platform Places API and Distance Matrix/Routing APIs, Practo-like verified partner feeds, or hospital network APIs before considering scraping.
- Integrate a verified pharmacy pricing and inventory API.
- Keep web scraping behind a backend adapter only after legal/terms review; never scrape hospital or doctor websites from browser JavaScript.
- Add clinician approval before any internally learned case affects triage.
- Add analytics for missed red flags, low-confidence cases, and doctor overrides.
- Add consent screens for report upload, prescription storage, case learning, and pharmacy price comparison.
- Add data retention, deletion, and patient data export flows.

## Seed Data Notes

- `config/clinical-seed.config.js` adds realistic OPD-oriented routing records aligned to common ICMR Standard Treatment Workflow topic coverage. These records are for triage support and routing demos, not diagnosis or treatment.
- `config/medicine-seed.config.js` adds medicine salt/brand examples for prescription matching demos. Prices are illustrative and must be replaced by a licensed pricing/inventory source before production.
- `config/hospitals.config.js` is a local configurable doctor directory. Treat it as seed/demo data until verified with hospital contracts or an authoritative provider.
