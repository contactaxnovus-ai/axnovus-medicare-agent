const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const tls = require("node:tls");

const rootDir = __dirname;
const port = Number(process.env.PORT || 4173);
const defaultModel = process.env.OPENAI_MODEL || "gpt-4.1";
const allowedModels = new Set((process.env.OPENAI_ALLOWED_MODELS || "gpt-4.1,gpt-4.1-mini,gpt-4o-mini").split(",").map((item) => item.trim()).filter(Boolean));
const googlePlacesFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.nationalPhoneNumber",
].join(",");

const triageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["extractedSymptoms", "possibleConditions", "urgent", "outputLanguage"],
  properties: {
    extractedSymptoms: {
      type: "array",
      items: { type: "string" },
    },
    possibleConditions: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "specialty", "score", "hits", "questions", "nextStep"],
        properties: {
          name: { type: "string" },
          specialty: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          hits: {
            type: "array",
            items: { type: "string" },
          },
          questions: {
            type: "array",
            maxItems: 4,
            items: { type: "string" },
          },
          nextStep: { type: "string" },
        },
      },
    },
    urgent: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "text"],
        properties: {
          key: { type: "string" },
          text: { type: "string" },
        },
      },
    },
    outputLanguage: {
      type: "object",
      additionalProperties: false,
      required: ["code", "label"],
      properties: {
        code: { type: "string", enum: ["en", "hi"] },
        label: { type: "string" },
      },
    },
  },
};

function extractOutputText(responseBody) {
  if (responseBody.output_text) return responseBody.output_text;
  return (responseBody.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 250000) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(JSON.parse(body || "{}")));
    req.on("error", reject);
  });
}

function smtpCommand(socket, command) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1) || "";
      if (/^\d{3} /.test(last)) {
        socket.off("data", onData);
        if (/^[23]/.test(last)) resolve(buffer);
        else reject(new Error(buffer.trim()));
      }
    };
    socket.on("data", onData);
    if (command) socket.write(`${command}\r\n`);
  });
}

function encodeBase64(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function normalizeMailData(value) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .trim();
}

function buildMailMessage({ to, subject, text, from }) {
  const safeSubject = normalizeMailData(subject);
  const safeText = String(text || "").replace(/\r?\n\./g, "\n..");
  return [
    `From: Axnovus Care <${from}>`,
    `To: ${normalizeMailData(to)}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    safeText,
  ].join("\r\n");
}

function base64Url(value) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hasGmailApiConfig() {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_FROM);
}

async function getGmailAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "Gmail API token request failed.");
  }
  return body.access_token;
}

async function sendGmailApiMail({ to, subject, text }) {
  const from = process.env.GMAIL_FROM;
  const accessToken = await getGmailAccessToken();
  const raw = base64Url(buildMailMessage({ to, subject, text, from }));
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || "Gmail API email send failed.");
  }
  return { devMode: false, provider: "gmail-api" };
}

async function sendMail(mail) {
  if (hasGmailApiConfig()) return sendGmailApiMail(mail);
  return sendSmtpMail(mail);
}

async function sendSmtpMail({ to, subject, text }) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const portNumber = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!user || !pass || !from) return { devMode: true, provider: "local" };

  const socket = tls.connect({ host, port: portNumber, servername: host });
  await new Promise((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });
  try {
    await smtpCommand(socket);
    await smtpCommand(socket, `EHLO ${process.env.SMTP_EHLO_HOST || "axnovus-care.local"}`);
    await smtpCommand(socket, "AUTH LOGIN");
    await smtpCommand(socket, encodeBase64(user));
    await smtpCommand(socket, encodeBase64(pass));
    await smtpCommand(socket, `MAIL FROM:<${from}>`);
    await smtpCommand(socket, `RCPT TO:<${to}>`);
    await smtpCommand(socket, "DATA");
    socket.write(`${buildMailMessage({ to, subject, text, from })}\r\n.\r\n`);
    await smtpCommand(socket);
    await smtpCommand(socket, "QUIT").catch(() => null);
    return { devMode: false, provider: "smtp" };
  } finally {
    socket.end();
  }
}

async function handleSignupVerification(req, res) {
  const payload = await readJson(req);
  const email = String(payload.email || "").trim().toLowerCase();
  const name = normalizeMailData(payload.name || "User");
  const code = String(payload.code || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{6}$/.test(code)) {
    sendJson(res, 400, { error: "Valid email and 6 digit code are required." });
    return;
  }
  const result = await sendMail({
    to: email,
    subject: "Axnovus Care email verification",
    text: `Hello ${name},\n\nYour Axnovus Care verification code is ${code}.\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
  });
  sendJson(res, 200, {
    ok: true,
    devMode: result.devMode,
    provider: result.provider,
    message: result.devMode ? "Email is not configured. Local verification fallback is active." : "Verification email sent.",
  });
}

async function handlePasswordReset(req, res) {
  const payload = await readJson(req);
  const email = String(payload.email || "").trim().toLowerCase();
  const name = normalizeMailData(payload.name || "User");
  const temporaryPassword = String(payload.temporaryPassword || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || temporaryPassword.length < 8) {
    sendJson(res, 400, { error: "Valid email and temporary password are required." });
    return;
  }
  const result = await sendMail({
    to: email,
    subject: "Axnovus Care temporary password",
    text: [
      `Hello ${name},`,
      "",
      "A temporary password was requested for your Axnovus Care account.",
      "",
      `Temporary password: ${temporaryPassword}`,
      "",
      "Sign in with this password and change it immediately from the Password option.",
      "",
      "If you did not request this, contact your administrator.",
    ].join("\n"),
  });
  sendJson(res, 200, {
    ok: true,
    devMode: result.devMode,
    provider: result.provider,
    message: result.devMode ? "Email is not configured. Local reset fallback is active." : "Temporary password sent.",
  });
}

function sanitizeMapsResult(place, specialty) {
  return {
    id: place.id || "",
    name: place.displayName?.text || "Doctor or hospital",
    specialty,
    address: place.formattedAddress || "",
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    rating: place.rating || null,
    googleMapsUri: place.googleMapsUri || "",
    websiteUri: place.websiteUri || "",
    phone: place.nationalPhoneNumber || "",
  };
}

async function handleGoogleDoctorSearch(req, res) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    sendJson(res, 200, { configured: false, places: [], message: "Set GOOGLE_MAPS_API_KEY to enable Google Maps doctor search." });
    return;
  }

  const payload = await readJson(req);
  const specialty = normalizeMailData(payload.specialty || "specialist");
  const city = normalizeMailData(payload.city || "");
  const hospital = normalizeMailData(payload.hospital || "");
  const radiusKm = Math.max(0, Math.min(50, Number(payload.radiusKm || 0)));
  const origin = payload.origin || null;
  const languageCode = ["hi", "en"].includes(payload.languageCode) ? payload.languageCode : "en";
  const textQuery = hospital
    ? `${specialty} doctor at ${hospital} ${city} India`
    : `${specialty} doctor ${city || "India"}`;
  const requestBody = {
    textQuery,
    regionCode: "IN",
    languageCode,
    maxResultCount: 8,
  };

  if (radiusKm > 0 && origin && typeof origin.latitude === "number" && typeof origin.longitude === "number") {
    requestBody.locationBias = {
      circle: {
        center: { latitude: origin.latitude, longitude: origin.longitude },
        radius: radiusKm * 1000,
      },
    };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": googlePlacesFieldMask,
    },
    body: JSON.stringify(requestBody),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJson(res, response.status, { configured: true, places: [], error: data.error?.message || "Google Maps doctor search failed." });
    return;
  }

  sendJson(res, 200, {
    configured: true,
    query: textQuery,
    places: (data.places || []).map((place) => sanitizeMapsResult(place, specialty)),
  });
}

async function handleTriage(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: "Set OPENAI_API_KEY before using /api/triage." });
    return;
  }

  const payload = await readJson(req);
  const context = payload.context || {};
  const requestedModel = typeof payload.model === "string" ? payload.model : "";
  const model = allowedModels.has(requestedModel) ? requestedModel : defaultModel;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      instructions: [
        "You are a healthcare triage assistant for Indian hospital OPD workflows.",
        "You do not diagnose, prescribe, or replace a clinician.",
        "Understand English, Hindi, Hinglish, and transliterated Hindi symptom descriptions.",
        "First identify emergency red flags, then return possible conditions, follow-up questions, and specialist routing.",
        "Use configuredConditions, knownSignals, and urgencyRules as product hints, not as a fixed rule engine.",
        "Generate follow-up questions yourself from symptoms, likely conditions, selected reports, demographics, and the configured hints.",
        "Return all user-facing text in the requested outputLanguage. Preserve proper nouns such as doctor, hospital, medicine, and city names unless a localized official name is obvious.",
        "For initial_from_intake, return likely possible conditions and ask whether targeted follow-up could improve certainty.",
        "For refine_with_followup_answers, use the provided answers to update condition scores and ask only new questions if clinically useful.",
        "Follow-up questions must be specific to the patient's described symptoms, duration, demographics, uploaded report data, and possible conditions.",
        "Do not reuse a generic fever question set when symptoms, reports, or duration point to a different or more specific condition.",
        "Keep recommendations conservative and require clinician review.",
      ].join(" "),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                symptoms: context.symptoms || "",
                followupAnswers: context.followupAnswers || [],
                reports: context.reports || [],
                age: context.age || null,
                sex: context.sex || "",
                location: context.location || "",
                languageHints: context.languageHints || ["en-IN", "hi-IN"],
                outputLanguage: context.outputLanguage || { code: "en", label: "English" },
                refinementMode: context.refinementMode || "initial",
                configHints: context.configHints || {},
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "india_healthcare_triage",
          strict: true,
          schema: triageSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    sendJson(res, response.status, { error });
    return;
  }

  const data = await response.json();
  sendJson(res, 200, JSON.parse(extractOutputText(data)));
}

function serveStatic(req, res) {
  const route = req.url === "/" ? "/index.html" : req.url;
  const cleanRoute = decodeURIComponent(route.split("?")[0]).replace(/^[/\\]+/, "");
  const filePath = path.resolve(rootDir, cleanRoute);
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const ext = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".md": "text/markdown",
  };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/send-verification") {
      await handleSignupVerification(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/send-password-reset") {
      await handlePasswordReset(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/triage") {
      await handleTriage(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/google-doctors") {
      await handleGoogleDoctorSearch(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Axnovus Care Agent running at http://localhost:${port}`);
});
