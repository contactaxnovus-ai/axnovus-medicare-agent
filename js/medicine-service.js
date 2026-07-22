window.createMedicineService = function createMedicineService(medicineConfig) {
  function findMatches(prescriptionText) {
    const text = String(prescriptionText || "").toLowerCase();
    return (medicineConfig.catalog || [])
      .filter((item) => item.aliases.some((alias) => text.includes(alias.toLowerCase())) || text.includes(item.salt.toLowerCase()))
      .map((item) => ({
        ...item,
        brands: [...item.brands].sort((a, b) => a.price - b.price),
      }));
  }

  return {
    findMatches,
  };
};
