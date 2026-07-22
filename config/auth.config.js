window.AUTH_CONFIG = {
  users: [
    {
      id: "PAT-1001",
      pin: "1234",
      role: "patient",
      name: "Demo Patient",
    },
    {
      id: "DOC-DEL-01",
      pin: "4321",
      role: "doctor",
      name: "Dr. Demo",
    },
  ],
  roles: {
    patient: {
      label: "Patient",
      landing: "intake",
    },
    doctor: {
      label: "Doctor",
      landing: "doctor",
    },
  },
};
