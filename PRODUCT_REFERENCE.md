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
- Safety: emergency red flags, contraindications, pregnancy, pediatric, elderly, and chronic disease escalation.
- Reasoning: model-backed triage with structured outputs and medically reviewed guardrails.
- Follow-up: targeted question planner and answer memory.
- Routing: department, doctor, emergency desk, appointment slot, and handoff notes.
- Governance: consent, DPDP-aligned data handling, ABDM readiness, audit logs, and clinical review workflow.
