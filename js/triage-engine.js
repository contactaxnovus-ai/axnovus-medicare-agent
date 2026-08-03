window.createTriageEngine = function createTriageEngine(config, hooks = {}) {
  function normalize(text) {
    return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function extractSignals(text) {
    const normalized = normalize(text);
    return Object.entries(config.signals || {})
      .filter(([, aliases]) => aliases.some((alias) => normalized.includes(String(alias).toLowerCase())))
      .map(([key]) => key);
  }

  function scoreItems(extracted) {
    return (config.items || [])
      .map((item) => {
        const match = item.match || [];
        const hits = match.filter((key) => extracted.includes(key));
        const score = match.length ? Math.round((hits.length / match.length) * 100) : 0;
        return {
          ...item,
          specialty: item.specialty || item.route,
          hits,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  function detectUrgency(extracted) {
    return (config.urgencyRules || []).filter((rule) => extracted.includes(rule.key));
  }

  function localProvider(context) {
    const followupText = (context.followupAnswers || []).map((item) => `${item.question} ${item.answer}`).join(" ");
    const reportText = (context.reports || []).map((report) => `${report.name} ${report.text || ""}`).join(" ");
    const extracted = extractSignals(`${context.symptoms} ${followupText} ${reportText}`);
    return {
      provider: "rules",
      extractedSymptoms: extracted,
      possibleConditions: scoreItems(extracted),
      urgent: detectUrgency(extracted),
      outputLanguage: context.outputLanguage || null,
    };
  }

  async function llmProvider(context) {
    const endpoint = hooks.getLlmEndpoint ? hooks.getLlmEndpoint() : config.llm.endpoint;
    const response = await fetch(endpoint || "/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: config.llm.task,
        model: hooks.getModel ? hooks.getModel() : config.llm.defaultModel,
        safetyInstruction: config.llm.safetyInstruction,
        context,
        outputSchema: {
          extractedSymptoms: ["string"],
          possibleConditions: [
            {
              name: "string",
              specialty: "string",
              score: "number 0-100",
              hits: ["string"],
              questions: ["string"],
              nextStep: "string",
            },
          ],
          urgent: [{ key: "string", text: "string" }],
          outputLanguage: { code: "en or hi", label: "string" },
        },
      }),
    });

    if (!response.ok) throw new Error(`LLM endpoint returned ${response.status}`);
    const data = await response.json();
    return {
      provider: "llm",
      extractedSymptoms: Array.isArray(data.extractedSymptoms) ? data.extractedSymptoms : [],
      possibleConditions: Array.isArray(data.possibleConditions) ? data.possibleConditions : [],
      urgent: Array.isArray(data.urgent) ? data.urgent : [],
      outputLanguage: data.outputLanguage || context.outputLanguage || null,
    };
  }

  async function run(context, options = {}) {
    const local = localProvider(context);
    if (options.mode !== "llm") return local;

    try {
      if (hooks.onStatus) hooks.onStatus("Reviewing symptoms and checking red flags.");
      const llm = await llmProvider(context);
      return {
        provider: "llm",
        extractedSymptoms: Array.from(new Set([...local.extractedSymptoms, ...llm.extractedSymptoms])),
        possibleConditions: normalizeConditions(llm.possibleConditions, local.possibleConditions, true),
        urgent: mergeUrgency(local.urgent, llm.urgent),
        outputLanguage: llm.outputLanguage || context.outputLanguage || null,
      };
    } catch (error) {
      console.warn("LLM triage failed, using local fallback:", error);
      if (hooks.onStatus) {
        hooks.onStatus(
          "Full review service is unavailable. A limited local review was used for this case.",
          "warning"
        );
      }
      return { ...local, provider: "rules-fallback" };
    }
  }

  function normalizeConditions(llmConditions, fallbackConditions, llmPrimary = false) {
    const normalized = (llmConditions || [])
      .filter((condition) => condition && condition.name && (condition.specialty || condition.route))
      .map((condition) => ({
        name: String(condition.name),
        specialty: String(condition.specialty || condition.route),
        score: Math.max(1, Math.min(100, Number(condition.score || 50))),
        hits: Array.isArray(condition.hits) ? condition.hits.map(String).slice(0, 6) : [],
        questions: Array.isArray(condition.questions) ? condition.questions.map(String).slice(0, 4) : [],
        nextStep: String(condition.nextStep || "Recommend clinician review before treatment decisions."),
        questionSource: llmPrimary ? "llm" : "local",
      }))
      .slice(0, 5);

    return normalized.length ? normalized : fallbackConditions;
  }

  function mergeUrgency(localUrgent, llmUrgent) {
    const combined = [...localUrgent, ...(llmUrgent || []).filter((item) => item && item.text)];
    const seen = new Set();
    return combined.filter((item) => {
      const key = item.key || item.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return {
    run,
    extractSignals,
    scoreItems,
    detectUrgency,
  };
};
