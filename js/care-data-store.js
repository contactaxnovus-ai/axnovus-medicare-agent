window.createCareDataStore = function createCareDataStore(storageKey = "axnovus-care-workspace-v1") {
  function read() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{"cases":[],"appointments":[],"prescriptions":[],"doctorInputs":[]}');
    } catch (error) {
      console.warn("Could not read care workspace:", error);
      return { cases: [], appointments: [], prescriptions: [], doctorInputs: [] };
    }
  }

  function write(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function id(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function upsertCase(caseRecord) {
    const data = read();
    const existingIndex = data.cases.findIndex((item) => item.id === caseRecord.id);
    const record = {
      ...caseRecord,
      id: caseRecord.id || id("case"),
      updatedAt: new Date().toISOString(),
      createdAt: caseRecord.createdAt || new Date().toISOString(),
    };
    if (existingIndex >= 0) data.cases[existingIndex] = record;
    else data.cases.unshift(record);
    write(data);
    return record;
  }

  function addAppointment(appointment) {
    const data = read();
    const record = { id: id("appt"), createdAt: new Date().toISOString(), status: "Booked", ...appointment };
    data.appointments.unshift(record);
    write(data);
    return record;
  }

  function addDoctorInput(input) {
    const data = read();
    const record = { id: id("doctor"), createdAt: new Date().toISOString(), ...input };
    data.doctorInputs.unshift(record);
    write(data);
    return record;
  }

  function addPrescription(prescription) {
    const data = read();
    const record = { id: id("rx"), createdAt: new Date().toISOString(), ...prescription };
    data.prescriptions.unshift(record);
    write(data);
    return record;
  }

  return {
    read,
    upsertCase,
    addAppointment,
    addDoctorInput,
    addPrescription,
  };
};
