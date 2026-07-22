window.createReportService = function createReportService() {
  async function parseFiles(fileList) {
    const files = Array.from(fileList || []);
    const parsed = [];

    for (const file of files) {
      const canReadText = /text|json|csv|xml/.test(file.type) || /\.(txt|csv|json|xml)$/i.test(file.name);
      parsed.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || "unknown",
        size: file.size,
        text: canReadText ? await file.text() : "",
        status: canReadText ? "Text extracted" : "Uploaded for doctor review",
      });
    }

    return parsed;
  }

  function summarize(reports) {
    if (!reports.length) return "No reports uploaded.";
    return reports.map((report) => `${report.name}: ${report.status}`).join("; ");
  }

  return {
    parseFiles,
    summarize,
  };
};
