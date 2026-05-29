export const PAPER_DATA: Record<
  string,
  {
    part1: { q: string; unit: string }[];
    part2: { q: string; unit: string }[];
    part3: { q: string; unit: string }[];
    part4: { q: string; unit: string }[];
  }
> = {
  Mathematics: {
    part1: [
      { q: "What is the value of sin(90°)?", unit: "Trigonometry" },
      { q: "Simplify: (x²)(x³)", unit: "Algebra" },
      {
        q: "What is the area of a square with side 4 units?",
        unit: "Geometry",
      },
      { q: "Define 'mean' in statistics.", unit: "Statistics" },
      { q: "What is the derivative of a constant?", unit: "Calculus" },
      { q: "Is 17 a prime number? (Yes/No)", unit: "Number Theory" },
    ],
    part2: [
      { q: "Solve: 3x + 7 = 22. Find x.", unit: "Algebra" },
      { q: "Find the derivative of f(x) = 5x³ − 2x + 1.", unit: "Calculus" },
      {
        q: "Two angles of a triangle are 60° and 80°. Find the third angle.",
        unit: "Geometry",
      },
      { q: "If the mean of 5, 7, x is 8, find x.", unit: "Statistics" },
      { q: "Convert 135° to radians.", unit: "Trigonometry" },
    ],
    part3: [
      {
        q: "Solve the quadratic equation 2x² − 5x + 3 = 0 using the quadratic formula. Show all steps.",
        unit: "Algebra",
      },
      {
        q: "Find the area under the curve y = 3x² from x = 0 to x = 3 using definite integration.",
        unit: "Calculus",
      },
      {
        q: "Calculate the standard deviation of the data set: 4, 8, 6, 5, 3, 2, 8, 9, 2, 5.",
        unit: "Statistics",
      },
      {
        q: "Prove that sin²θ + cos²θ = 1 using a right-angled triangle.",
        unit: "Trigonometry",
      },
    ],
    part4: [
      {
        q: "A company's revenue (in ₹ lakhs) over 5 years is: 12, 18, 15, 22, 30. (a) Find the mean revenue. (b) Find the variance and standard deviation. (c) Interpret your results and predict the trend for year 6.",
        unit: "Statistics",
      },
      {
        q: "Derive the formula for the surface area and volume of a sphere of radius r. Using these formulas, find the total surface area and volume of a sphere whose diameter is 14 cm. (Use π = 22/7)",
        unit: "Geometry",
      },
    ],
  },
  Physics: {
    part1: [
      { q: "What is the SI unit of force?", unit: "Mechanics" },
      { q: "State one example of a conductor.", unit: "Electromagnetism" },
      { q: "What is the speed of light in vacuum (approx)?", unit: "Optics" },
      { q: "Define frequency of a wave.", unit: "Waves" },
      {
        q: "Name the scientist who proposed the photoelectric effect.",
        unit: "Modern Physics",
      },
      { q: "What is absolute zero temperature?", unit: "Thermodynamics" },
    ],
    part2: [
      {
        q: "A body of mass 10 kg is moving with a velocity of 5 m/s. Find its kinetic energy.",
        unit: "Mechanics",
      },
      {
        q: "State and explain Ohm's Law with a diagram.",
        unit: "Electromagnetism",
      },
      {
        q: "Define critical angle. What happens at angles greater than critical angle?",
        unit: "Optics",
      },
      {
        q: "Differentiate between transverse and longitudinal waves with examples.",
        unit: "Waves",
      },
      {
        q: "State the first law of thermodynamics and write its mathematical form.",
        unit: "Thermodynamics",
      },
    ],
    part3: [
      {
        q: "A ball is thrown vertically upward with an initial velocity of 20 m/s. Find (a) the maximum height reached, (b) the time to reach the maximum height, and (c) the total time of flight. (g = 10 m/s²)",
        unit: "Mechanics",
      },
      {
        q: "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. Find the equivalent resistance. If a 12V battery is connected across this combination, find the current through each resistor.",
        unit: "Electromagnetism",
      },
      {
        q: "Explain the phenomenon of total internal reflection with a neat diagram. Derive the expression for critical angle in terms of refractive indices.",
        unit: "Optics",
      },
      {
        q: "Explain the working principle of a heat engine. Define efficiency and derive the expression for Carnot efficiency.",
        unit: "Thermodynamics",
      },
    ],
    part4: [
      {
        q: "A charged particle of mass 2×10⁻²⁷ kg and charge 1.6×10⁻¹⁹ C is accelerated through a potential difference of 1000 V. It then enters a uniform magnetic field of 0.1 T perpendicular to its velocity. (a) Find the velocity of the particle after acceleration. (b) Find the radius of the circular path in the magnetic field. (c) Calculate the time period of revolution. (d) What happens to the radius if the particle is replaced by a heavier isotope?",
        unit: "Electromagnetism",
      },
      {
        q: "With a neat labelled diagram, explain the construction and working of a compound microscope. Derive the expression for its total magnification when the final image is formed at the near point (D = 25 cm). State any two differences between a microscope and a telescope.",
        unit: "Optics",
      },
    ],
  },
  Chemistry: {
    part1: [
      { q: "What is the molecular formula of water?", unit: "Inorganic" },
      {
        q: "State the number of particles in 1 mole of a substance.",
        unit: "Physical",
      },
      { q: "Is NaCl an ionic or covalent compound?", unit: "Inorganic" },
      { q: "Name the functional group present in alcohols.", unit: "Organic" },
      { q: "Define pH.", unit: "Analytical" },
      { q: "What is a monomer?", unit: "Polymer" },
    ],
    part2: [
      {
        q: "Calculate the number of moles in 36 g of water (M = 18 g/mol).",
        unit: "Physical",
      },
      {
        q: "State Le Chatelier's principle and give one example of its application.",
        unit: "Physical",
      },
      {
        q: "Differentiate between electrophile and nucleophile.",
        unit: "Organic",
      },
      {
        q: "What is paper chromatography? Mention one application.",
        unit: "Analytical",
      },
      { q: "Define addition polymerization with an example.", unit: "Polymer" },
    ],
    part3: [
      {
        q: "Explain the mechanism of SN1 reaction with a suitable example. Draw the energy profile diagram and identify the rate-determining step.",
        unit: "Organic",
      },
      {
        q: "State and explain Le Chatelier's principle. Apply it to the Haber process for synthesis of ammonia, explaining the effect of temperature, pressure, and concentration.",
        unit: "Physical",
      },
      {
        q: "Describe the principle and procedure of thin-layer chromatography (TLC). How is Rf value calculated and what does it indicate?",
        unit: "Analytical",
      },
      {
        q: "Explain ionic product of water (Kw). Derive the relationship between pH and pOH. Calculate the pH of a 0.01 M HCl solution.",
        unit: "Physical",
      },
    ],
    part4: [
      {
        q: "(a) Explain the concept of hybridization in carbon. Draw and describe the geometry of sp, sp², and sp³ hybridized carbon atoms with suitable examples. (b) Explain the structure of benzene using the concept of resonance. Why does benzene prefer electrophilic substitution over addition reactions? Give two examples of electrophilic substitution in benzene.",
        unit: "Organic",
      },
      {
        q: "Write a detailed note on coordination polymers: (a) Define coordination polymers and distinguish them from addition and condensation polymers. (b) Explain the mechanism of condensation polymerization with the synthesis of Nylon-6,6. (c) Discuss the properties and applications of Bakelite in industrial contexts. (d) What are biodegradable polymers? Give two examples and explain their significance.",
        unit: "Polymer",
      },
    ],
  },
  Biology: {
    part1: [
      { q: "What is the powerhouse of the cell?", unit: "Cell Biology" },
      {
        q: "Name the molecule that carries genetic information.",
        unit: "Genetics",
      },
      { q: "Define ecology.", unit: "Ecology" },
      { q: "What is the function of the heart?", unit: "Human Physiology" },
      { q: "Name one example of a gymnosperm plant.", unit: "Botany" },
      { q: "What is metamorphosis in insects?", unit: "Zoology" },
    ],
    part2: [
      { q: "Differentiate between mitosis and meiosis.", unit: "Genetics" },
      {
        q: "What is osmosis? How does it differ from diffusion?",
        unit: "Cell Biology",
      },
      {
        q: "Explain the concept of a food web with a simple example.",
        unit: "Ecology",
      },
      {
        q: "What is the role of haemoglobin in the blood?",
        unit: "Human Physiology",
      },
      {
        q: "Define transpiration. State its importance in plants.",
        unit: "Botany",
      },
    ],
    part3: [
      {
        q: "Explain the process of DNA replication with a neat diagram. Identify the key enzymes involved and describe the roles of each.",
        unit: "Genetics",
      },
      {
        q: "Describe the light-dependent and light-independent reactions of photosynthesis. Where in the chloroplast does each stage occur?",
        unit: "Botany",
      },
      {
        q: "Explain the mechanism of nerve impulse transmission across a synapse. Include the role of neurotransmitters.",
        unit: "Human Physiology",
      },
      {
        q: "Define ecological succession. Explain primary succession with an example from a bare rock ecosystem.",
        unit: "Ecology",
      },
    ],
    part4: [
      {
        q: "The human immune system is the body's defense against disease. (a) Distinguish between innate and adaptive immunity. (b) Explain the role of B-lymphocytes and T-lymphocytes in immune response. (c) Describe how vaccines stimulate immunity. (d) What is an autoimmune disease? Give two examples and explain the underlying mechanism.",
        unit: "Human Physiology",
      },
      {
        q: "Write a comprehensive account of Mendelian genetics: (a) State Mendel's Law of Segregation and Law of Independent Assortment. (b) Solve a dihybrid cross for seed color (yellow/green) and seed shape (round/wrinkled). (c) Explain codominance with the example of ABO blood group system. (d) What are sex-linked traits? Give one example and explain its inheritance pattern.",
        unit: "Genetics",
      },
    ],
  },
  History: {
    part1: [
      { q: "In which year did India gain independence?", unit: "Independence" },
      { q: "Who was the first Prime Minister of India?", unit: "Independence" },
      { q: "Name the treaty that ended World War I.", unit: "World Wars" },
      { q: "Which empire did Alexander the Great build?", unit: "Ancient" },
      { q: "What does 'Renaissance' mean?", unit: "Medieval" },
      {
        q: "In which year did the Berlin Wall fall?",
        unit: "Post-Independence",
      },
    ],
    part2: [
      { q: "What were the main causes of World War II?", unit: "World Wars" },
      {
        q: "Briefly explain the significance of the Magna Carta.",
        unit: "Medieval",
      },
      {
        q: "Who led the Non-Cooperation Movement in India? Describe its significance.",
        unit: "Independence",
      },
      {
        q: "What was the French Revolution? Mention its immediate causes.",
        unit: "Modern",
      },
      {
        q: "Explain the concept of the Cold War between the USA and USSR.",
        unit: "Post-Independence",
      },
    ],
    part3: [
      {
        q: "Explain the causes and consequences of the First World War. How did it reshape the political map of Europe? What role did the Treaty of Versailles play in sowing the seeds of World War II?",
        unit: "World Wars",
      },
      {
        q: "Trace the role of Mahatma Gandhi in India's independence movement. Discuss the Dandi March and its significance in the context of the Civil Disobedience Movement.",
        unit: "Independence",
      },
      {
        q: "Describe the major achievements of the Mauryan Empire under Emperor Ashoka. How did his conversion to Buddhism influence governance and foreign policy?",
        unit: "Ancient",
      },
      {
        q: "Explain the causes and outcomes of the French Revolution. How did the Declaration of the Rights of Man and Citizen reflect Enlightenment ideals?",
        unit: "Modern",
      },
    ],
    part4: [
      {
        q: "The Second World War (1939–1945) was one of the most devastating conflicts in human history. (a) Analyze the long-term and immediate causes of World War II, including the role of appeasement policy. (b) Describe the major turning points of the war — Battle of Stalingrad, D-Day, and the Pacific Theatre. (c) Critically evaluate the use of atomic bombs on Hiroshima and Nagasaki. Was it justified? (d) Explain how the war led to the formation of the United Nations and the beginning of the Cold War.",
        unit: "World Wars",
      },
      {
        q: "Indian civilization has evolved over thousands of years across distinct phases. (a) Describe the key features of the Indus Valley Civilization — urban planning, trade, and decline. (b) Explain the political and cultural achievements of the Gupta Empire — often called India's Golden Age. (c) Assess the impact of British colonial rule on India's economy, society, and political consciousness. (d) How did the partition of India in 1947 unfold, and what were its immediate and long-term consequences for the subcontinent?",
        unit: "Ancient",
      },
    ],
  },
};

export const PARTS = [
  {
    key: "part1",
    label: "Part A",
    marks: 1,
    desc: "Very Short Answer Questions",
    cls: "ep-part1",
    icon: "①",
  },
  {
    key: "part2",
    label: "Part B",
    marks: 2,
    desc: "Short Answer Questions",
    cls: "ep-part2",
    icon: "②",
  },
  {
    key: "part3",
    label: "Part C",
    marks: 5,
    desc: "Long Answer Questions",
    cls: "ep-part3",
    icon: "③",
  },
  {
    key: "part4",
    label: "Part D",
    marks: 10,
    desc: "Essay / Analytical Questions",
    cls: "ep-part4",
    icon: "④",
  },
];
