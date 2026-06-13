const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = __dirname;
const port = Number(process.env.PORT || 4173);
const defaultModel = process.env.OPENAI_MODEL || "gpt-4.1";
const allowedModels = new Set(["gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"]);

const triageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["extractedSymptoms", "possibleConditions", "urgent"],
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
      if (body.length > 20000) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(JSON.parse(body || "{}")));
    req.on("error", reject);
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
                age: context.age || null,
                sex: context.sex || "",
                location: context.location || "",
                languageHints: context.languageHints || ["en-IN", "hi-IN"],
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
    if (req.method === "POST" && req.url === "/api/triage") {
      await handleTriage(req, res);
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
