window.createCaseStore = function createCaseStore(storageKey, options = {}) {
  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (error) {
      console.warn("Could not read local case store:", error);
      return [];
    }
  }

  function writeAll(records) {
    localStorage.setItem(storageKey, JSON.stringify(records));
  }

  function add(record) {
    const records = readAll();
    const saved = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      ...record,
    };
    records.push(saved);
    writeAll(records);
    return saved;
  }

  function stats() {
    const records = readAll();
    const approved = records.filter((record) => record.approvedForDataset).length;
    return {
      total: records.length,
      approved,
      rejected: records.filter((record) => record.rating === "down").length,
      readyForEvaluation: approved >= (options.minimumApprovedCases || 0),
    };
  }

  function approvedCases() {
    return readAll().filter((record) => record.approvedForDataset);
  }

  function exportJson() {
    return JSON.stringify(readAll(), null, 2);
  }

  function clear() {
    localStorage.removeItem(storageKey);
  }

  return {
    add,
    stats,
    exportJson,
    clear,
    readAll,
    approvedCases,
  };
};
