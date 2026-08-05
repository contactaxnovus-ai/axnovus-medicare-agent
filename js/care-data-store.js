window.createCareDataStore = function createCareDataStore(storageKey = "axnovus-care-workspace-v1") {
  const emptyData = {
    cases: [],
    appointments: [],
    prescriptions: [],
    doctorInputs: [],
    members: [],
    patients: [],
    reports: [],
    doctorAvailability: [],
  };

  function read() {
    try {
      return { ...emptyData, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
    } catch (error) {
      console.warn("Could not read care workspace:", error);
      return { ...emptyData };
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

  function upsertMember(member) {
    const data = read();
    const existingIndex = data.members.findIndex((item) => item.id === member.id);
    const record = {
      ...member,
      id: member.id || id("member"),
      updatedAt: new Date().toISOString(),
      createdAt: member.createdAt || new Date().toISOString(),
    };
    if (existingIndex >= 0) data.members[existingIndex] = record;
    else data.members.unshift(record);
    write(data);
    return record;
  }

  function upsertPatient(patient) {
    const data = read();
    const existingIndex = data.patients.findIndex((item) => item.id === patient.id);
    const record = {
      ...patient,
      id: patient.id || id("patient"),
      updatedAt: new Date().toISOString(),
      createdAt: patient.createdAt || new Date().toISOString(),
    };
    if (existingIndex >= 0) data.patients[existingIndex] = record;
    else data.patients.unshift(record);
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

  function addReports(reports) {
    const data = read();
    const records = reports.map((report) => ({
      id: report.id || id("report"),
      createdAt: new Date().toISOString(),
      ...report,
    }));
    data.reports.unshift(...records);
    write(data);
    return records;
  }

  function addPrescription(prescription) {
    const data = read();
    const record = { id: id("rx"), createdAt: new Date().toISOString(), ...prescription };
    data.prescriptions.unshift(record);
    write(data);
    return record;
  }

  function upsertDoctorAvailability(availability) {
    const data = read();
    const existingIndex = data.doctorAvailability.findIndex((item) => item.doctorId === availability.doctorId && item.day === availability.day);
    const record = {
      ...availability,
      id: availability.id || data.doctorAvailability[existingIndex]?.id || id("avail"),
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) data.doctorAvailability[existingIndex] = record;
    else data.doctorAvailability.unshift(record);
    write(data);
    return record;
  }

  return {
    read,
    upsertCase,
    upsertMember,
    upsertPatient,
    addAppointment,
    addDoctorInput,
    addReports,
    addPrescription,
    upsertDoctorAvailability,
  };
};
