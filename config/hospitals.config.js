window.HOSPITAL_CONFIG = {
  provider: "local-config-directory",
  externalSearchUrlTemplate: "https://www.google.com/maps/search/{specialty}%20doctor%20{city}%20{hospital}",
  cityCenters: {
    Delhi: { latitude: 28.6139, longitude: 77.209 },
    Gurugram: { latitude: 28.4595, longitude: 77.0266 },
    Noida: { latitude: 28.5355, longitude: 77.391 },
    Mumbai: { latitude: 19.076, longitude: 72.8777 },
    Bengaluru: { latitude: 12.9716, longitude: 77.5946 },
    Hyderabad: { latitude: 17.385, longitude: 78.4867 },
    Chennai: { latitude: 13.0827, longitude: 80.2707 },
    Pune: { latitude: 18.5204, longitude: 73.8567 },
    Kolkata: { latitude: 22.5726, longitude: 88.3639 },
  },
  cityAliases: {
    Gurgaon: "Gurugram",
    "Gurgaon, Haryana": "Gurugram",
    Bangalore: "Bengaluru",
    Bombay: "Mumbai",
    Calcutta: "Kolkata",
  },
  hospitals: [
    {
      id: "max-saket",
      name: "Max Super Speciality Hospital",
      city: "Delhi",
      area: "Saket",
      address: "Saket, South Delhi",
      latitude: 28.5273,
      longitude: 77.215,
      departments: [
        {
          name: "General Physician / Internal Medicine",
          doctors: [
            { id: "doc-del-im-01", name: "Dr. R. Mehra", years: 14, experience: "14 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1200, slots: ["Today 16:30", "Tomorrow 10:00", "Tomorrow 12:30"] },
            { id: "doc-del-im-02", name: "Dr. Kavita Iyer", years: 11, experience: "11 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1100, slots: ["Today 18:00", "Tomorrow 09:30"] },
            { id: "doc-del-im-03", name: "Dr. Anirudh Saini", years: 17, experience: "17 years", languages: ["English", "Hindi", "Punjabi"], rating: 4.8, consultationFee: 1350, slots: ["Today 14:30", "Tomorrow 08:45", "Fri 10:15"] },
          ],
        },
        {
          name: "Pulmonologist / Chest Physician",
          doctors: [
            { id: "doc-del-pulm-01", name: "Dr. Aman Sarin", years: 16, experience: "16 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 1500, slots: ["Tomorrow 11:30", "Tomorrow 17:00"] },
            { id: "doc-del-pulm-02", name: "Dr. Shalini Grover", years: 12, experience: "12 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1450, slots: ["Today 15:15", "Tomorrow 18:15"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-del-card-01", name: "Dr. Nitin Kapoor", years: 20, experience: "20 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 1800, slots: ["Today 19:30", "Tomorrow 13:30"] },
            { id: "doc-del-card-02", name: "Dr. Ritu Bansal", years: 16, experience: "16 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1750, slots: ["Today 12:30", "Tomorrow 16:45"] },
          ],
        },
        {
          name: "ENT Specialist",
          doctors: [
            { id: "doc-del-ent-01", name: "Dr. Varun Khanna", years: 13, experience: "13 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1250, slots: ["Today 17:20", "Tomorrow 11:20"] },
          ],
        },
        {
          name: "Dermatologist",
          doctors: [
            { id: "doc-del-derm-01", name: "Dr. Charu Ahuja", years: 11, experience: "11 years", languages: ["English", "Hindi"], rating: 4.5, consultationFee: 1200, slots: ["Tomorrow 09:40", "Fri 15:20"] },
          ],
        },
      ],
    },
    {
      id: "aiims-delhi-opd",
      name: "AIIMS Delhi OPD Referral Desk",
      city: "Delhi",
      area: "Ansari Nagar",
      address: "Ansari Nagar, New Delhi",
      latitude: 28.5672,
      longitude: 77.21,
      departments: [
        {
          name: "Emergency / Triage Desk",
          doctors: [
            { id: "doc-aiims-triage", name: "Emergency Triage Desk", years: 24, experience: "24x7", languages: ["English", "Hindi"], rating: 4.5, consultationFee: 0, slots: ["Immediate"] },
          ],
        },
        {
          name: "Neurologist",
          doctors: [
            { id: "doc-del-neuro-01", name: "Dr. S. Narang", years: 18, experience: "18 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1400, slots: ["Tomorrow 15:30", "Fri 11:00"] },
            { id: "doc-aiims-neuro-02", name: "Dr. Meenakshi Rawat", years: 21, experience: "21 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 1500, slots: ["Today 13:00", "Tomorrow 09:30"] },
          ],
        },
        {
          name: "Nephrologist",
          doctors: [
            { id: "doc-del-neph-01", name: "Dr. Pooja Malik", years: 15, experience: "15 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1300, slots: ["Tomorrow 12:00", "Fri 16:30"] },
            { id: "doc-aiims-neph-02", name: "Dr. Arvind Suri", years: 19, experience: "19 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1450, slots: ["Today 16:00", "Sat 10:00"] },
          ],
        },
        {
          name: "Rheumatologist",
          doctors: [
            { id: "doc-aiims-rheum-01", name: "Dr. Kavya Sharma", years: 14, experience: "14 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1300, slots: ["Tomorrow 14:20", "Fri 09:50"] },
          ],
        },
        {
          name: "Oncologist",
          doctors: [
            { id: "doc-aiims-onco-01", name: "Dr. Manav Sethi", years: 22, experience: "22 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 1600, slots: ["Tomorrow 10:40", "Fri 13:40"] },
          ],
        },
      ],
    },
    {
      id: "medanta-gurugram",
      name: "Medanta The Medicity",
      city: "Gurugram",
      area: "Sector 38",
      address: "Sector 38, Gurugram",
      latitude: 28.4396,
      longitude: 77.0408,
      departments: [
        {
          name: "General Physician / Internal Medicine",
          doctors: [
            { id: "doc-ggn-im-01", name: "Dr. Simran Batra", years: 9, experience: "9 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1100, slots: ["Today 20:00", "Tomorrow 11:00"] },
            { id: "doc-ax-001", name: "Doctor User", years: 12, experience: "12 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 900, slots: ["Today 18:30", "Tomorrow 10:30", "Tomorrow 16:30"] },
            { id: "doc-ggn-im-02", name: "Dr. Reema Anand", years: 16, experience: "16 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 1300, slots: ["Today 12:15", "Tomorrow 09:15", "Fri 17:15"] },
          ],
        },
        {
          name: "Gastroenterologist / General Physician",
          doctors: [
            { id: "doc-ggn-gastro-01", name: "Dr. Neel Ghosh", years: 13, experience: "13 years", languages: ["English", "Hindi", "Bengali"], rating: 4.6, consultationFee: 1400, slots: ["Today 19:00", "Tomorrow 15:00"] },
            { id: "doc-ggn-gastro-02", name: "Dr. Ira Mathur", years: 18, experience: "18 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 1650, slots: ["Today 15:45", "Tomorrow 12:45"] },
          ],
        },
        {
          name: "Endocrinologist / Diabetologist",
          doctors: [
            { id: "doc-ggn-endo-01", name: "Dr. Vivek Rao", years: 18, experience: "18 years", languages: ["English", "Hindi"], rating: 4.9, consultationFee: 1700, slots: ["Today 17:30", "Tomorrow 16:00"] },
            { id: "doc-ggn-endo-02", name: "Dr. Namita Chawla", years: 12, experience: "12 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1500, slots: ["Tomorrow 10:20", "Sat 12:20"] },
          ],
        },
        {
          name: "Orthopedist",
          doctors: [
            { id: "doc-ggn-ortho-01", name: "Dr. Harpreet Singh", years: 17, experience: "17 years", languages: ["English", "Hindi", "Punjabi"], rating: 4.7, consultationFee: 1500, slots: ["Tomorrow 10:30", "Fri 18:00"] },
            { id: "doc-ggn-ortho-02", name: "Dr. Aakash Dutta", years: 11, experience: "11 years", languages: ["English", "Hindi"], rating: 4.5, consultationFee: 1350, slots: ["Today 19:45", "Tomorrow 14:10"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-ggn-card-01", name: "Dr. Vikram Anand", years: 24, experience: "24 years", languages: ["English", "Hindi"], rating: 4.9, consultationFee: 2100, slots: ["Today 17:00", "Tomorrow 12:00"] },
            { id: "doc-ggn-card-02", name: "Dr. Mehak Bedi", years: 15, experience: "15 years", languages: ["English", "Hindi", "Punjabi"], rating: 4.7, consultationFee: 1850, slots: ["Tomorrow 15:30", "Fri 11:30"] },
          ],
        },
        {
          name: "Neurologist",
          doctors: [
            { id: "doc-ggn-neuro-01", name: "Dr. Tapan Roy", years: 17, experience: "17 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1800, slots: ["Today 16:20", "Tomorrow 13:20"] },
          ],
        },
        {
          name: "Oncologist",
          doctors: [
            { id: "doc-ggn-onco-01", name: "Dr. Sanjana Mehta", years: 20, experience: "20 years", languages: ["English", "Hindi"], rating: 4.8, consultationFee: 2200, slots: ["Tomorrow 09:45", "Fri 14:45"] },
          ],
        },
      ],
    },
    {
      id: "fortis-noida",
      name: "Fortis Hospital Noida",
      city: "Noida",
      area: "Sector 62",
      address: "Sector 62, Noida",
      latitude: 28.6207,
      longitude: 77.3726,
      departments: [
        {
          name: "Urologist / General Physician",
          doctors: [
            { id: "doc-noida-uro-01", name: "Dr. Sana Khan", years: 12, experience: "12 years", languages: ["English", "Hindi", "Urdu"], rating: 4.5, consultationFee: 1200, slots: ["Tomorrow 13:00", "Tomorrow 18:30"] },
            { id: "doc-noida-uro-02", name: "Dr. Prateek Jain", years: 16, experience: "16 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1450, slots: ["Today 15:30", "Fri 10:30"] },
          ],
        },
        {
          name: "Dermatologist",
          doctors: [
            { id: "doc-noida-derm-01", name: "Dr. Ananya Sethi", years: 10, experience: "10 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1100, slots: ["Today 17:00", "Sat 11:30"] },
            { id: "doc-noida-derm-02", name: "Dr. Mansi Verma", years: 13, experience: "13 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1250, slots: ["Tomorrow 10:15", "Fri 16:15"] },
          ],
        },
        {
          name: "General Physician / Internal Medicine",
          doctors: [
            { id: "doc-noida-im-01", name: "Dr. Pankaj Bahl", years: 15, experience: "15 years", languages: ["English", "Hindi"], rating: 4.6, consultationFee: 1150, slots: ["Today 18:15", "Tomorrow 09:45"] },
          ],
        },
        {
          name: "ENT Specialist",
          doctors: [
            { id: "doc-noida-ent-01", name: "Dr. Ishaan Kapur", years: 12, experience: "12 years", languages: ["English", "Hindi"], rating: 4.5, consultationFee: 1200, slots: ["Tomorrow 12:15", "Sat 10:15"] },
          ],
        },
        {
          name: "Gynecologist",
          doctors: [
            { id: "doc-noida-gyn-01", name: "Dr. Nidhi Arora", years: 14, experience: "14 years", languages: ["English", "Hindi"], rating: 4.7, consultationFee: 1350, slots: ["Today 16:45", "Tomorrow 11:45"] },
          ],
        },
      ],
    },
    {
      id: "apollo-mumbai",
      name: "Apollo Hospitals Navi Mumbai",
      city: "Mumbai",
      area: "Navi Mumbai",
      address: "CBD Belapur, Navi Mumbai",
      latitude: 19.0176,
      longitude: 73.0396,
      departments: [
        {
          name: "ENT Specialist",
          doctors: [
            { id: "doc-mum-ent-01", name: "Dr. Farah Contractor", years: 12, experience: "12 years", languages: ["English", "Hindi", "Marathi"], rating: 4.5, consultationFee: 1300, slots: ["Today 18:45", "Tomorrow 10:45"] },
            { id: "doc-mum-ent-02", name: "Dr. Nikhil Paranjpe", years: 15, experience: "15 years", languages: ["English", "Hindi", "Marathi"], rating: 4.7, consultationFee: 1450, slots: ["Today 14:45", "Fri 12:45"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-mum-card-01", name: "Dr. Amit Deshmukh", years: 21, experience: "21 years", languages: ["English", "Hindi", "Marathi"], rating: 4.8, consultationFee: 1900, slots: ["Tomorrow 14:00", "Fri 12:00"] },
            { id: "doc-mum-card-02", name: "Dr. Leena Rao", years: 18, experience: "18 years", languages: ["English", "Hindi", "Marathi"], rating: 4.7, consultationFee: 1800, slots: ["Today 17:30", "Tomorrow 09:30"] },
          ],
        },
        {
          name: "Psychiatrist",
          doctors: [
            { id: "doc-mum-psych-01", name: "Dr. Mira Shah", years: 14, experience: "14 years", languages: ["English", "Hindi", "Gujarati"], rating: 4.7, consultationFee: 1600, slots: ["Tomorrow 17:00", "Sat 10:00"] },
            { id: "doc-mum-psych-02", name: "Dr. Rohan Choksi", years: 10, experience: "10 years", languages: ["English", "Hindi", "Marathi"], rating: 4.5, consultationFee: 1450, slots: ["Today 19:00", "Fri 15:00"] },
          ],
        },
        {
          name: "Gastroenterologist / General Physician",
          doctors: [
            { id: "doc-mum-gastro-01", name: "Dr. Kavita Shenoy", years: 17, experience: "17 years", languages: ["English", "Hindi", "Marathi"], rating: 4.7, consultationFee: 1600, slots: ["Tomorrow 12:20", "Sat 11:20"] },
          ],
        },
        {
          name: "Endocrinologist / Diabetologist",
          doctors: [
            { id: "doc-mum-endo-01", name: "Dr. Harshad Kulkarni", years: 16, experience: "16 years", languages: ["English", "Hindi", "Marathi"], rating: 4.6, consultationFee: 1550, slots: ["Today 16:10", "Tomorrow 14:10"] },
          ],
        },
      ],
    },
    {
      id: "manipal-bengaluru",
      name: "Manipal Hospital",
      city: "Bengaluru",
      area: "Old Airport Road",
      address: "Old Airport Road, Bengaluru",
      latitude: 12.9582,
      longitude: 77.649,
      departments: [
        {
          name: "Pediatrician",
          doctors: [
            { id: "doc-blr-ped-01", name: "Dr. Lakshmi Nair", years: 15, experience: "15 years", languages: ["English", "Kannada", "Hindi"], rating: 4.8, consultationFee: 1400, slots: ["Today 16:00", "Tomorrow 12:00"] },
            { id: "doc-blr-ped-02", name: "Dr. Arjun Hegde", years: 11, experience: "11 years", languages: ["English", "Kannada", "Hindi"], rating: 4.6, consultationFee: 1300, slots: ["Tomorrow 09:20", "Fri 16:20"] },
          ],
        },
        {
          name: "Obstetrician / Gynecologist",
          doctors: [
            { id: "doc-blr-gyn-01", name: "Dr. Priya Menon", years: 16, experience: "16 years", languages: ["English", "Kannada", "Malayalam"], rating: 4.7, consultationFee: 1500, slots: ["Tomorrow 11:00", "Fri 15:00"] },
            { id: "doc-blr-gyn-02", name: "Dr. Nandini Rao", years: 20, experience: "20 years", languages: ["English", "Kannada", "Hindi"], rating: 4.8, consultationFee: 1700, slots: ["Today 15:30", "Tomorrow 17:30"] },
          ],
        },
        {
          name: "Infectious Disease Specialist",
          doctors: [
            { id: "doc-blr-id-01", name: "Dr. Karthik Raman", years: 13, experience: "13 years", languages: ["English", "Kannada", "Hindi"], rating: 4.6, consultationFee: 1600, slots: ["Tomorrow 13:30", "Sat 11:00"] },
            { id: "doc-blr-id-02", name: "Dr. Sameera Iqbal", years: 12, experience: "12 years", languages: ["English", "Kannada", "Hindi", "Urdu"], rating: 4.6, consultationFee: 1550, slots: ["Today 18:10", "Fri 12:10"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-blr-card-01", name: "Dr. Prakash Shetty", years: 22, experience: "22 years", languages: ["English", "Kannada", "Hindi"], rating: 4.8, consultationFee: 1900, slots: ["Tomorrow 10:50", "Sat 09:50"] },
          ],
        },
        {
          name: "Neurologist",
          doctors: [
            { id: "doc-blr-neuro-01", name: "Dr. Swati Murthy", years: 15, experience: "15 years", languages: ["English", "Kannada", "Hindi"], rating: 4.7, consultationFee: 1750, slots: ["Today 17:40", "Tomorrow 13:40"] },
          ],
        },
      ],
    },
    {
      id: "apollo-hyderabad",
      name: "Apollo Hospitals Jubilee Hills",
      city: "Hyderabad",
      area: "Jubilee Hills",
      address: "Jubilee Hills, Hyderabad",
      latitude: 17.4156,
      longitude: 78.4124,
      departments: [
        {
          name: "Pulmonologist / Chest Physician",
          doctors: [
            { id: "doc-hyd-pulm-01", name: "Dr. Sameer Reddy", years: 19, experience: "19 years", languages: ["English", "Telugu", "Hindi"], rating: 4.8, consultationFee: 1600, slots: ["Today 20:00", "Tomorrow 10:30"] },
            { id: "doc-hyd-pulm-02", name: "Dr. Ayesha Fatima", years: 12, experience: "12 years", languages: ["English", "Telugu", "Hindi", "Urdu"], rating: 4.6, consultationFee: 1450, slots: ["Today 16:50", "Fri 11:50"] },
          ],
        },
        {
          name: "Rheumatologist",
          doctors: [
            { id: "doc-hyd-rheum-01", name: "Dr. Nandita Rao", years: 14, experience: "14 years", languages: ["English", "Telugu", "Hindi"], rating: 4.6, consultationFee: 1500, slots: ["Fri 10:00", "Sat 12:30"] },
            { id: "doc-hyd-rheum-02", name: "Dr. Kiran Verma", years: 17, experience: "17 years", languages: ["English", "Telugu", "Hindi"], rating: 4.7, consultationFee: 1600, slots: ["Tomorrow 15:10", "Fri 17:10"] },
          ],
        },
        {
          name: "General Physician / Internal Medicine",
          doctors: [
            { id: "doc-hyd-im-01", name: "Dr. Ravi Teja", years: 13, experience: "13 years", languages: ["English", "Telugu", "Hindi"], rating: 4.5, consultationFee: 1100, slots: ["Today 18:20", "Tomorrow 08:50"] },
          ],
        },
        {
          name: "Gastroenterologist / General Physician",
          doctors: [
            { id: "doc-hyd-gastro-01", name: "Dr. Manisha Kulkarni", years: 16, experience: "16 years", languages: ["English", "Telugu", "Hindi"], rating: 4.7, consultationFee: 1550, slots: ["Tomorrow 12:40", "Sat 13:40"] },
          ],
        },
      ],
    },
    {
      id: "kauvery-chennai",
      name: "Kauvery Hospital",
      city: "Chennai",
      area: "Alwarpet",
      address: "Alwarpet, Chennai",
      latitude: 13.0333,
      longitude: 80.2562,
      departments: [
        {
          name: "Nephrologist",
          doctors: [
            { id: "doc-chn-neph-01", name: "Dr. S. Krishnan", years: 18, experience: "18 years", languages: ["English", "Tamil"], rating: 4.7, consultationFee: 1500, slots: ["Tomorrow 09:30", "Fri 13:30"] },
            { id: "doc-chn-neph-02", name: "Dr. Anand Rajan", years: 14, experience: "14 years", languages: ["English", "Tamil", "Hindi"], rating: 4.6, consultationFee: 1400, slots: ["Today 15:30", "Tomorrow 16:30"] },
          ],
        },
        {
          name: "Ophthalmologist",
          doctors: [
            { id: "doc-chn-eye-01", name: "Dr. Meera Subramanian", years: 12, experience: "12 years", languages: ["English", "Tamil", "Hindi"], rating: 4.5, consultationFee: 1100, slots: ["Today 18:30", "Tomorrow 11:30"] },
            { id: "doc-chn-eye-02", name: "Dr. Vignesh Iyer", years: 15, experience: "15 years", languages: ["English", "Tamil"], rating: 4.7, consultationFee: 1250, slots: ["Tomorrow 10:10", "Fri 14:10"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-chn-card-01", name: "Dr. Janaki Raman", years: 21, experience: "21 years", languages: ["English", "Tamil", "Hindi"], rating: 4.8, consultationFee: 1800, slots: ["Today 17:10", "Tomorrow 12:10"] },
          ],
        },
        {
          name: "Pulmonologist / Chest Physician",
          doctors: [
            { id: "doc-chn-pulm-01", name: "Dr. Ramesh Narayanan", years: 17, experience: "17 years", languages: ["English", "Tamil"], rating: 4.7, consultationFee: 1550, slots: ["Tomorrow 09:50", "Sat 11:50"] },
          ],
        },
        {
          name: "Pediatrician",
          doctors: [
            { id: "doc-chn-ped-01", name: "Dr. Kavitha Balaji", years: 13, experience: "13 years", languages: ["English", "Tamil", "Hindi"], rating: 4.6, consultationFee: 1250, slots: ["Today 16:30", "Tomorrow 13:30"] },
          ],
        },
      ],
    },
    {
      id: "ruby-hall-pune",
      name: "Ruby Hall Clinic",
      city: "Pune",
      area: "Sangamvadi",
      address: "Sangamvadi, Pune",
      latitude: 18.5314,
      longitude: 73.8763,
      departments: [
        {
          name: "Psychiatrist",
          doctors: [
            { id: "doc-pune-psych-01", name: "Dr. Rhea Kulkarni", years: 11, experience: "11 years", languages: ["English", "Hindi", "Marathi"], rating: 4.6, consultationFee: 1400, slots: ["Tomorrow 16:30", "Sat 09:30"] },
            { id: "doc-pune-psych-02", name: "Dr. Omkar Joshi", years: 15, experience: "15 years", languages: ["English", "Hindi", "Marathi"], rating: 4.7, consultationFee: 1550, slots: ["Today 18:20", "Fri 11:20"] },
          ],
        },
        {
          name: "General Physician / Internal Medicine",
          doctors: [
            { id: "doc-pune-im-01", name: "Dr. Shashank Patil", years: 12, experience: "12 years", languages: ["English", "Hindi", "Marathi"], rating: 4.5, consultationFee: 1000, slots: ["Today 17:45", "Tomorrow 09:00"] },
            { id: "doc-pune-im-02", name: "Dr. Neha Apte", years: 14, experience: "14 years", languages: ["English", "Hindi", "Marathi"], rating: 4.6, consultationFee: 1150, slots: ["Today 12:45", "Tomorrow 15:45"] },
          ],
        },
        {
          name: "Orthopedist",
          doctors: [
            { id: "doc-pune-ortho-01", name: "Dr. Aditya Gokhale", years: 18, experience: "18 years", languages: ["English", "Hindi", "Marathi"], rating: 4.7, consultationFee: 1450, slots: ["Tomorrow 10:30", "Sat 12:00"] },
          ],
        },
        {
          name: "Endocrinologist / Diabetologist",
          doctors: [
            { id: "doc-pune-endo-01", name: "Dr. Snehal Desai", years: 13, experience: "13 years", languages: ["English", "Hindi", "Marathi"], rating: 4.6, consultationFee: 1350, slots: ["Today 16:10", "Fri 14:10"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-pune-card-01", name: "Dr. Milind Karandikar", years: 20, experience: "20 years", languages: ["English", "Hindi", "Marathi"], rating: 4.8, consultationFee: 1750, slots: ["Tomorrow 12:30", "Fri 17:30"] },
          ],
        },
      ],
    },
    {
      id: "amri-kolkata",
      name: "AMRI Hospitals",
      city: "Kolkata",
      area: "Dhakuria",
      address: "Dhakuria, Kolkata",
      latitude: 22.5074,
      longitude: 88.367,
      departments: [
        {
          name: "Gastroenterologist / General Physician",
          doctors: [
            { id: "doc-kol-gastro-01", name: "Dr. Arindam Basu", years: 16, experience: "16 years", languages: ["English", "Hindi", "Bengali"], rating: 4.7, consultationFee: 1300, slots: ["Tomorrow 12:30", "Fri 16:00"] },
            { id: "doc-kol-gastro-02", name: "Dr. Nabanita Sen", years: 14, experience: "14 years", languages: ["English", "Hindi", "Bengali"], rating: 4.6, consultationFee: 1250, slots: ["Today 15:50", "Tomorrow 10:50"] },
          ],
        },
        {
          name: "Dermatologist",
          doctors: [
            { id: "doc-kol-derm-01", name: "Dr. Ishita Roy", years: 10, experience: "10 years", languages: ["English", "Hindi", "Bengali"], rating: 4.5, consultationFee: 1000, slots: ["Today 18:00", "Sat 12:00"] },
            { id: "doc-kol-derm-02", name: "Dr. Sagnik Mitra", years: 12, experience: "12 years", languages: ["English", "Hindi", "Bengali"], rating: 4.6, consultationFee: 1150, slots: ["Tomorrow 11:10", "Fri 15:10"] },
          ],
        },
        {
          name: "Cardiologist",
          doctors: [
            { id: "doc-kol-card-01", name: "Dr. Anupam Chatterjee", years: 19, experience: "19 years", languages: ["English", "Hindi", "Bengali"], rating: 4.7, consultationFee: 1600, slots: ["Today 17:30", "Tomorrow 13:30"] },
          ],
        },
        {
          name: "Neurologist",
          doctors: [
            { id: "doc-kol-neuro-01", name: "Dr. Debolina Mukherjee", years: 16, experience: "16 years", languages: ["English", "Hindi", "Bengali"], rating: 4.7, consultationFee: 1550, slots: ["Tomorrow 09:30", "Sat 10:30"] },
          ],
        },
        {
          name: "General Physician / Internal Medicine",
          doctors: [
            { id: "doc-kol-im-01", name: "Dr. Subhajit Ghosh", years: 13, experience: "13 years", languages: ["English", "Hindi", "Bengali"], rating: 4.5, consultationFee: 1050, slots: ["Today 19:10", "Tomorrow 12:10"] },
          ],
        },
      ],
    },
  ],
};
