window.createAppointmentService = function createAppointmentService(hospitalConfig) {
  const cityCenters = hospitalConfig.cityCenters || {};
  const cityAliases = hospitalConfig.cityAliases || {};

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function canonicalCity(value) {
    const input = normalize(value);
    if (!input) return "";
    const aliasKey = Object.keys(cityAliases).find((key) => normalize(key) === input || input.includes(normalize(key)));
    if (aliasKey) return cityAliases[aliasKey];
    const centerKey = Object.keys(cityCenters).find((key) => normalize(key) === input || input.includes(normalize(key)) || normalize(key).includes(input));
    return centerKey || value;
  }

  function toDoctorRecord(hospital, department, doctor) {
    return {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      city: hospital.city,
      area: hospital.area || "",
      address: hospital.address || "",
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      department: department.name,
      ...doctor,
    };
  }

  function routeMatchesDepartment(route, departmentName) {
    const target = String(route || "").toLowerCase();
    const department = normalize(departmentName);
    if (!target) return true;
    return target.includes(department) || department.includes(target.split("/")[0].trim());
  }

  function distanceKm(a, b) {
    if (!a || !b || typeof a.latitude !== "number" || typeof a.longitude !== "number" || typeof b.latitude !== "number" || typeof b.longitude !== "number") {
      return null;
    }
    const earthKm = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function getOrigin(filters = {}) {
    if (filters.origin && typeof filters.origin.latitude === "number" && typeof filters.origin.longitude === "number") return filters.origin;
    const city = normalize(canonicalCity(filters.city));
    const cityKey = Object.keys(cityCenters).find((key) => normalize(key) === city || city.includes(normalize(key)));
    return cityKey ? cityCenters[cityKey] : null;
  }

  function passesFilters(record, filters = {}) {
    const city = normalize(canonicalCity(filters.city));
    const hospital = normalize(filters.hospital);
    const specialty = normalize(filters.specialty);
    const area = normalize(filters.area);

    if (city && normalize(canonicalCity(record.city)) !== city && !normalize(record.city).includes(city) && !city.includes(normalize(record.city))) return false;
    if (hospital && !normalize(record.hospitalName).includes(hospital)) return false;
    if (area && !normalize(record.area).includes(area) && !normalize(record.address).includes(area)) return false;
    if (specialty && !normalize(record.department).includes(specialty) && !specialty.includes(normalize(record.department))) return false;

    const radiusKm = Number(filters.radiusKm || 0);
    const origin = getOrigin(filters);
    if (radiusKm > 0 && origin) {
      const distance = distanceKm(origin, record);
      if (distance !== null && distance > radiusKm) return false;
    }

    return true;
  }

  function listAllDoctors() {
    const doctors = [];

    for (const hospital of hospitalConfig.hospitals || []) {
      for (const department of hospital.departments || []) {
        for (const doctor of department.doctors || []) {
          doctors.push(toDoctorRecord(hospital, department, doctor));
        }
      }
    }

    return doctors;
  }

  function findDoctors(route, filters = {}) {
    const doctors = listAllDoctors()
      .filter((doctor) => routeMatchesDepartment(route, doctor.department))
      .filter((doctor) => passesFilters(doctor, filters))
      .map((doctor) => ({
        ...doctor,
        distanceKm: distanceKm(getOrigin(filters), doctor),
      }))
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999) || b.rating - a.rating || b.years - a.years);

    const hasLocationFilter = normalize(filters.city) || normalize(filters.hospital) || normalize(filters.area) || Number(filters.radiusKm || 0) > 0;
    return doctors.length ? doctors : hasLocationFilter ? [] : fallbackDoctors();
  }

  function fallbackDoctors() {
    return listAllDoctors().filter((doctor) => doctor.department.includes("General Physician") || doctor.department.includes("Emergency"));
  }

  function listCities() {
    return Array.from(new Set((hospitalConfig.hospitals || []).map((hospital) => hospital.city))).sort().map((city) => ({
      value: city,
      label: Object.entries(cityAliases).find(([, canonical]) => canonical === city)?.[0]
        ? `${city} (${Object.entries(cityAliases).filter(([, canonical]) => canonical === city).map(([alias]) => alias).join(" / ")})`
        : city,
    }));
  }

  function listHospitals() {
    return (hospitalConfig.hospitals || []).map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      city: hospital.city,
      area: hospital.area || "",
    }));
  }

  function listSpecialties() {
    return Array.from(new Set((hospitalConfig.hospitals || []).flatMap((hospital) => (hospital.departments || []).map((department) => department.name)))).sort();
  }

  function findDoctorById(doctorId) {
    return listAllDoctors().find((doctor) => doctor.id === doctorId);
  }

  function hospitalByName(hospitalName) {
    return (hospitalConfig.hospitals || []).find((hospital) => normalize(hospital.name) === normalize(hospitalName));
  }

  function cityForHospital(hospitalName) {
    const hospital = listHospitals().find((item) => normalize(item.name) === normalize(hospitalName));
    return hospital?.city || "";
  }

  function buildExternalSearchUrl({ specialty, city, hospital }) {
    const template = hospitalConfig.externalSearchUrlTemplate || "https://www.google.com/search?q={specialty}+doctor+{city}+{hospital}";
    return template
      .replace("{specialty}", encodeURIComponent(specialty || "specialist"))
      .replace("{city}", encodeURIComponent(city || "India"))
      .replace("{hospital}", encodeURIComponent(hospital || "hospital"));
  }

  return {
    findDoctors,
    findDoctorById,
    hospitalByName,
    listCities,
    listHospitals,
    listSpecialties,
    buildExternalSearchUrl,
    canonicalCity,
    cityForHospital,
  };
};
