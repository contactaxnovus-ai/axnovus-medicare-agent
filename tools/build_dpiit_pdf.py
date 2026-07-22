from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "docs" / "Axnovus_Care_Agent_DPIIT_Startup_India_Investor_Document.pdf"

NAVY = colors.HexColor("#0B2545")
BLUE = colors.HexColor("#2E74B5")
CYAN = colors.HexColor("#00A7C8")
MUTED = colors.HexColor("#5A6778")
LIGHT = colors.HexColor("#F4F6F9")
LIGHT_BLUE = colors.HexColor("#E8EEF5")
LIGHT_CYAN = colors.HexColor("#EAF8FB")
BORDER = colors.HexColor("#D8DEE8")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle("CoverBrand", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=NAVY, alignment=TA_CENTER, spaceAfter=6))
styles.add(ParagraphStyle("CoverTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=25, leading=30, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4))
styles.add(ParagraphStyle("CoverSub", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=BLUE, alignment=TA_CENTER, spaceAfter=4))
styles.add(ParagraphStyle("CoverBody", parent=styles["Normal"], fontName="Helvetica", fontSize=10.5, leading=14, alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle("H1Custom", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=17, leading=22, textColor=BLUE, spaceBefore=0, spaceAfter=10))
styles.add(ParagraphStyle("H2Custom", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=BLUE, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle("BodyCustom", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.2, leading=13.5, spaceAfter=7))
styles.add(ParagraphStyle("Small", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.8, leading=11.5, spaceAfter=3))
styles.add(ParagraphStyle("Muted", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=9.5, leading=12, textColor=MUTED, spaceAfter=8))
styles.add(ParagraphStyle("TableText", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.6, leading=10.8))
styles.add(ParagraphStyle("TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.8, leading=11, textColor=NAVY))
styles.add(ParagraphStyle("CalloutLabel", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=NAVY, spaceAfter=3))
styles.add(ParagraphStyle("CalloutText", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=12, spaceAfter=0))


def p(text, style="BodyCustom"):
    return Paragraph(text, styles[style])


def h1(text):
    return Paragraph(text, styles["H1Custom"])


def h2(text):
    return Paragraph(text, styles["H2Custom"])


def bullet(items):
    rows = []
    for item in items:
        rows.append([Paragraph("-", styles["BodyCustom"]), Paragraph(item, styles["BodyCustom"])])
    t = Table(rows, colWidths=[0.18 * inch, 6.22 * inch], hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    return KeepTogether([t, Spacer(1, 5)])


def table(data, widths, header=True):
    body = []
    for row in data:
        body.append([Paragraph(str(cell), styles["TableHead" if header and len(body) == 0 else "TableText"]) for cell in row])
    t = Table(body, colWidths=widths, hAlign="CENTER", repeatRows=1 if header else 0)
    ts = [
        ("GRID", (0, 0), (-1, -1), 0.45, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        ts += [("BACKGROUND", (0, 0), (-1, 0), LIGHT_BLUE), ("TEXTCOLOR", (0, 0), (-1, 0), NAVY)]
    t.setStyle(TableStyle(ts))
    return KeepTogether([t, Spacer(1, 8)])


def kv(rows):
    return table([("Field", "Details")] + rows, [1.55 * inch, 4.95 * inch], header=True)


def callout(label, text, fill=LIGHT_CYAN):
    t = Table(
        [[Paragraph(label, styles["CalloutLabel"])], [Paragraph(text, styles["CalloutText"])]],
        colWidths=[6.5 * inch],
        hAlign="CENTER",
    )
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.6, CYAN),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return KeepTogether([t, Spacer(1, 8)])


def page(title, elements):
    return [PageBreak(), h1(title), *elements]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(inch, 10.42 * inch, "AXNOVUS | Healthcare AI Agent DPIIT Recognition Support Document")
    canvas.setStrokeColor(BORDER)
    canvas.line(inch, 10.34 * inch, 7.5 * inch, 10.34 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(4.25 * inch, 0.45 * inch, f"Prepared for Startup India DPIIT recognition and investor diligence | Page {doc.page}")
    canvas.restoreState()


def build():
    story = []
    story += [
        Spacer(1, 0.2 * inch),
        p("AXNOVUS", "CoverBrand"),
        p("AI Agents and Intelligent Products", "Muted"),
        Spacer(1, 0.7 * inch),
        p("Axnovus Care Agent", "CoverTitle"),
        p("DPIIT Startup India Recognition", "CoverSub"),
        p("Support Document and Investor Brief", "CoverSub"),
        Spacer(1, 0.18 * inch),
        p("A concise, submission-ready business and innovation narrative for an India-context healthcare AI triage, routing, appointment, doctor-workflow, and prescription-support platform.", "CoverBody"),
        Table([[""]], colWidths=[6.5 * inch], rowHeights=[2], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), CYAN)])),
        Spacer(1, 0.2 * inch),
        kv([
            ("Purpose", "Position Axnovus Care Agent as an innovation-led, scalable healthcare SaaS/AI startup with employment, wealth creation, and public-health value."),
            ("Use", "Attach with Startup India application materials and share as a first-pass investor, accelerator, grant, or hospital-partnership overview after legal and financial facts are updated."),
            ("Version", "Founder review draft | June 2026"),
            ("Confidentiality", "Private and confidential business document"),
        ]),
    ]

    story += page("Executive Recognition Snapshot", [
        p("Axnovus Care Agent is proposed as an AI-enabled healthcare coordination platform for Indian hospital OPD and care-navigation workflows. It accepts symptoms through typed text or Hindi speech, considers patient context and uploaded reports, generates possible conditions with targeted follow-up questions, routes patients to appropriate hospital specialists, supports appointment booking, and gives doctors a structured workspace for case review, additional report requests, prescriptions, and medicine option comparison based on salt composition."),
        callout("DPIIT fit", "The venture is software-led, AI-enabled, modular, scalable across hospitals and clinics, and capable of creating skilled jobs in product, healthcare operations, clinical review, customer success, integrations, and hospital partnerships."),
        h2("Recognition logic"),
        bullet([
            "Innovation: multilingual intake, LLM-primary triage, emergency guardrails, report-aware reasoning, dynamic follow-up, specialist routing, doctor handoff, and local case learning.",
            "Scalability: deployable as a hospital website widget, clinic OPD assistant, enterprise hospital module, insurance/care-navigation layer, or standalone workflow.",
            "Employment potential: direct roles in engineering, clinical operations, implementation, support, data governance, model evaluation, and hospital success.",
            "Wealth creation: subscription SaaS, hospital licensing, integration fees, analytics, marketplace/referral workflows, and clinical operations services.",
            "Public value: earlier care navigation, reduced front-desk ambiguity, Indian-language access, and structured digital handoffs for doctors.",
        ]),
        h2("Founder action before submission"),
        bullet([
            "Replace bracketed legal fields with entity name, incorporation date, CIN/LLPIN, registered office, PAN, GST, founder details, and shareholding where required.",
            "Attach incorporation certificate, PAN, authorization letter, product screenshots, demo link, architecture note, founder profiles, and pilot/customer evidence.",
            "Confirm current DPIIT recognition criteria on the official Startup India portal before upload.",
        ]),
    ])

    story += page("Startup Identity and Eligibility", [
        kv([
            ("Startup / Brand", "Axnovus Care Agent by AxNovus / [Legal entity name to be inserted]"),
            ("Registered entity", "[Private Limited Company / LLP / Registered Partnership / eligible entity category as applicable]"),
            ("Incorporation details", "[Date], [CIN/LLPIN/Registration number], [Registered office address]"),
            ("Founders / directors", "[Founder names], [roles], [relevant healthcare/AI/business experience]"),
            ("Sector classification", "HealthTech, AI/SaaS, hospital workflow automation, digital health, care navigation, clinical operations intelligence"),
            ("Recognition objective", "DPIIT recognition for innovation, scalability, employment generation, and wealth creation potential"),
        ]),
        h2("Eligibility assertions to include"),
        bullet([
            "Applicant entity is incorporated in India and is within the applicable Startup India recognition period from incorporation.",
            "The entity has not exceeded the applicable annual turnover threshold under current Startup India eligibility rules.",
            "The entity has not been formed by splitting up or reconstructing an existing business.",
            "The startup is working toward innovation, development, deployment, or commercialization of a scalable product/process/service.",
            "Healthcare claims, customers, pilots, certifications, and clinical review statements must be limited to facts supported by evidence.",
        ]),
        callout("Compliance note", "This support document is not legal advice. DPIIT criteria and healthcare/data obligations should be verified against the official Startup India portal and professional advisors before filing.", LIGHT),
    ])

    story += page("Problem and Market Need", [
        p("India's healthcare access problem is not only doctor availability. A major operational gap exists before the doctor sees the patient: symptoms are described in mixed language, patients do not know the right department, front desks make routing decisions with limited context, reports are not always considered early, and doctors receive inconsistent case histories."),
        h2("Pain points"),
        bullet([
            "Unstructured intake: symptoms arrive as English, Hindi, Hinglish, abbreviations, voice notes, report files, or incomplete descriptions.",
            "Static triage tools: fixed rules and generic questions often ask the same follow-up questions for very different cases.",
            "Poor routing: patients often choose the wrong OPD department, causing delays, extra cost, and lower satisfaction.",
            "Doctor handoff gap: physicians need symptoms, duration, red flags, reports, and prior answers in one compact view.",
            "No learning loop: doctor corrections, prescriptions, report requests, and outcomes are rarely captured as structured improvement data.",
            "Trust and safety risk: healthcare AI must be conservative, auditable, consent-aware, and clinically reviewed.",
        ]),
        h2("Why now"),
        bullet([
            "Hospitals and clinics are digitizing OPD, appointment, teleconsult, and patient engagement workflows.",
            "LLMs and structured-output APIs make broader symptom interpretation possible when wrapped with safety guardrails.",
            "Patients increasingly expect self-service booking, report upload, prescription access, and medicine-price transparency.",
            "Hospitals need workflow automation that augments doctors and staff rather than adding another disconnected chatbot.",
        ]),
    ])

    story += page("Axnovus Care Agent Solution", [
        p("Axnovus Care Agent is designed as a configurable healthcare AI workflow layer, not a single static triage page. The product starts with patient intake and triage, then extends into doctor review, appointment booking, treatment capture, prescription upload, and medicine option comparison."),
        table([
            ("Module", "What it does", "Customer value"),
            ("Patient intake", "Typed symptoms, Hindi speech input, patient details, report upload, consent-ready case creation.", "Faster self-service intake with local language support."),
            ("AI triage", "LLM-primary symptom analysis, possible conditions, emergency red flags, targeted follow-up questions.", "Broader coverage than static rules while retaining safety limits."),
            ("Routing and booking", "Maps likely condition and urgency to specialist, hospital, doctor, and slot options.", "Reduces misrouting and converts triage into an appointment."),
            ("Doctor workspace", "Shows booked patients, symptoms, follow-up answers, reports, AI summary, and doctor input fields.", "Improves consultation readiness and continuity."),
            ("Treatment and prescription", "Stores doctor notes, additional report requests, prescriptions, and patient-facing treatment details.", "Creates one structured case record after the physical visit."),
        ], [1.25 * inch, 3.0 * inch, 2.25 * inch]),
        h2("Current prototype evidence"),
        bullet([
            "Docker-runnable prototype with patient and doctor login paths.",
            "Hindi speech input through browser speech recognition where supported.",
            "Configurable LLM model selection with local-rule fallback.",
            "Report upload parsing, appointment matching, prescription capture, and salt-based medicine matching modules.",
            "Browser-local feedback dataset preparation using thumbs-up/down review signals.",
        ]),
    ])

    story += page("Innovation and Differentiation", [
        p("The innovation is not that the product asks symptoms. The differentiator is the full care-navigation loop: multilingual intake, model-backed reasoning, clinician-safe boundaries, interactive follow-up, specialist routing, appointment conversion, doctor review, prescription capture, and feedback learning."),
        table([
            ("Differentiator", "Why it matters", "Defensibility"),
            ("LLM-primary triage", "Covers broader symptom combinations than deterministic rules, especially mixed-language descriptions.", "Prompts, structured outputs, clinical review sets, and local case datasets improve over time."),
            ("Report-aware reasoning", "Uploaded reports can influence triage context instead of being ignored until consultation.", "OCR, lab extraction, abnormal-range logic, and report summaries become domain assets."),
            ("Doctor feedback loop", "Doctors can add follow-up questions, report requests, prescriptions, and corrections.", "Clinician-reviewed repository can support retrieval and offline fallback after sufficient volume."),
            ("Configurable modules", "Symptoms, doctors, hospitals, medicines, models, and routing can be swapped by deployment.", "Reusable components reduce implementation cost across customers."),
            ("Safety-by-design", "Emergency red flags, non-diagnosis positioning, audit trails, consent, and review workflows.", "Trust and compliance can become a sales advantage in healthcare."),
        ], [1.55 * inch, 2.55 * inch, 2.4 * inch]),
        callout("Critical positioning", "Present the product as a triage and care-routing assistant, not an autonomous diagnostic system. Reviewers will trust a credible governed workflow more than exaggerated medical-AI claims."),
    ])

    story += page("Technology Architecture", [
        p("The architecture should be presented as a staged system so evaluators can see current feasibility and long-term product depth. The current prototype is modular: configuration files hold clinical/routing content, service files handle domain functions, and UI orchestration is separate from reusable engines."),
        kv([
            ("Input layer", "Symptom text, Hindi/Hinglish speech, demographics, uploaded reports, patient consent, and prior case context."),
            ("Reasoning layer", "LLM structured outputs, local safety rules, configurable disease/routing knowledge base, follow-up planner, confidence handling."),
            ("Workflow layer", "Patient stages, appointment booking, doctor queue, notes, report requests, prescription capture, medicine comparison, feedback."),
            ("Data layer", "Secure backend in production, audit logs, de-identified training/evaluation sets, versioned prompts, clinical review status."),
            ("Integration layer", "Hospital HIS/EMR, appointment APIs, ABDM/ABHA where appropriate, pharmacy pricing APIs, OCR/lab extraction, notifications."),
            ("Trust layer", "Role access, consent, retention/deletion policy, DPDP-aligned privacy controls, clinician review, model monitoring."),
        ]),
        h2("Development roadmap"),
        bullet([
            "MVP: login, intake, triage, follow-up, routing, appointment booking, report upload, doctor notes, prescriptions, and medicine options.",
            "Pilot: secure backend, role-based access, audit logs, OCR extraction, hospital-specific configuration, clinician-reviewed prompts, pilot analytics.",
            "Scale: hospital integrations, doctor availability APIs, ABDM-readiness, pharmacy integrations, clinician feedback loops, offline fallback.",
        ]),
    ])

    story += page("Clinical Safety, Compliance, and Governance", [
        p("Healthcare AI requires a stronger governance story than ordinary SaaS. The safest commercialization path is to define the product as a support and routing layer under hospital governance, with doctors retaining responsibility for diagnosis, investigations, prescriptions, and treatment."),
        table([
            ("Risk", "Mitigation to build", "Investor/DPIIT implication"),
            ("Misdiagnosis or overclaiming", "Use non-diagnostic language, emergency escalation, confidence limits, and doctor confirmation.", "Shows responsible innovation rather than reckless automation."),
            ("Sensitive health data", "Consent, encryption, access controls, retention policy, deletion/export, and DPDP-aligned processing.", "Improves hospital trust and enterprise readiness."),
            ("Model hallucination", "Structured outputs, red-flag rules outside the model, clinical prompt review, fallback, and doctor feedback.", "Creates a credible AI governance moat."),
            ("Unsafe prescriptions", "Never generate prescriptions for patients; only store doctor-entered prescription content.", "Keeps accountability with licensed professionals."),
            ("Dataset misuse", "Use approved cases only after de-identification, clinician review, versioning, and quality thresholds.", "Prepares for scalable local knowledge while protecting patients."),
        ], [1.45 * inch, 3.15 * inch, 1.9 * inch]),
        h2("Production readiness items"),
        bullet([
            "Replace browser-local storage with secure backend persistence.",
            "Add session expiry, MFA for doctors/admins, authorization by role, and audit logs for every case access.",
            "Add consent screens for report upload, case learning, prescription storage, and pharmacy comparison.",
            "Add OCR and structured lab-value extraction with abnormal-range flagging and source verification.",
            "Document clinical review SOPs, model evaluation metrics, escalation policy, and incident response.",
        ]),
    ])

    story += page("Market, Customers, and Go-To-Market", [
        h2("Primary customer segments"),
        bullet([
            "Mid-size hospitals and specialty clinics seeking OPD intake automation and better patient routing.",
            "Hospital chains wanting configurable digital front-door workflows across multiple locations.",
            "Telemedicine, insurance, and care-navigation providers needing multilingual triage and doctor handoff.",
            "Corporate health programs and clinics managing employee care, reports, appointments, and follow-up.",
            "Government, NGO, and public-health pilots focused on accessible language support and early care navigation.",
        ]),
        h2("GTM motion"),
        bullet([
            "Start with 2-3 hospital/clinic pilots in high-volume OPD categories such as fever, respiratory, gastro, UTI, diabetes, and general medicine.",
            "Sell as a digital front-door module: intake, routing, booking, and doctor handoff, not as a standalone chatbot.",
            "Use hospital-branded deployment widgets and configurable departments/doctors to reduce integration friction.",
            "Measure reduced misrouting, shorter intake time, better report availability, more complete doctor notes, and appointment conversion.",
            "Convert pilots into annual SaaS contracts with setup fees, support fees, and integration expansion.",
        ]),
        h2("Expansion thesis"),
        bullet([
            "Department-specific assistants: dermatology, pediatrics, gynecology, pulmonology, diabetes, emergency pre-triage, and chronic care.",
            "ABDM-ready patient record and consent integrations where hospital strategy supports it.",
            "Doctor-side workflow intelligence: recommended reports, repeated case patterns, missed follow-up detection, and patient education.",
            "Marketplace/API potential for verified pharmacy pricing, diagnostics, second opinions, and care packages.",
        ]),
    ])

    story += page("Business Model and Funding Case", [
        h2("Revenue model"),
        bullet([
            "SaaS subscription per hospital, clinic, location, doctor group, or monthly patient-intake volume.",
            "Implementation and configuration fees for hospital-specific departments, doctors, slots, language, and workflows.",
            "Integration revenue for HIS/EMR, appointment, ABDM, OCR, pharmacy, diagnostics, and notification systems.",
            "Usage-based AI review charges where hospitals choose LLM-backed triage rather than rules-only flows.",
            "Analytics dashboards for hospital operations, case completion, routing quality, and care-navigation metrics.",
            "Partner/referral revenue only where legally compliant, transparent, and clinically appropriate.",
        ]),
        kv([
            ("Suggested round", "[Pre-seed / seed amount to be inserted after founder review]"),
            ("Use of funds", "Secure backend, clinician review, OCR/report parsing, model evaluation, hospital integrations, pilot deployments, sales, compliance, and customer success."),
            ("Milestones", "Complete MVP, launch pilots, validate safety metrics, convert paid customers, build hospital integration playbook, and create governance evidence."),
            ("Investor thesis", "Large healthcare navigation need, AI workflow wedge, recurring SaaS model, doctor feedback data asset, and India-language access value."),
        ]),
    ])

    story += page("Traction Evidence and Metrics", [
        p("DPIIT and investors respond well to evidence, but healthcare evidence must be precise. If pilots are early, present product execution and signed intent honestly instead of overstating clinical validation."),
        h2("Evidence to attach or reference"),
        bullet([
            "[ ] Product screenshots showing patient intake, triage, follow-up, booking, doctor queue, prescription, and medicine options.",
            "[ ] Docker/demo link or screen recording of the product flow.",
            "[ ] Architecture note showing modular configuration, backend plan, data model, LLM safety wrapper, and audit trail plan.",
            "[ ] Pilot LOIs, clinic/hospital interest emails, partner discussions, or signed proof-of-concept scope.",
            "[ ] Clinical advisor/doctor review notes for triage guardrails, red flags, and follow-up question quality.",
            "[ ] Founder profiles, technical roadmap, source-code repository evidence, and development timeline.",
        ]),
        table([
            ("Category", "Metrics to track"),
            ("Product usage", "Cases created, triage runs, completed follow-ups, report uploads, appointments booked, doctor case views."),
            ("Operational value", "Intake time saved, routing correction rate, no-show reduction, consultation readiness, doctor note completeness."),
            ("Safety quality", "Red-flag recall, model fallback rate, low-confidence cases, doctor override rate, hallucination incidents, complaint rate."),
            ("Commercial", "Pilot conversion, ACV, setup cost, gross margin, support tickets, integration time, churn risk, expansion revenue."),
            ("Learning loop", "Clinician-approved cases, rejected cases, specialty coverage, report extraction accuracy, prompt/model version performance."),
        ], [1.55 * inch, 4.95 * inch]),
    ])

    story += page("Impact, Jobs, and Wealth Creation", [
        h2("Employment generation potential"),
        bullet([
            "Product and engineering roles for SaaS, AI workflows, backend systems, security, integrations, speech/OCR, and analytics.",
            "Clinical operations roles for doctor review coordination, prompt validation, safety monitoring, and healthcare content governance.",
            "Implementation and customer success roles for hospital onboarding, department configuration, staff training, and pilot support.",
            "Sales/channel roles for hospitals, clinics, telemedicine partners, diagnostics networks, and enterprise health programs.",
            "Indirect jobs through medical coordinators, diagnostics partners, pharmacy integrations, health camps, and implementation consultants.",
        ]),
        h2("Public and economic value"),
        bullet([
            "Improves patient navigation by helping users reach the right specialist earlier.",
            "Supports Indian-language access through Hindi and Hinglish symptom intake.",
            "Reduces hospital friction by structuring symptoms, reports, and follow-up answers before consultation.",
            "Creates a reusable healthcare workflow platform deployable across hospitals and specialties.",
            "Builds IP around safe triage workflows, doctor feedback, routing logic, report summarization, and analytics.",
        ]),
    ])

    story += page("DPIIT Submission Checklist", [
        h2("Must-have application materials"),
        bullet([
            "[ ] Certificate of incorporation / registration certificate.",
            "[ ] PAN of the entity and authorized signatory details.",
            "[ ] Brief write-up on innovation, scalability, employment generation, and wealth creation potential.",
            "[ ] Pitch deck or support PDF covering problem, solution, market, business model, traction, team, and impact.",
            "[ ] Website/product link, app screenshots, demo video, prototype evidence, or technical documentation.",
            "[ ] Board resolution/authorization letter if someone applies on behalf of the company.",
            "[ ] IP/patent/trademark details if applicable; otherwise note proprietary software, workflows, data structures, prompts, and roadmap.",
            "[ ] Customer/pilot proof, LOIs, clinical advisor notes, invoices, testimonials, or hospital discussions where available.",
        ]),
        h2("Quality checks before upload"),
        bullet([
            "Use only verified facts; do not claim hospitals, doctors, approvals, revenue, pilots, certifications, or clinical validation without evidence.",
            "Keep company name, brand name, founder names, incorporation date, and registration numbers consistent across all documents.",
            "Avoid presenting the product as a diagnostic or prescription system; position it as triage, routing, workflow, and doctor-support infrastructure.",
            "Confirm current DPIIT criteria and required upload fields on the official Startup India portal immediately before submission.",
            "Use a clear file name such as Axnovus_Care_Agent_DPIIT_Startup_India_Investor_Document.pdf.",
        ]),
    ])

    story += page("One-Page Investor Narrative", [
        p("Axnovus Care Agent is building the AI workflow layer for Indian healthcare access and OPD coordination. The problem starts before diagnosis: patients describe symptoms in mixed language, may not know which doctor to book, often carry reports that are not interpreted early, and doctors receive incomplete handoffs. Hospitals need a digital front door that listens, structures, asks, routes, and hands off responsibly."),
        p("The product begins as a configurable patient-to-doctor workflow: symptom intake by text or Hindi speech, report upload, possible-condition triage, follow-up questions, specialist routing, appointment booking, doctor review, prescription capture, and medicine option comparison. It uses LLM reasoning where appropriate, but keeps red flags, clinical safety, doctor confirmation, and auditability central to the design."),
        p("The business can scale through hospital SaaS subscriptions, setup and integration fees, usage-based AI review, workflow analytics, and healthcare partner integrations. The data advantage compounds through clinician-reviewed cases, doctor corrections, report requests, and routing outcomes, eventually allowing a safer local knowledge layer and stronger specialty-specific workflows."),
        h2("Immediate funding priorities"),
        bullet([
            "Move from prototype to secure product-grade MVP with backend persistence, role-based access, audit logs, and consent.",
            "Run 2-3 controlled hospital/clinic pilots with doctor review and measurable operational outcomes.",
            "Build OCR/report extraction, clinical evaluation datasets, and model safety monitoring.",
            "Validate commercial packaging: setup fee, subscription price, AI usage cost, support burden, and integration timeline.",
            "Prepare DPIIT, accelerator, grant, and seed investor materials with verified evidence.",
        ]),
    ])

    story += page("Founder Review Notes", [
        p("This document is intentionally structured for both DPIIT recognition and investor review. Before external use, replace all bracketed fields, attach factual evidence, and have legal, clinical, and data-privacy assumptions reviewed. The strongest submission will pair this narrative with product screenshots, incorporation documents, pilot proof, a short demo link, and a technical architecture note."),
        h2("Open items to finalize"),
        bullet([
            "[ ] Legal entity name, registration number, incorporation date, and address.",
            "[ ] Founder names, bios, roles, shareholding, and relevant AI/healthcare/business experience.",
            "[ ] Current product status: prototype, MVP, pilot, paid pilot, or revenue stage.",
            "[ ] Existing customers, hospital discussions, doctors/advisors, pilots, LOIs, grants, or deployments.",
            "[ ] Funding amount, proposed use of funds, 12-18 month budget, and hiring plan.",
            "[ ] Screenshots, demo URL, product architecture visual, clinical safety note, and IP/trademark status.",
            "[ ] Confirmation of current DPIIT eligibility thresholds and application fields before upload.",
        ]),
        callout("Founder review stance", "Keep the story ambitious but disciplined. Reviewers will trust the document more if it clearly separates current prototype capability, pilot-stage evidence, product roadmap, and regulated healthcare claims.", LIGHT),
    ])

    PDF_PATH.parent.mkdir(exist_ok=True)
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=0.88 * inch,
        bottomMargin=0.75 * inch,
        title="Axnovus Care Agent DPIIT Startup India Investor Document",
        author="AxNovus",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(PDF_PATH)


if __name__ == "__main__":
    build()
