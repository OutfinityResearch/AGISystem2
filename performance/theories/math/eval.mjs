/**
 * Mathematics Theory - Evaluation Cases
 *
 * Complex queries and proofs requiring deep reasoning.
 * Each case has:
 *   - input_nl: Natural language question
 *   - input_dsl: DSL query
 *   - expected_nl: Expected result (natural language)
 *   - proof_nl: Array of proof steps (natural language)
 */

export const name = 'Mathematics';
export const description = 'Number systems, sets, functions, geometry, algebra, calculus - deep reasoning tests';
export const min_complex = 100;

export const cases = [
  // =============================================================================
  // PYTHAGOREAN THEOREM PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that in a right triangle with legs 3 and 4, the hypotenuse is 5',
    input_dsl: '@goal apply Pythagorean_Theorem (Triangle legs 3 4)',
    expected_nl: 'True: The hypotenuse is 5',
    proof_nl: [
      'Given: Triangle T is a right triangle with leg1 = 3 and leg2 = 4',
      'Apply Pythagorean_Theorem: In a right triangle, c² = a² + b²',
      'Calculate: a² = 3² = 9',
      'Calculate: b² = 4² = 16',
      'Calculate: a² + b² = 9 + 16 = 25',
      'Calculate: c = √25 = 5',
      'Therefore: The hypotenuse equals 5'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that a triangle with sides 5, 12, 13 is a right triangle',
    input_dsl: '@goal apply Converse_Pythagorean (Triangle sides 5 12 13)',
    expected_nl: 'True: This is a right triangle',
    proof_nl: [
      'Given: Triangle with sides a=5, b=12, c=13 (largest side)',
      'Apply Converse_Pythagorean: If c² = a² + b², then the triangle is right',
      'Calculate: a² = 5² = 25',
      'Calculate: b² = 12² = 144',
      'Calculate: a² + b² = 25 + 144 = 169',
      'Calculate: c² = 13² = 169',
      'Verify: c² = a² + b² holds (169 = 169)',
      'Therefore: By Converse_Pythagorean, this is a right triangle'
    ]
  },

  // =============================================================================
  // MODUS PONENS PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Given "If it rains, the ground is wet" and "It rains", prove the ground is wet',
    input_dsl: '@goal apply Modus_Ponens (Implies Rains GroundWet) Rains',
    expected_nl: 'True: The ground is wet',
    proof_nl: [
      'Given premise P: "It rains" (Rains)',
      'Given implication: "If it rains, then the ground is wet" (Implies Rains GroundWet)',
      'Apply Modus_Ponens: If P is true and (P implies Q) is true, then Q is true',
      'Substitution: P = Rains, Q = GroundWet',
      'Verify: P is true (given)',
      'Verify: (P implies Q) is true (given)',
      'Conclusion by Modus_Ponens: Q = GroundWet is true',
      'Therefore: The ground is wet'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove: If all men are mortal and Socrates is a man, then Socrates is mortal',
    input_dsl: '@goal apply Modus_Ponens (Implies (isA Socrates Man) (isA Socrates Mortal)) (isA Socrates Man)',
    expected_nl: 'True: Socrates is mortal',
    proof_nl: [
      'Given: All men are mortal (ForAll x: Man(x) implies Mortal(x))',
      'Given: Socrates is a man (isA Socrates Man)',
      'Apply Universal_Instantiation to get: Man(Socrates) implies Mortal(Socrates)',
      'Apply Modus_Ponens with P = Man(Socrates), Q = Mortal(Socrates)',
      'P is true: Socrates is a man (given)',
      'P implies Q is true: from universal statement',
      'Therefore by Modus_Ponens: Mortal(Socrates) is true',
      'Conclusion: Socrates is mortal'
    ]
  },

  // =============================================================================
  // NUMBER HIERARCHY PROOFS (Deep chains)
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that 2 is a Complex number',
    input_dsl: '@goal isA Two Complex',
    expected_nl: 'True: 2 is a Complex number',
    proof_nl: [
      'Given: 2 is a Natural Number (Two isA NaturalNumber)',
      'By Number_Hierarchy: Every Natural Number is an Integer',
      'Therefore: 2 is an Integer',
      'By Number_Hierarchy: Every Integer is a Rational',
      'Therefore: 2 is a Rational (can be written as 2/1)',
      'By Number_Hierarchy: Every Rational is a Real',
      'Therefore: 2 is a Real number',
      'By Number_Hierarchy: Every Real is a Complex (with imaginary part 0)',
      'Therefore: 2 is a Complex number (2 + 0i)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that π is an Irrational number',
    input_dsl: '@goal isA Pi IrrationalNumber',
    expected_nl: 'True: π is an Irrational number',
    proof_nl: [
      'Given: π is defined as the ratio of circumference to diameter of a circle',
      'By definition: π is a Transcendental number (proven by Lindemann, 1882)',
      'Apply Transcendental_Implies_Irrational theorem',
      'This theorem states: Every transcendental number is irrational',
      'Proof of theorem: Transcendental means not root of any polynomial with integer coefficients',
      'All algebraic numbers (roots of integer polynomials) include all rationals',
      'Since π is not algebraic, π cannot be rational',
      'Therefore: π is an Irrational number'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that √2 is irrational',
    input_dsl: '@goal isA SquareRootTwo IrrationalNumber',
    expected_nl: 'True: √2 is irrational',
    proof_nl: [
      'Apply proof by contradiction (Reductio_Ad_Absurdum)',
      'Assume √2 is rational, so √2 = p/q where p,q are integers with no common factors',
      'Square both sides: 2 = p²/q²',
      'Therefore: p² = 2q²',
      'This means p² is even, so p must be even (by Even_Square_Implies_Even)',
      'Let p = 2k for some integer k',
      'Then: (2k)² = 2q², so 4k² = 2q², so q² = 2k²',
      'This means q² is even, so q must be even',
      'Contradiction: Both p and q are even, so they share factor 2',
      'This contradicts our assumption that p/q is in lowest terms',
      'Therefore by Reductio_Ad_Absurdum: √2 is irrational'
    ]
  },

  // =============================================================================
  // SET THEORY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that the empty set is a subset of every set',
    input_dsl: '@goal ForAll S (subsetOf EmptySet S)',
    expected_nl: 'True: The empty set is a subset of every set',
    proof_nl: [
      'Apply proof by vacuous truth',
      'Definition of subset: A ⊆ B iff for all x, if x ∈ A then x ∈ B',
      'For EmptySet: we need to show for all x, if x ∈ EmptySet then x ∈ S',
      'The antecedent "x ∈ EmptySet" is always false (empty set has no elements)',
      'An implication with false antecedent is vacuously true',
      'Therefore: (x ∈ EmptySet implies x ∈ S) is true for all x',
      'By definition of subset: EmptySet ⊆ S for any set S'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove De Morgan\'s Law: complement of (A ∪ B) equals (complement A) ∩ (complement B)',
    input_dsl: '@goal apply De_Morgan_Union A B',
    expected_nl: 'True: (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ',
    proof_nl: [
      'Let x be an arbitrary element',
      'x ∈ (A ∪ B)ᶜ iff x ∉ (A ∪ B)',
      'By definition of union: x ∉ (A ∪ B) iff (x ∉ A and x ∉ B)',
      'By definition of complement: (x ∉ A) iff (x ∈ Aᶜ)',
      'Similarly: (x ∉ B) iff (x ∈ Bᶜ)',
      'Therefore: x ∈ (A ∪ B)ᶜ iff (x ∈ Aᶜ and x ∈ Bᶜ)',
      'By definition of intersection: (x ∈ Aᶜ and x ∈ Bᶜ) iff x ∈ (Aᶜ ∩ Bᶜ)',
      'Conclusion: x ∈ (A ∪ B)ᶜ iff x ∈ (Aᶜ ∩ Bᶜ)',
      'By Extensionality_Axiom: (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that subset relation is transitive: if A ⊆ B and B ⊆ C, then A ⊆ C',
    input_dsl: '@goal apply Subset_Transitivity A B C',
    expected_nl: 'True: A ⊆ C',
    proof_nl: [
      'Given: A ⊆ B (for all x, x ∈ A implies x ∈ B)',
      'Given: B ⊆ C (for all x, x ∈ B implies x ∈ C)',
      'Let x be an arbitrary element in A',
      'Since A ⊆ B and x ∈ A, by definition of subset: x ∈ B',
      'Since B ⊆ C and x ∈ B, by definition of subset: x ∈ C',
      'Apply Hypothetical_Syllogism: (A⊆B ∧ B⊆C) implies A⊆C',
      'Therefore: for all x, x ∈ A implies x ∈ C',
      'By definition: A ⊆ C'
    ]
  },

  // =============================================================================
  // GROUP THEORY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that the identity element in a group is unique',
    input_dsl: '@goal unique Group_Identity G',
    expected_nl: 'True: The identity element is unique',
    proof_nl: [
      'Assume G is a group with two identity elements e and e\'',
      'By definition of identity: for all a in G, e * a = a * e = a',
      'By definition of identity: for all a in G, e\' * a = a * e\' = a',
      'Consider e * e\': Since e is identity, e * e\' = e\'',
      'Consider e * e\': Since e\' is identity, e * e\' = e',
      'Therefore: e = e * e\' = e\'',
      'Conclusion: Any two identity elements must be equal',
      'Therefore: The identity element is unique'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that every cyclic group is abelian',
    input_dsl: '@goal apply Cyclic_Groups_Abelian G',
    expected_nl: 'True: Every cyclic group is abelian',
    proof_nl: [
      'Let G be a cyclic group generated by element g',
      'Every element in G can be written as gⁿ for some integer n',
      'Let a, b be arbitrary elements in G',
      'Then a = gᵐ and b = gⁿ for some integers m, n',
      'Calculate a * b = gᵐ * gⁿ = gᵐ⁺ⁿ (by exponent laws)',
      'Calculate b * a = gⁿ * gᵐ = gⁿ⁺ᵐ (by exponent laws)',
      'Since m + n = n + m (commutativity of integer addition)',
      'Therefore: gᵐ⁺ⁿ = gⁿ⁺ᵐ',
      'Conclusion: a * b = b * a for all a, b in G',
      'By definition: G is abelian'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Lagrange\'s Theorem: the order of a subgroup divides the order of the group',
    input_dsl: '@goal apply Lagrange_Theorem H G',
    expected_nl: 'True: |H| divides |G|',
    proof_nl: [
      'Let G be a finite group and H be a subgroup of G',
      'Define left cosets: for a ∈ G, the left coset aH = {ah : h ∈ H}',
      'Apply Coset_Cardinality: All left cosets have the same size as H',
      'The cosets partition G (every element belongs to exactly one coset)',
      'Let k be the number of distinct cosets (the index [G:H])',
      'Since cosets partition G: |G| = k × |H|',
      'Therefore: |H| divides |G|',
      'Moreover: |G| = [G:H] × |H|'
    ]
  },

  // =============================================================================
  // CALCULUS PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove the Power Rule: d/dx(xⁿ) = nxⁿ⁻¹',
    input_dsl: '@goal apply Power_Rule x n',
    expected_nl: 'True: The derivative of xⁿ is nxⁿ⁻¹',
    proof_nl: [
      'Apply the definition of derivative: f\'(x) = lim[h→0] (f(x+h) - f(x))/h',
      'For f(x) = xⁿ: f\'(x) = lim[h→0] ((x+h)ⁿ - xⁿ)/h',
      'Apply Binomial_Theorem: (x+h)ⁿ = Σ C(n,k) xⁿ⁻ᵏ hᵏ',
      'Expand: (x+h)ⁿ = xⁿ + nxⁿ⁻¹h + C(n,2)xⁿ⁻²h² + ...',
      'Subtract xⁿ: (x+h)ⁿ - xⁿ = nxⁿ⁻¹h + terms with h² or higher',
      'Divide by h: ((x+h)ⁿ - xⁿ)/h = nxⁿ⁻¹ + terms with h or higher',
      'Take limit as h→0: lim[h→0] (nxⁿ⁻¹ + h·(...)) = nxⁿ⁻¹',
      'Therefore: d/dx(xⁿ) = nxⁿ⁻¹'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the Chain Rule: d/dx[f(g(x))] = f\'(g(x)) · g\'(x)',
    input_dsl: '@goal apply Chain_Rule f g x',
    expected_nl: 'True: (f ∘ g)\'(x) = f\'(g(x)) · g\'(x)',
    proof_nl: [
      'Let h(x) = f(g(x)) be the composite function',
      'Apply definition of derivative: h\'(x) = lim[Δx→0] (h(x+Δx) - h(x))/Δx',
      'Let Δu = g(x+Δx) - g(x), so g(x+Δx) = g(x) + Δu',
      'Then: h(x+Δx) - h(x) = f(g(x) + Δu) - f(g(x))',
      'Rewrite: (h(x+Δx) - h(x))/Δx = (f(g(x)+Δu) - f(g(x)))/Δu · Δu/Δx',
      'As Δx→0: Δu→0 (since g is continuous)',
      'The first factor approaches f\'(g(x)) as Δu→0',
      'The second factor Δu/Δx approaches g\'(x) as Δx→0',
      'Therefore: h\'(x) = f\'(g(x)) · g\'(x)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the Mean Value Theorem',
    input_dsl: '@goal apply Mean_Value_Theorem f a b',
    expected_nl: 'True: There exists c in (a,b) such that f\'(c) = (f(b)-f(a))/(b-a)',
    proof_nl: [
      'Given: f is continuous on [a,b] and differentiable on (a,b)',
      'Define auxiliary function: g(x) = f(x) - f(a) - (f(b)-f(a))/(b-a) · (x-a)',
      'Verify: g(a) = f(a) - f(a) - 0 = 0',
      'Verify: g(b) = f(b) - f(a) - (f(b)-f(a)) = 0',
      'So g(a) = g(b) = 0',
      'Apply Rolle_Theorem to g on [a,b]',
      'By Rolle: there exists c in (a,b) such that g\'(c) = 0',
      'Calculate: g\'(x) = f\'(x) - (f(b)-f(a))/(b-a)',
      'At x=c: 0 = f\'(c) - (f(b)-f(a))/(b-a)',
      'Therefore: f\'(c) = (f(b)-f(a))/(b-a)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the Fundamental Theorem of Calculus Part 1',
    input_dsl: '@goal apply FTC_Part_1 f x',
    expected_nl: 'True: d/dx ∫ₐˣ f(t)dt = f(x)',
    proof_nl: [
      'Let F(x) = ∫ₐˣ f(t)dt be the integral function',
      'Apply definition of derivative: F\'(x) = lim[h→0] (F(x+h) - F(x))/h',
      'By properties of integrals: F(x+h) - F(x) = ∫ₓˣ⁺ʰ f(t)dt',
      'Apply Mean Value Theorem for integrals: ∫ₓˣ⁺ʰ f(t)dt = f(c)·h for some c in [x, x+h]',
      'So: (F(x+h) - F(x))/h = f(c)·h/h = f(c)',
      'As h→0: c→x (since c is between x and x+h)',
      'By continuity of f: lim[h→0] f(c) = f(x)',
      'Therefore: F\'(x) = f(x)',
      'Conclusion: d/dx ∫ₐˣ f(t)dt = f(x)'
    ]
  },

  // =============================================================================
  // LOGIC PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove contraposition: (P → Q) ≡ (¬Q → ¬P)',
    input_dsl: '@goal apply Contraposition P Q',
    expected_nl: 'True: (P → Q) is equivalent to (¬Q → ¬P)',
    proof_nl: [
      'We prove both directions:',
      'Forward: Assume P → Q is true. Show ¬Q → ¬P.',
      'Assume ¬Q is true. Suppose P is true.',
      'Then by P → Q and P, we get Q by Modus_Ponens.',
      'But Q contradicts ¬Q.',
      'Therefore P must be false, i.e., ¬P is true.',
      'Backward: Assume ¬Q → ¬P is true. Show P → Q.',
      'Assume P is true. Suppose ¬Q is true.',
      'Then by ¬Q → ¬P and ¬Q, we get ¬P by Modus_Ponens.',
      'But ¬P contradicts P.',
      'Therefore ¬Q must be false, i.e., Q is true.',
      'Conclusion: (P → Q) ≡ (¬Q → ¬P)'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Hypothetical Syllogism: If P→Q and Q→R, then P→R',
    input_dsl: '@goal apply Hypothetical_Syllogism P Q R',
    expected_nl: 'True: (P→Q) ∧ (Q→R) implies (P→R)',
    proof_nl: [
      'Given: P → Q is true',
      'Given: Q → R is true',
      'To prove: P → R',
      'Assume P is true',
      'Apply Modus_Ponens to P → Q with P: we get Q',
      'Apply Modus_Ponens to Q → R with Q: we get R',
      'Therefore: if P is true, then R is true',
      'Conclusion: P → R'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove De Morgan\'s Law for logic: ¬(P ∧ Q) ≡ (¬P ∨ ¬Q)',
    input_dsl: '@goal apply De_Morgan_Logic_1 P Q',
    expected_nl: 'True: ¬(P ∧ Q) is equivalent to (¬P ∨ ¬Q)',
    proof_nl: [
      'Forward direction: Assume ¬(P ∧ Q). Show ¬P ∨ ¬Q.',
      'Suppose ¬(¬P ∨ ¬Q), i.e., P ∧ Q by another De Morgan.',
      'This contradicts ¬(P ∧ Q).',
      'Therefore by Reductio_Ad_Absurdum: ¬P ∨ ¬Q must be true.',
      'Backward direction: Assume ¬P ∨ ¬Q. Show ¬(P ∧ Q).',
      'Suppose P ∧ Q is true.',
      'Then P is true and Q is true by Conjunction_Elimination.',
      'Case 1: If ¬P is true, this contradicts P.',
      'Case 2: If ¬Q is true, this contradicts Q.',
      'Either case leads to contradiction.',
      'Therefore by Reductio_Ad_Absurdum: ¬(P ∧ Q).',
      'Conclusion: ¬(P ∧ Q) ≡ (¬P ∨ ¬Q)'
    ]
  },

  // =============================================================================
  // GEOMETRY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that the sum of angles in a triangle equals 180 degrees',
    input_dsl: '@goal apply Triangle_Angle_Sum T',
    expected_nl: 'True: ∠A + ∠B + ∠C = 180°',
    proof_nl: [
      'Let triangle ABC have angles ∠A, ∠B, ∠C at vertices A, B, C',
      'Draw line DE through C parallel to AB (by Euclid_Postulate_5)',
      'By Parallel_Transversal theorem with transversal AC:',
      '∠DCA = ∠A (alternate interior angles)',
      'By Parallel_Transversal theorem with transversal BC:',
      '∠ECB = ∠B (alternate interior angles)',
      'At point C, angles on a straight line sum to 180°:',
      '∠DCA + ∠ACB + ∠ECB = 180°',
      'Substituting: ∠A + ∠C + ∠B = 180°',
      'Therefore: ∠A + ∠B + ∠C = 180°'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove Thales\' Theorem: angle inscribed in semicircle is 90°',
    input_dsl: '@goal apply Thales_Theorem P A B',
    expected_nl: 'True: ∠APB = 90° when AB is diameter',
    proof_nl: [
      'Let AB be diameter of circle with center O',
      'Let P be any point on the circle (other than A, B)',
      'Draw radii OA, OB, and OP',
      'Since O is center: OA = OB = OP = r (radius)',
      'Triangle OAP is isosceles: ∠OAP = ∠OPA = α',
      'Triangle OBP is isosceles: ∠OBP = ∠OPB = β',
      'Apply Triangle_Angle_Sum to triangle APB:',
      '∠PAB + ∠PBA + ∠APB = 180°',
      'Note: ∠PAB = α and ∠PBA = β',
      'So: α + β + ∠APB = 180°',
      'In triangles OAP and OBP: 2α + ∠AOP = 180° and 2β + ∠BOP = 180°',
      'Since ∠AOP + ∠BOP = 180° (straight line AB)',
      'Solving: α + β = 90°',
      'Therefore: ∠APB = 180° - 90° = 90°'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove that in similar triangles, corresponding sides are proportional',
    input_dsl: '@goal apply Similar_Triangles_Ratios ABC DEF',
    expected_nl: 'True: AB/DE = BC/EF = CA/FD',
    proof_nl: [
      'Given: Triangle ABC ~ Triangle DEF (similar)',
      'By AA_Similarity: ∠A = ∠D, ∠B = ∠E, ∠C = ∠F',
      'Place triangle DEF so that D coincides with A and DE lies along AB',
      'Since ∠D = ∠A, side DF lies along AC',
      'Let E\' and F\' be positions of E and F on AB and AC',
      'By Parallel_Transversal: if EF ∥ BC, then AE/AB = AF/AC',
      'Apply Basic_Proportionality_Theorem (Thales):',
      'DE/AB = DF/AC = EF/BC',
      'Rewriting: AB/DE = AC/DF = BC/EF',
      'Therefore: corresponding sides are proportional'
    ]
  },

  // =============================================================================
  // PROBABILITY THEORY PROOFS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove Bayes\' Theorem',
    input_dsl: '@goal apply Bayes_Theorem A B',
    expected_nl: 'True: P(A|B) = P(B|A)·P(A) / P(B)',
    proof_nl: [
      'By definition of conditional probability: P(A|B) = P(A∩B) / P(B)',
      'By definition of conditional probability: P(B|A) = P(A∩B) / P(A)',
      'From the second equation: P(A∩B) = P(B|A) · P(A)',
      'Substitute into the first equation:',
      'P(A|B) = P(B|A) · P(A) / P(B)',
      'This is Bayes\' Theorem',
      'Alternative form using Total_Probability:',
      'P(B) = P(B|A)·P(A) + P(B|¬A)·P(¬A)',
      'Substituting: P(A|B) = P(B|A)·P(A) / [P(B|A)·P(A) + P(B|¬A)·P(¬A)]'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the Addition Rule for probability',
    input_dsl: '@goal apply Addition_Rule A B',
    expected_nl: 'True: P(A∪B) = P(A) + P(B) - P(A∩B)',
    proof_nl: [
      'Decompose A∪B into disjoint sets: A∪B = A ∪ (B\\A)',
      'Where B\\A means elements in B but not in A',
      'By Probability_Axiom_3 (additivity): P(A∪B) = P(A) + P(B\\A)',
      'Decompose B: B = (A∩B) ∪ (B\\A)',
      'By Probability_Axiom_3: P(B) = P(A∩B) + P(B\\A)',
      'Therefore: P(B\\A) = P(B) - P(A∩B)',
      'Substitute: P(A∪B) = P(A) + P(B) - P(A∩B)',
      'This is the Addition Rule (inclusion-exclusion for 2 sets)'
    ]
  },

  // =============================================================================
  // NEGATIVE TESTS (should fail)
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Is the sine function a polygon? (should fail)',
    input_dsl: '@goal isA Sine Polygon',
    expected_nl: 'Cannot prove: Sine is not a Polygon',
    proof_nl: [
      'Search: Sine is a TrigonometricFunction',
      'TrigonometricFunction is a TranscendentalFunction',
      'TranscendentalFunction is a Function',
      'Function is a Relation',
      'Relation is a MathematicalObject',
      'No path exists from Function hierarchy to Geometry hierarchy',
      'Polygon is a geometric shape (Surface)',
      'Domain mismatch: Functions ≠ Geometric Objects',
      'Cannot establish isA relationship'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Is Square a Number? (should fail)',
    input_dsl: '@goal isA Square Number',
    expected_nl: 'Cannot prove: Square is not a Number',
    proof_nl: [
      'Search: Square is a Rectangle',
      'Rectangle is a Parallelogram',
      'Parallelogram is a Quadrilateral',
      'Quadrilateral is a Polygon',
      'Polygon is a GeometricObject',
      'No path from GeometricObject to Number',
      'Number hierarchy is separate from Geometry hierarchy',
      'Domain mismatch: Shapes ≠ Numbers',
      'Cannot establish isA relationship'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Is 0 = 1? (should fail)',
    input_dsl: '@goal equals Zero One',
    expected_nl: 'Cannot prove: 0 ≠ 1',
    proof_nl: [
      'By Peano_Axiom_1: Zero is a natural number',
      'By Peano_Axiom_2: One = successor(Zero)',
      'By Peano_Axiom_3: Zero is not the successor of any natural number',
      'Therefore Zero ≠ successor(anything)',
      'In particular: Zero ≠ successor(Zero) = One',
      'Cannot prove 0 = 1'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Is division by zero defined? (should fail)',
    input_dsl: '@goal defined (divide 1 0)',
    expected_nl: 'Cannot prove: Division by zero is undefined',
    proof_nl: [
      'Definition of division: a/b = c means a = b·c',
      'For 1/0: we need 1 = 0·c for some c',
      'By Multiplication_Zero: 0·c = 0 for all c',
      'Therefore: 1 = 0·c implies 1 = 0',
      'By Peano axioms: 1 ≠ 0',
      'Contradiction: no such c exists',
      'Division by zero is undefined'
    ]
  },

  // =============================================================================
  // COMPLEX THEOREM DEMONSTRATIONS
  // =============================================================================
  {
    action: 'prove',
    input_nl: 'Prove that there are infinitely many prime numbers (Euclid)',
    input_dsl: '@goal infinite Primes',
    expected_nl: 'True: There are infinitely many prime numbers',
    proof_nl: [
      'Apply Reductio_Ad_Absurdum',
      'Assume there are finitely many primes: p₁, p₂, ..., pₙ',
      'Construct N = p₁ · p₂ · ... · pₙ + 1',
      'N is greater than all primes pᵢ',
      'Consider N: either N is prime, or N has a prime factor',
      'Case 1: N is prime. Then N is a prime not in our list. Contradiction.',
      'Case 2: N has a prime factor p. Since N = (product of all primes) + 1',
      'If p = pᵢ for some i, then p divides N and p divides (p₁·...·pₙ)',
      'So p divides N - (p₁·...·pₙ) = 1',
      'But no prime divides 1. Contradiction.',
      'Both cases lead to contradiction',
      'Therefore: our assumption is false',
      'Conclusion: there are infinitely many primes'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the Intermediate Value Theorem',
    input_dsl: '@goal apply Intermediate_Value_Theorem f a b y',
    expected_nl: 'True: If f is continuous on [a,b] and y is between f(a) and f(b), then f(c)=y for some c in [a,b]',
    proof_nl: [
      'Given: f is continuous on [a,b]',
      'Given: y is between f(a) and f(b) (assume f(a) < y < f(b))',
      'Define S = {x ∈ [a,b] : f(x) < y}',
      'S is non-empty: a ∈ S since f(a) < y',
      'S is bounded above by b',
      'By completeness of reals: S has a supremum c = sup(S)',
      'Claim: f(c) = y',
      'Suppose f(c) < y. By continuity, f(x) < y for x near c',
      'This means some x > c is in S, contradicting c = sup(S)',
      'Suppose f(c) > y. By continuity, f(x) > y for x near c',
      'This means c - ε is an upper bound for S, contradicting c = sup(S)',
      'Therefore: f(c) = y for some c in [a,b]'
    ]
  },
  {
    action: 'prove',
    input_nl: 'Prove the First Isomorphism Theorem for groups',
    input_dsl: '@goal apply First_Isomorphism_Theorem phi G H',
    expected_nl: 'True: G/ker(φ) ≅ im(φ)',
    proof_nl: [
      'Let φ: G → H be a group homomorphism',
      'Define K = ker(φ) = {g ∈ G : φ(g) = eₕ}',
      'K is a normal subgroup of G (verify: φ(gkg⁻¹) = φ(g)φ(k)φ(g)⁻¹ = φ(g)eₕφ(g)⁻¹ = eₕ)',
      'Form quotient group G/K with elements gK (cosets)',
      'Define ψ: G/K → im(φ) by ψ(gK) = φ(g)',
      'ψ is well-defined: if gK = hK, then h⁻¹g ∈ K, so φ(h⁻¹g) = eₕ, so φ(g) = φ(h)',
      'ψ is a homomorphism: ψ(gK · hK) = ψ(ghK) = φ(gh) = φ(g)φ(h) = ψ(gK)ψ(hK)',
      'ψ is injective: if ψ(gK) = eₕ, then φ(g) = eₕ, so g ∈ K, so gK = K',
      'ψ is surjective: every element of im(φ) is φ(g) = ψ(gK) for some g',
      'Therefore: ψ is an isomorphism, G/ker(φ) ≅ im(φ)'
    ]
  },

  // =============================================================================
  // QUERIES (finding multiple results)
  // =============================================================================
  {
    action: 'query',
    input_nl: 'What types of numbers are there?',
    input_dsl: '@q isA ?x NumberType',
    expected_nl: 'NaturalNumber, Integer, Rational, Irrational, Real, Complex, Quaternion, Octonion are number types',
    proof_nl: [
      'From Number_Hierarchy graph:',
      'NaturalNumber isA NumberType (counting numbers: 0, 1, 2, ...)',
      'Integer isA NumberType (includes negatives)',
      'Rational isA NumberType (fractions p/q)',
      'Irrational isA NumberType (not expressible as fractions)',
      'Real isA NumberType (union of rational and irrational)',
      'Complex isA NumberType (a + bi form)',
      'Quaternion isA NumberType (4-dimensional extension)',
      'Octonion isA NumberType (8-dimensional extension)'
    ]
  },
  {
    action: 'query',
    input_nl: 'What are the Platonic solids?',
    input_dsl: '@q isA ?x PlatonicSolid',
    expected_nl: 'The five Platonic solids are: Tetrahedron, Cube, Octahedron, Dodecahedron, Icosahedron',
    proof_nl: [
      'From Platonic_Solids_Definition graph:',
      'Tetrahedron: 4 triangular faces, isA PlatonicSolid',
      'Cube (Hexahedron): 6 square faces, isA PlatonicSolid',
      'Octahedron: 8 triangular faces, isA PlatonicSolid',
      'Dodecahedron: 12 pentagonal faces, isA PlatonicSolid',
      'Icosahedron: 20 triangular faces, isA PlatonicSolid',
      'These are the only 5 convex regular polyhedra (by Euclid\'s classification)'
    ]
  },
  {
    action: 'query',
    input_nl: 'What differentiation rules are there?',
    input_dsl: '@q isA ?x DifferentiationRule',
    expected_nl: 'Power Rule, Product Rule, Quotient Rule, Chain Rule, Sum Rule are differentiation rules',
    proof_nl: [
      'From Calculus_Operations graph:',
      'Power_Rule: d/dx(xⁿ) = nxⁿ⁻¹',
      'Product_Rule: d/dx(fg) = f\'g + fg\'',
      'Quotient_Rule: d/dx(f/g) = (f\'g - fg\')/g²',
      'Chain_Rule: d/dx(f(g(x))) = f\'(g(x))·g\'(x)',
      'Sum_Rule: d/dx(f+g) = f\' + g\'',
      'These rules form the basis of differential calculus'
    ]
  }
];

export default { name, description, cases };

