(() => {
  const medicineConfig = window.MEDICINE_CONFIG;
  if (!medicineConfig) return;

  const seedCatalog = [
    ["Amoxicillin 500mg", ["amoxicillin", "amoxycillin"], [["Generic", "Amoxicillin 500", "10 capsules", 68], ["Cipla", "Novamox 500", "10 capsules", 118]]],
    ["Amoxicillin + Clavulanic Acid 625mg", ["amoxicillin clavulanate", "amoxyclav", "clavulanic"], [["Generic", "Co-amoxiclav 625", "6 tablets", 145], ["GSK", "Augmentin 625 Duo", "10 tablets", 204]]],
    ["Cefixime 200mg", ["cefixime"], [["Generic", "Cefixime 200", "10 tablets", 86], ["Cipla", "Cefoprox 200", "10 tablets", 168]]],
    ["Cefuroxime 500mg", ["cefuroxime"], [["Generic", "Cefuroxime 500", "6 tablets", 142], ["GSK", "Ceftum 500", "4 tablets", 250]]],
    ["Doxycycline 100mg", ["doxycycline"], [["Generic", "Doxycycline 100", "10 capsules", 42], ["Pfizer", "Doxicip 100", "10 capsules", 71]]],
    ["Metronidazole 400mg", ["metronidazole"], [["Generic", "Metronidazole 400", "15 tablets", 24], ["Abbott", "Flagyl 400", "15 tablets", 32]]],
    ["Nitrofurantoin 100mg", ["nitrofurantoin"], [["Generic", "Nitrofurantoin 100", "10 capsules", 54], ["Sun Pharma", "Niftas 100", "10 tablets", 122]]],
    ["Norfloxacin 400mg", ["norfloxacin"], [["Generic", "Norfloxacin 400", "10 tablets", 48], ["Cipla", "Norilet 400", "10 tablets", 74]]],
    ["Ofloxacin 200mg", ["ofloxacin"], [["Generic", "Ofloxacin 200", "10 tablets", 52], ["Cipla", "Oflox 200", "10 tablets", 83]]],
    ["Levofloxacin 500mg", ["levofloxacin"], [["Generic", "Levofloxacin 500", "10 tablets", 76], ["Cipla", "Levoday 500", "10 tablets", 118]]],
    ["Salbutamol inhaler 100mcg", ["salbutamol", "albuterol"], [["Generic", "Salbutamol Inhaler", "200 doses", 142], ["Cipla", "Asthalin Inhaler", "200 doses", 172]]],
    ["Budesonide inhaler 200mcg", ["budesonide"], [["Generic", "Budesonide Inhaler", "200 doses", 252], ["Cipla", "Budecort 200", "200 doses", 334]]],
    ["Montelukast 10mg", ["montelukast"], [["Generic", "Montelukast 10", "10 tablets", 62], ["MSD", "Montair 10", "15 tablets", 260]]],
    ["Levocetirizine 5mg", ["levocetirizine"], [["Generic", "Levocetirizine 5", "10 tablets", 18], ["Dr. Reddy's", "Teczine 5", "10 tablets", 83]]],
    ["Fexofenadine 120mg", ["fexofenadine"], [["Generic", "Fexofenadine 120", "10 tablets", 76], ["Sanofi", "Allegra 120", "10 tablets", 190]]],
    ["Ibuprofen 400mg", ["ibuprofen"], [["Generic", "Ibuprofen 400", "10 tablets", 18], ["Abbott", "Brufen 400", "15 tablets", 34]]],
    ["Diclofenac 50mg", ["diclofenac"], [["Generic", "Diclofenac 50", "10 tablets", 16], ["Novartis", "Voveran 50", "15 tablets", 97]]],
    ["Naproxen 250mg", ["naproxen"], [["Generic", "Naproxen 250", "10 tablets", 42], ["RPG", "Naprosyn 250", "15 tablets", 88]]],
    ["Aceclofenac 100mg", ["aceclofenac"], [["Generic", "Aceclofenac 100", "10 tablets", 36], ["Intas", "Hifenac 100", "10 tablets", 72]]],
    ["Ondansetron 4mg", ["ondansetron"], [["Generic", "Ondansetron 4", "10 tablets", 42], ["GSK", "Emeset 4", "10 tablets", 58]]],
    ["Domperidone 10mg", ["domperidone"], [["Generic", "Domperidone 10", "10 tablets", 24], ["Torrent", "Domstal 10", "10 tablets", 44]]],
    ["Loperamide 2mg", ["loperamide"], [["Generic", "Loperamide 2", "10 capsules", 28], ["Janssen", "Imodium", "4 capsules", 56]]],
    ["Racecadotril 100mg", ["racecadotril"], [["Generic", "Racecadotril 100", "10 capsules", 96], ["Abbott", "Redotil 100", "10 capsules", 168]]],
    ["Lactulose syrup", ["lactulose"], [["Generic", "Lactulose Syrup", "100 ml", 92], ["Abbott", "Duphalac", "150 ml", 220]]],
    ["Psyllium husk", ["psyllium", "isabgol"], [["Generic", "Isabgol Husk", "100 g", 78], ["Dabur", "Sat Isabgol", "100 g", 155]]],
    ["Omeprazole 20mg", ["omeprazole"], [["Generic", "Omeprazole 20", "15 capsules", 32], ["Dr. Reddy's", "Omez 20", "20 capsules", 82]]],
    ["Rabeprazole 20mg", ["rabeprazole"], [["Generic", "Rabeprazole 20", "10 tablets", 48], ["Intas", "Rablet 20", "15 tablets", 155]]],
    ["Metformin 500mg", ["metformin"], [["Generic", "Metformin 500", "20 tablets", 24], ["USV", "Glycomet 500", "20 tablets", 41]]],
    ["Glimepiride 1mg", ["glimepiride"], [["Generic", "Glimepiride 1", "10 tablets", 28], ["Sanofi", "Amaryl 1", "30 tablets", 176]]],
    ["Sitagliptin 100mg", ["sitagliptin"], [["Generic", "Sitagliptin 100", "10 tablets", 145], ["MSD", "Januvia 100", "7 tablets", 308]]],
    ["Amlodipine 5mg", ["amlodipine"], [["Generic", "Amlodipine 5", "15 tablets", 18], ["Pfizer", "Amlogard 5", "30 tablets", 76]]],
    ["Telmisartan 40mg", ["telmisartan"], [["Generic", "Telmisartan 40", "10 tablets", 38], ["Glenmark", "Telma 40", "30 tablets", 215]]],
    ["Losartan 50mg", ["losartan"], [["Generic", "Losartan 50", "10 tablets", 34], ["MSD", "Repace 50", "15 tablets", 118]]],
    ["Atenolol 50mg", ["atenolol"], [["Generic", "Atenolol 50", "14 tablets", 18], ["Zydus", "Aten 50", "14 tablets", 30]]],
    ["Atorvastatin 10mg", ["atorvastatin"], [["Generic", "Atorvastatin 10", "10 tablets", 36], ["Pfizer", "Lipitor 10", "15 tablets", 165]]],
    ["Rosuvastatin 10mg", ["rosuvastatin"], [["Generic", "Rosuvastatin 10", "10 tablets", 58], ["AstraZeneca", "Crestor 10", "15 tablets", 310]]],
    ["Aspirin 75mg", ["aspirin", "ecosprin"], [["Generic", "Aspirin 75", "14 tablets", 8], ["USV", "Ecosprin 75", "14 tablets", 10]]],
    ["Clopidogrel 75mg", ["clopidogrel"], [["Generic", "Clopidogrel 75", "10 tablets", 44], ["Sanofi", "Clopilet 75", "15 tablets", 132]]],
    ["Levothyroxine 50mcg", ["levothyroxine", "thyroxine"], [["Generic", "Levothyroxine 50", "100 tablets", 95], ["Abbott", "Thyronorm 50", "120 tablets", 173]]],
    ["Ferrous Ascorbate + Folic Acid", ["ferrous", "folic acid", "iron"], [["Generic", "Iron Folic Acid", "10 tablets", 32], ["Aristo", "Orofer XT", "10 tablets", 165]]],
    ["Vitamin D3 60000 IU", ["vitamin d3", "cholecalciferol"], [["Generic", "Cholecalciferol 60K", "4 sachets", 64], ["USV", "D Rise 60K", "4 sachets", 118]]],
    ["Calcium Carbonate + Vitamin D3", ["calcium", "calcium d3"], [["Generic", "Calcium D3", "15 tablets", 72], ["Torrent", "Shelcal 500", "15 tablets", 138]]],
    ["Mupirocin ointment", ["mupirocin"], [["Generic", "Mupirocin Ointment", "5 g", 72], ["GSK", "T-Bact", "5 g", 143]]],
    ["Clotrimazole cream", ["clotrimazole"], [["Generic", "Clotrimazole Cream", "15 g", 38], ["Bayer", "Canesten", "30 g", 142]]],
    ["Permethrin 5% cream", ["permethrin"], [["Generic", "Permethrin 5%", "30 g", 72], ["Curatio", "Permite 5%", "60 g", 174]]],
    ["Acyclovir 400mg", ["acyclovir", "aciclovir"], [["Generic", "Acyclovir 400", "10 tablets", 82], ["GSK", "Zovirax 400", "10 tablets", 224]]],
    ["Fluconazole 150mg", ["fluconazole"], [["Generic", "Fluconazole 150", "1 tablet", 14], ["Pfizer", "Forcan 150", "1 tablet", 21]]],
    ["Albendazole 400mg", ["albendazole"], [["Generic", "Albendazole 400", "1 tablet", 11], ["GSK", "Zentel 400", "1 tablet", 18]]],
    ["Ciprofloxacin eye drops", ["ciprofloxacin eye", "ciplox eye"], [["Generic", "Ciprofloxacin Eye Drops", "10 ml", 24], ["Cipla", "Ciplox Eye Drops", "10 ml", 36]]],
    ["Carboxymethylcellulose eye drops", ["carboxymethylcellulose", "lubricant eye"], [["Generic", "CMC Eye Drops", "10 ml", 92], ["Allergan", "Refresh Tears", "10 ml", 152]]],
  ];

  const existing = new Set((medicineConfig.catalog || []).map((item) => item.salt.toLowerCase()));
  const additions = seedCatalog
    .filter(([salt]) => !existing.has(salt.toLowerCase()))
    .map(([salt, aliases, brands]) => ({
      salt,
      aliases,
      brands: brands.map(([company, brand, unit, price]) => ({ company, brand, unit, price })),
    }));

  medicineConfig.catalog = [...(medicineConfig.catalog || []), ...additions];
  medicineConfig.seedMetadata = {
    medicineRecordCount: medicineConfig.catalog.length,
    sourceNote: "Medicine salts are seeded from common Indian OPD prescription patterns and essential-medicine list references. Prices are sample demo values and must be replaced by a licensed pharmacy/pricing API for production.",
  };
})();
