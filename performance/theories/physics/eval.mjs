export const min_complex = 52;

export const cases = [
  {
    action: 'prove',
    input_nl: 'Prove that force equals mass times acceleration',
    input_dsl: 'prove equals Force (times Mass Acceleration)',
    expected_nl: 'Force equals mass times acceleration by Newton\'s Second Law',
    proof_nl: [
      'Step 1: Apply Newton_Second_Law theorem',
      'Step 2: Force is defined as mass times acceleration (F = ma)',
      'Step 3: This is the fundamental equation of classical dynamics',
      'Step 4: The relationship holds for all classical mechanics scenarios',
      'Step 5: QED - Force equals mass times acceleration'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that momentum equals mass times velocity',
    input_dsl: 'prove equals Momentum (times Mass Velocity)',
    expected_nl: 'Momentum equals mass times velocity by definition',
    proof_nl: [
      'Step 1: Apply Momentum_Definition theorem',
      'Step 2: Momentum is defined as the product of mass and velocity',
      'Step 3: Momentum is a vector quantity with units kg·m/s',
      'Step 4: Momentum is conserved in collisions',
      'Step 5: QED - Momentum equals mass times velocity'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that kinetic energy equals one half mass times velocity squared',
    input_dsl: 'prove equals KineticEnergy (times 0.5 (times Mass (square Velocity)))',
    expected_nl: 'Kinetic energy equals one half mass times velocity squared',
    proof_nl: [
      'Step 1: Apply Kinetic_Energy_Definition theorem',
      'Step 2: Kinetic energy represents energy of motion',
      'Step 3: KE = (1/2)mv² is derived from work-energy theorem',
      'Step 4: Energy is scalar and frame-dependent',
      'Step 5: QED - Kinetic energy equals one half mass times velocity squared'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove work equals force times displacement',
    input_dsl: 'prove equals Work (times Force Displacement)',
    expected_nl: 'Work equals force times displacement times cosine of angle',
    proof_nl: [
      'Step 1: Apply Work_Definition theorem',
      'Step 2: Work is the dot product of force and displacement vectors',
      'Step 3: W = F·d = Fd cos(θ) where θ is angle between vectors',
      'Step 4: Work is a scalar quantity with units of joules',
      'Step 5: QED - Work equals force times displacement'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove voltage equals current times resistance',
    input_dsl: 'prove equals Voltage (times Current Resistance)',
    expected_nl: 'Voltage equals current times resistance by Ohm\'s Law',
    proof_nl: [
      'Step 1: Apply Ohms_Law theorem',
      'Step 2: Ohm\'s Law states V = IR for ohmic materials',
      'Step 3: This is a linear relationship fundamental to circuit analysis',
      'Step 4: Valid for conductors with constant resistance',
      'Step 5: QED - Voltage equals current times resistance'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove energy equals mass times speed of light squared',
    input_dsl: 'prove equals Energy (times Mass (square SpeedOfLight))',
    expected_nl: 'Energy equals mass times speed of light squared by mass-energy equivalence',
    proof_nl: [
      'Step 1: Apply Mass_Energy_Equivalence theorem',
      'Step 2: Einstein\'s famous equation E = mc² from special relativity',
      'Step 3: Demonstrates equivalence and interconvertibility of mass and energy',
      'Step 4: Fundamental to nuclear physics and cosmology',
      'Step 5: QED - Energy equals mass times speed of light squared'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove gravitational potential energy equals mass times gravity times height',
    input_dsl: 'prove equals PotentialEnergy (times Mass (times Gravity Height))',
    expected_nl: 'Gravitational potential energy equals mass times gravity times height',
    proof_nl: [
      'Step 1: Apply Potential_Energy_Gravitational theorem',
      'Step 2: PE = mgh for objects in uniform gravitational field',
      'Step 3: Energy is stored due to position above reference point',
      'Step 4: Convertible to kinetic energy when object falls',
      'Step 5: QED - Gravitational potential energy equals mgh'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the first law of thermodynamics',
    input_dsl: 'prove equals InternalEnergyChange (minus HeatAdded WorkDone)',
    expected_nl: 'Internal energy change equals heat added minus work done by the system',
    proof_nl: [
      'Step 1: Apply First_Law_Thermodynamics theorem',
      'Step 2: ΔU = Q - W expresses conservation of energy',
      'Step 3: Heat added increases internal energy, work done decreases it',
      'Step 4: Fundamental principle connecting thermal and mechanical energy',
      'Step 5: QED - First law of thermodynamics proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Coulomb\'s law for electric force',
    input_dsl: 'prove proportional ElectricForce (divide (times Charge1 Charge2) (square Distance))',
    expected_nl: 'Electric force is proportional to product of charges divided by distance squared',
    proof_nl: [
      'Step 1: Apply Coulomb_Law theorem',
      'Step 2: F = k(q₁q₂)/r² where k is Coulomb\'s constant',
      'Step 3: Inverse square law analogous to gravitation',
      'Step 4: Force can be attractive or repulsive depending on charge signs',
      'Step 5: QED - Coulomb\'s law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove photon energy equals Planck constant times frequency',
    input_dsl: 'prove equals PhotonEnergy (times PlanckConstant Frequency)',
    expected_nl: 'Photon energy equals Planck constant times frequency',
    proof_nl: [
      'Step 1: Apply Photon_Energy theorem',
      'Step 2: E = hf is the fundamental quantum relationship',
      'Step 3: Demonstrates particle nature of electromagnetic radiation',
      'Step 4: Planck constant h ≈ 6.626 × 10⁻³⁴ J·s',
      'Step 5: QED - Photon energy equals Planck constant times frequency'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove wave velocity equals frequency times wavelength',
    input_dsl: 'prove equals WaveVelocity (times Frequency Wavelength)',
    expected_nl: 'Wave velocity equals frequency times wavelength',
    proof_nl: [
      'Step 1: Apply Wave_Velocity_Equation theorem',
      'Step 2: v = fλ is universal for all wave types',
      'Step 3: Frequency is cycles per second, wavelength is meters per cycle',
      'Step 4: Product gives velocity in meters per second',
      'Step 5: QED - Wave velocity equals frequency times wavelength'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove electric power equals voltage times current',
    input_dsl: 'prove equals Power (times Voltage Current)',
    expected_nl: 'Electric power equals voltage times current',
    proof_nl: [
      'Step 1: Apply Power_Electric_Circuit theorem',
      'Step 2: P = VI is fundamental power relation in circuits',
      'Step 3: Can also be expressed as P = I²R or P = V²/R',
      'Step 4: Power is rate of energy transfer in watts',
      'Step 5: QED - Electric power equals voltage times current'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove capacitance equals charge divided by voltage',
    input_dsl: 'prove equals Capacitance (divide Charge Voltage)',
    expected_nl: 'Capacitance equals charge divided by voltage',
    proof_nl: [
      'Step 1: Apply Capacitance_Definition theorem',
      'Step 2: C = Q/V defines capacitance in farads',
      'Step 3: Capacitance depends on geometry and dielectric material',
      'Step 4: Capacitors store electric charge and energy',
      'Step 5: QED - Capacitance equals charge divided by voltage'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the ideal gas law',
    input_dsl: 'prove equals (times Pressure Volume) (times Moles (times GasConstant Temperature))',
    expected_nl: 'Pressure times volume equals moles times gas constant times temperature',
    proof_nl: [
      'Step 1: Apply Ideal_Gas_Law theorem',
      'Step 2: PV = nRT relates state variables for ideal gas',
      'Step 3: R ≈ 8.314 J/(mol·K) is universal gas constant',
      'Step 4: Excellent approximation for many real gases',
      'Step 5: QED - Ideal gas law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Snell\'s law of refraction',
    input_dsl: 'prove equals (times RefractiveIndex1 (sin IncidentAngle)) (times RefractiveIndex2 (sin RefractedAngle))',
    expected_nl: 'n₁sin(θ₁) equals n₂sin(θ₂) at media boundary',
    proof_nl: [
      'Step 1: Apply Snell_Law_Refraction theorem',
      'Step 2: Snell\'s law describes bending of light at interfaces',
      'Step 3: Refractive index n = c/v relates light speed in medium to vacuum',
      'Step 4: Light bends toward normal when entering denser medium',
      'Step 5: QED - Snell\'s law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove torque equals moment of inertia times angular acceleration',
    input_dsl: 'prove equals Torque (times MomentOfInertia AngularAcceleration)',
    expected_nl: 'Torque equals moment of inertia times angular acceleration',
    proof_nl: [
      'Step 1: Apply Angular_Acceleration_Torque theorem',
      'Step 2: τ = Iα is rotational analog of Newton\'s second law',
      'Step 3: Fundamental equation for rotational dynamics',
      'Step 4: Moment of inertia I depends on mass distribution',
      'Step 5: QED - Torque equals moment of inertia times angular acceleration'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Faraday\'s law of electromagnetic induction',
    input_dsl: 'prove equals InducedEMF (negative (derivative MagneticFlux Time))',
    expected_nl: 'Induced EMF equals negative time derivative of magnetic flux',
    proof_nl: [
      'Step 1: Apply Faraday_Law_Induction theorem',
      'Step 2: ε = -dΦ/dt is fundamental to electromagnetic induction',
      'Step 3: Changing magnetic flux induces electric field',
      'Step 4: Negative sign represents Lenz\'s law - induced effects oppose change',
      'Step 5: QED - Faraday\'s law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove conservation of energy',
    input_dsl: 'prove conserved TotalEnergy',
    expected_nl: 'Total energy is conserved in isolated systems',
    proof_nl: [
      'Step 1: Apply Conservation_Of_Energy theorem',
      'Step 2: Energy cannot be created or destroyed, only transformed',
      'Step 3: Fundamental principle underlying all physics',
      'Step 4: Applies to all processes in closed systems',
      'Step 5: QED - Energy conservation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove conservation of momentum',
    input_dsl: 'prove conserved TotalMomentum',
    expected_nl: 'Total momentum is conserved without external forces',
    proof_nl: [
      'Step 1: Apply Conservation_Of_Momentum theorem',
      'Step 2: Momentum conserved when net external force is zero',
      'Step 3: Vector quantity - conserved in each direction independently',
      'Step 4: Crucial for analyzing collisions and explosions',
      'Step 5: QED - Momentum conservation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the work-energy theorem',
    input_dsl: 'prove equals NetWork (minus FinalKineticEnergy InitialKineticEnergy)',
    expected_nl: 'Net work equals change in kinetic energy',
    proof_nl: [
      'Step 1: Apply Work_Energy_Theorem theorem',
      'Step 2: W_net = ΔKE = KE_f - KE_i',
      'Step 3: Relates work done to change in kinetic energy',
      'Step 4: Powerful tool for solving dynamics problems',
      'Step 5: QED - Work-energy theorem proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Hooke\'s law for springs',
    input_dsl: 'prove equals RestoringForce (negative (times SpringConstant Displacement))',
    expected_nl: 'Restoring force equals negative spring constant times displacement',
    proof_nl: [
      'Step 1: Apply Hookes_Law theorem',
      'Step 2: F = -kx describes linear elastic behavior',
      'Step 3: Negative sign indicates force opposes displacement',
      'Step 4: Valid in elastic region before permanent deformation',
      'Step 5: QED - Hooke\'s law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove de Broglie wavelength relation',
    input_dsl: 'prove equals DeBroglieWavelength (divide PlanckConstant Momentum)',
    expected_nl: 'De Broglie wavelength equals Planck constant divided by momentum',
    proof_nl: [
      'Step 1: Apply De_Broglie_Wavelength theorem',
      'Step 2: λ = h/p associates wave properties with particles',
      'Step 3: Demonstrates wave-particle duality of matter',
      'Step 4: Foundation of quantum mechanics',
      'Step 5: QED - De Broglie wavelength relation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Heisenberg uncertainty principle for position and momentum',
    input_dsl: 'prove greaterEqual (times PositionUncertainty MomentumUncertainty) (divide PlanckConstant (times 2 pi))',
    expected_nl: 'Position uncertainty times momentum uncertainty is at least ℏ/2',
    proof_nl: [
      'Step 1: Apply Heisenberg_Uncertainty_Position theorem',
      'Step 2: Δx·Δp ≥ ℏ/2 where ℏ = h/(2π)',
      'Step 3: Fundamental limit on simultaneous measurement precision',
      'Step 4: Not due to measurement imperfection but intrinsic to quantum mechanics',
      'Step 5: QED - Heisenberg uncertainty principle proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the lens equation',
    input_dsl: 'prove equals (inverse FocalLength) (plus (inverse ObjectDistance) (inverse ImageDistance))',
    expected_nl: 'One over focal length equals one over object distance plus one over image distance',
    proof_nl: [
      'Step 1: Apply Lens_Equation theorem',
      'Step 2: 1/f = 1/d_o + 1/d_i for thin lenses',
      'Step 3: Enables calculation of image position and characteristics',
      'Step 4: Sign conventions determine real vs virtual images',
      'Step 5: QED - Lens equation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove centripetal force relation',
    input_dsl: 'prove equals CentripetalForce (divide (times Mass (square Velocity)) Radius)',
    expected_nl: 'Centripetal force equals mass times velocity squared divided by radius',
    proof_nl: [
      'Step 1: Apply Centripetal_Force theorem',
      'Step 2: F_c = mv²/r for circular motion',
      'Step 3: Force directed toward center of circular path',
      'Step 4: Required to maintain circular motion - changes velocity direction',
      'Step 5: QED - Centripetal force relation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove gravitational force follows inverse square law',
    input_dsl: 'prove proportional GravitationalForce (divide (times Mass1 Mass2) (square Distance))',
    expected_nl: 'Gravitational force is proportional to product of masses divided by distance squared',
    proof_nl: [
      'Step 1: Apply Gravitational_Force theorem',
      'Step 2: F = G(m₁m₂)/r² where G is gravitational constant',
      'Step 3: Universal law of gravitation discovered by Newton',
      'Step 4: Inverse square dependence on separation distance',
      'Step 5: QED - Gravitational inverse square law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove magnetic flux definition',
    input_dsl: 'prove equals MagneticFlux (times MagneticField (times Area (cos Angle)))',
    expected_nl: 'Magnetic flux equals magnetic field times area times cosine of angle',
    proof_nl: [
      'Step 1: Apply Magnetic_Flux_Definition theorem',
      'Step 2: Φ = B·A = BA cos(θ) is dot product of field and area vectors',
      'Step 3: Maximum when field perpendicular to surface',
      'Step 4: Unit is weber (Wb) in SI system',
      'Step 5: QED - Magnetic flux definition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove resistors in series add',
    input_dsl: 'prove equals TotalResistance (plus Resistor1 Resistor2)',
    expected_nl: 'Total resistance equals sum of individual resistances in series',
    proof_nl: [
      'Step 1: Apply Resistors_Series theorem',
      'Step 2: R_total = R₁ + R₂ + ... for series connection',
      'Step 3: Same current flows through all resistors in series',
      'Step 4: Voltages add to equal source voltage',
      'Step 5: QED - Series resistance addition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the photoelectric effect equation',
    input_dsl: 'prove equals KineticEnergy (minus (times PlanckConstant Frequency) WorkFunction)',
    expected_nl: 'Kinetic energy equals photon energy minus work function',
    proof_nl: [
      'Step 1: Apply Photoelectric_Effect theorem',
      'Step 2: KE = hf - φ where φ is work function',
      'Step 3: Einstein\'s explanation using photon theory',
      'Step 4: Requires minimum threshold frequency for emission',
      'Step 5: QED - Photoelectric effect equation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Kirchhoff\'s current law',
    input_dsl: 'prove equals CurrentIn CurrentOut',
    expected_nl: 'Current flowing into a junction equals current flowing out',
    proof_nl: [
      'Step 1: Apply Kirchhoff_Current_Law theorem',
      'Step 2: ΣI_in = ΣI_out at any circuit node',
      'Step 3: Expresses conservation of electric charge',
      'Step 4: No charge accumulates at junction in steady state',
      'Step 5: QED - Kirchhoff\'s current law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove period of simple harmonic oscillator',
    input_dsl: 'prove equals Period (times 2 (times pi (sqrt (divide Mass SpringConstant))))',
    expected_nl: 'Period equals 2π times square root of mass over spring constant',
    proof_nl: [
      'Step 1: Apply Period_Simple_Harmonic theorem',
      'Step 2: T = 2π√(m/k) for mass-spring system',
      'Step 3: Period independent of amplitude (isochronous)',
      'Step 4: Frequency increases with stiffer spring, decreases with larger mass',
      'Step 5: QED - SHM period relation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Carnot efficiency',
    input_dsl: 'prove equals CarnotEfficiency (minus 1 (divide ColdReservoir HotReservoir))',
    expected_nl: 'Carnot efficiency equals one minus ratio of cold to hot reservoir temperatures',
    proof_nl: [
      'Step 1: Apply Carnot_Efficiency theorem',
      'Step 2: η = 1 - T_c/T_h is maximum theoretical efficiency',
      'Step 3: Applies to reversible heat engines only',
      'Step 4: All real engines have lower efficiency due to irreversibilities',
      'Step 5: QED - Carnot efficiency proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Ampere\'s law for magnetostatics',
    input_dsl: 'prove equals LineIntegralOfMagneticField (times Permeability EnclosedCurrent)',
    expected_nl: 'Line integral of magnetic field equals permeability times enclosed current',
    proof_nl: [
      'Step 1: Apply Ampere_Law theorem',
      'Step 2: ∮B·dl = μ₀I_enclosed around closed Amperian loop',
      'Step 3: One of Maxwell\'s equations for magnetostatics',
      'Step 4: Powerful tool for calculating magnetic fields with symmetry',
      'Step 5: QED - Ampere\'s law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Gauss\'s law for electricity',
    input_dsl: 'prove equals ElectricFlux (divide EnclosedCharge Permittivity)',
    expected_nl: 'Electric flux through closed surface equals enclosed charge divided by permittivity',
    proof_nl: [
      'Step 1: Apply Gauss_Law theorem',
      'Step 2: ∮E·dA = Q_enclosed/ε₀ through Gaussian surface',
      'Step 3: First of Maxwell\'s equations',
      'Step 4: Relates electric field to source charges',
      'Step 5: QED - Gauss\'s law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove law of reflection',
    input_dsl: 'prove equals IncidentAngle ReflectedAngle',
    expected_nl: 'Incident angle equals reflected angle',
    proof_nl: [
      'Step 1: Apply Reflection_Law theorem',
      'Step 2: θ_i = θ_r measured from surface normal',
      'Step 3: Applies to specular reflection from smooth surfaces',
      'Step 4: Incident, reflected, and normal all in same plane',
      'Step 5: QED - Law of reflection proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove angular momentum conservation',
    input_dsl: 'prove conserved AngularMomentum',
    expected_nl: 'Angular momentum is conserved without external torque',
    proof_nl: [
      'Step 1: Apply Conservation_Of_Angular_Momentum theorem',
      'Step 2: L conserved when net external torque is zero',
      'Step 3: Explains spinning skater, planetary orbits, gyroscopes',
      'Step 4: Vector quantity conserved in magnitude and direction',
      'Step 5: QED - Angular momentum conservation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Newton\'s first law of motion',
    input_dsl: 'prove implies ZeroNetForce ConstantVelocity',
    expected_nl: 'Zero net force implies constant velocity (law of inertia)',
    proof_nl: [
      'Step 1: Apply Newton_First_Law theorem',
      'Step 2: Objects maintain constant velocity without net force',
      'Step 3: Includes special case of remaining at rest',
      'Step 4: Defines inertial reference frames',
      'Step 5: QED - Newton\'s first law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Newton\'s third law of motion',
    input_dsl: 'prove equals Action (negative Reaction)',
    expected_nl: 'Action force equals negative reaction force',
    proof_nl: [
      'Step 1: Apply Newton_Third_Law theorem',
      'Step 2: For every action there is equal and opposite reaction',
      'Step 3: Forces occur in pairs acting on different bodies',
      'Step 4: Simultaneous - no cause and effect relationship',
      'Step 5: QED - Newton\'s third law proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove energy stored in inductor',
    input_dsl: 'prove equals StoredEnergy (times 0.5 (times Inductance (square Current)))',
    expected_nl: 'Energy stored in inductor equals one half inductance times current squared',
    proof_nl: [
      'Step 1: Apply Energy_Stored_Inductor theorem',
      'Step 2: U = (1/2)LI² represents magnetic field energy',
      'Step 3: Energy builds up as current establishes',
      'Step 4: Analogous to capacitor energy U = (1/2)CV²',
      'Step 5: QED - Inductor energy storage proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove constructive interference condition',
    input_dsl: 'prove equals PathDifference (times OrderNumber Wavelength)',
    expected_nl: 'Path difference equals integer multiple of wavelength for constructive interference',
    proof_nl: [
      'Step 1: Apply Interference_Constructive theorem',
      'Step 2: δ = mλ where m = 0, 1, 2, ... for bright fringes',
      'Step 3: Waves arrive in phase and superpose constructively',
      'Step 4: Produces maximum intensity',
      'Step 5: QED - Constructive interference condition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove destructive interference condition',
    input_dsl: 'prove equals PathDifference (times (plus OrderNumber 0.5) Wavelength)',
    expected_nl: 'Path difference equals half-integer multiple of wavelength for destructive interference',
    proof_nl: [
      'Step 1: Apply Interference_Destructive theorem',
      'Step 2: δ = (m + 1/2)λ where m = 0, 1, 2, ... for dark fringes',
      'Step 3: Waves arrive out of phase by 180° and cancel',
      'Step 4: Produces minimum intensity',
      'Step 5: QED - Destructive interference condition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove time dilation in special relativity',
    input_dsl: 'prove equals ProperTime (divide RestTime (sqrt (minus 1 (divide (square Velocity) (square SpeedOfLight)))))',
    expected_nl: 'Moving clocks run slower by Lorentz factor',
    proof_nl: [
      'Step 1: Apply Special_Relativity_Time_Dilation theorem',
      'Step 2: Δt = γΔt₀ where γ = 1/√(1 - v²/c²)',
      'Step 3: Time passes slower in moving reference frame',
      'Step 4: Confirmed by muon decay experiments and GPS satellites',
      'Step 5: QED - Time dilation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove length contraction in special relativity',
    input_dsl: 'prove equals ContractedLength (times ProperLength (sqrt (minus 1 (divide (square Velocity) (square SpeedOfLight)))))',
    expected_nl: 'Moving objects contract along direction of motion',
    proof_nl: [
      'Step 1: Apply Special_Relativity_Length_Contraction theorem',
      'Step 2: L = L₀√(1 - v²/c²) = L₀/γ',
      'Step 3: Length contracts only in direction of motion',
      'Step 4: Proper length L₀ measured in rest frame',
      'Step 5: QED - Length contraction proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove charge conservation',
    input_dsl: 'prove conserved TotalCharge',
    expected_nl: 'Total electric charge is conserved in all processes',
    proof_nl: [
      'Step 1: Apply Conservation_Of_Charge theorem',
      'Step 2: Net charge cannot be created or destroyed',
      'Step 3: Charge can only be transferred between objects',
      'Step 4: Fundamental conservation law of electromagnetism',
      'Step 5: QED - Charge conservation proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Noether\'s theorem for energy',
    input_dsl: 'prove implies TimeTranslation EnergyConservation',
    expected_nl: 'Time translation symmetry implies energy conservation',
    proof_nl: [
      'Step 1: Apply Noether_Theorem_Energy theorem',
      'Step 2: Noether\'s theorem connects symmetries to conservation laws',
      'Step 3: If physics laws invariant under time translation, energy conserved',
      'Step 4: Deep connection between symmetry principles and conservation',
      'Step 5: QED - Noether\'s theorem for energy proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove velocity definition',
    input_dsl: 'prove equals Velocity (divide Displacement Time)',
    expected_nl: 'Velocity equals displacement divided by time',
    proof_nl: [
      'Step 1: Apply Velocity_Definition theorem',
      'Step 2: v = Δx/Δt is rate of position change',
      'Step 3: Vector quantity with direction and magnitude',
      'Step 4: Units are meters per second in SI system',
      'Step 5: QED - Velocity definition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove acceleration definition',
    input_dsl: 'prove equals Acceleration (divide VelocityChange TimeInterval)',
    expected_nl: 'Acceleration equals velocity change divided by time interval',
    proof_nl: [
      'Step 1: Apply Acceleration_Definition theorem',
      'Step 2: a = Δv/Δt is rate of velocity change',
      'Step 3: Vector quantity indicating change in speed or direction',
      'Step 4: Units are meters per second squared',
      'Step 5: QED - Acceleration definition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove electric field definition',
    input_dsl: 'prove equals ElectricField (divide ElectricForce TestCharge)',
    expected_nl: 'Electric field equals force per unit charge',
    proof_nl: [
      'Step 1: Apply Electric_Field_Definition theorem',
      'Step 2: E = F/q defines electric field strength',
      'Step 3: Vector field created by source charges',
      'Step 4: Units are newtons per coulomb or volts per meter',
      'Step 5: QED - Electric field definition proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove impulse-momentum theorem',
    input_dsl: 'prove equals Impulse MomentumChange',
    expected_nl: 'Impulse equals change in momentum',
    proof_nl: [
      'Step 1: Apply Impulse_Momentum_Theorem theorem',
      'Step 2: J = Δp = FΔt connects force-time to momentum change',
      'Step 3: Impulse is force integrated over time',
      'Step 4: Useful for analyzing collisions and impacts',
      'Step 5: QED - Impulse-momentum theorem proven'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove speed of light from Maxwell equations',
    input_dsl: 'prove equals LightSpeed (inverse (sqrt (times ElectricPermittivity MagneticPermeability)))',
    expected_nl: 'Speed of light equals inverse square root of permittivity times permeability',
    proof_nl: [
      'Step 1: Apply Electromagnetic_Wave_Speed theorem',
      'Step 2: c = 1/√(ε₀μ₀) derived from Maxwell\'s equations',
      'Step 3: Demonstrates electromagnetic nature of light',
      'Step 4: Theoretical prediction confirmed by measurement',
      'Step 5: QED - Light speed from Maxwell equations proven'
    ]
  }
];
