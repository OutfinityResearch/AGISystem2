/**
 * AGISystem2 - Text Normalizer
 * @module nlp/normalizer
 *
 * Text normalization utilities for NLP preprocessing.
 */

/**
 * Normalize whitespace and punctuation
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/—/g, '-')
    .trim();
}

/**
 * Remove common filler words
 * @param {string} text
 * @returns {string}
 */
export function removeFillers(text) {
  const fillers = [
    'basically', 'actually', 'really', 'very', 'quite',
    'just', 'simply', 'certainly', 'definitely', 'probably'
  ];

  let result = text;
  for (const filler of fillers) {
    result = result.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Expand contractions to full forms
 * @param {string} text
 * @returns {string}
 */
export function expandContractions(text) {
  const contractions = {
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "won't": "will not",
    "wouldn't": "would not",
    "can't": "cannot",
    "couldn't": "could not",
    "shouldn't": "should not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "hasn't": "has not",
    "haven't": "have not",
    "hadn't": "had not",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "here's": "here is",
    "what's": "what is",
    "who's": "who is",
    "he's": "he is",
    "she's": "she is",
    "let's": "let us",
    "i'm": "I am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "i've": "I have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "I will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
    "i'd": "I would",
    "you'd": "you would",
    "he'd": "he would",
    "she'd": "she would",
    "we'd": "we would",
    "they'd": "they would"
  };

  let result = text;
  for (const [contraction, expansion] of Object.entries(contractions)) {
    result = result.replace(new RegExp(contraction, 'gi'), expansion);
  }
  return result;
}

/**
 * Convert to sentence case
 * @param {string} text
 * @returns {string}
 */
export function toSentenceCase(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Capitalize first letter, preserve rest
 * @param {string} word
 * @returns {string}
 */
export function capitalize(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Capitalize first letter, lowercase rest
 * @param {string} word
 * @returns {string}
 */
export function capitalizeWord(word) {
  if (!word) return '';
  const head = word.charAt(0).toUpperCase();
  const tail = word.slice(1);

  // Preserve existing internal capitalization (e.g. LivingThing, DNA, iPhone).
  // Lowercasing these breaks DSL identifiers that are case-sensitive.
  if (/[A-Z]/.test(tail)) return head + tail;

  // Preserve non-letter tokens (underscores/digits) as-is (except first char capitalization).
  if (/[^a-z]/i.test(tail)) return head + tail;

  return head + tail.toLowerCase();
}

/**
 * Simple English singularization
 * @param {string} word
 * @returns {string}
 */
export function singularize(word) {
  if (!word || word.length < 3) return word;

  // Preserve proper nouns (capitalized words that look like names)
  // Names ending in 's' like Whiskers, James, Thomas should NOT be singularized
  if (/^[A-Z][a-z]+s$/.test(word)) {
    // Check if it's likely a name (not a regular plural)
    // Common noun plurals have lowercase first letter in normal text
    // Names like "Whiskers", "James", "Thomas" should be preserved
    return word;
  }

  const lower = word.toLowerCase();

  // Irregular plurals
  const irregulars = {
    'children': 'child',
    'people': 'person',
    'men': 'man',
    'women': 'woman',
    'teeth': 'tooth',
    'feet': 'foot',
    'mice': 'mouse',
    'geese': 'goose'
  };

  if (irregulars[lower]) {
    // Preserve capitalization
    return word[0] === word[0].toUpperCase()
      ? capitalizeWord(irregulars[lower])
      : irregulars[lower];
  }

  // Regular rules
  if (lower.endsWith('ies') && lower.length > 4) {
    return word.slice(0, -3) + 'y';
  }
  if (lower.endsWith('ves')) {
    return word.slice(0, -3) + 'f';
  }
  if (lower.endsWith('oes') && !['shoes', 'canoes'].includes(lower)) {
    return word.slice(0, -2);
  }
  // -ses (kisses, glasses) but not roses/houses
  if ((lower.endsWith('sses') || lower.endsWith('xes') ||
       lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('zzes')) &&
      lower.length > 4) {
    return word.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us')) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Simple English pluralization
 * @param {string} word
 * @returns {string}
 */
export function pluralize(word) {
  if (!word) return '';

  const lower = word.toLowerCase();

  // Irregular plurals
  const irregulars = {
    'child': 'children',
    'person': 'people',
    'man': 'men',
    'woman': 'women',
    'tooth': 'teeth',
    'foot': 'feet',
    'mouse': 'mice',
    'goose': 'geese'
  };

  if (irregulars[lower]) {
    return word[0] === word[0].toUpperCase()
      ? capitalizeWord(irregulars[lower])
      : irregulars[lower];
  }

  // Regular rules
  if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
    return word.slice(0, -1) + 'ies';
  }
  if (lower.endsWith('s') || lower.endsWith('x') ||
      lower.endsWith('ch') || lower.endsWith('sh')) {
    return word + 'es';
  }
  if (lower.endsWith('f')) {
    return word.slice(0, -1) + 'ves';
  }
  if (lower.endsWith('fe')) {
    return word.slice(0, -2) + 'ves';
  }

  return word + 's';
}

/**
 * Normalize a verb to base form (very simple)
 * @param {string} verb
 * @returns {string}
 */
export function normalizeVerb(verb) {
  if (!verb) return '';

  const lower = verb.toLowerCase();

  // Irregular verbs (common ones)
  const irregulars = {
    'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be', 'been': 'be', 'am': 'be',
    'has': 'have', 'had': 'have',
    'does': 'do', 'did': 'do',
    'goes': 'go', 'went': 'go', 'gone': 'go',
    'says': 'say', 'said': 'say',
    'gets': 'get', 'got': 'get', 'gotten': 'get',
    'makes': 'make', 'made': 'make',
    'knows': 'know', 'knew': 'know', 'known': 'know',
    'takes': 'take', 'took': 'take', 'taken': 'take',
    'gives': 'give', 'gave': 'give', 'given': 'give',
    'comes': 'come', 'came': 'come',
    'sees': 'see', 'saw': 'see', 'seen': 'see',
    'thinks': 'think', 'thought': 'think',
    'tells': 'tell', 'told': 'tell',
    'finds': 'find', 'found': 'find',
    'puts': 'put',
    'runs': 'run', 'ran': 'run',
    'sits': 'sit', 'sat': 'sit',
    'stands': 'stand', 'stood': 'stand',
    'loses': 'lose', 'lost': 'lose',
    'pays': 'pay', 'paid': 'pay',
    'meets': 'meet', 'met': 'meet',
    'buys': 'buy', 'bought': 'buy',
    'brings': 'bring', 'brought': 'bring',
    'begins': 'begin', 'began': 'begin', 'begun': 'begin',
    'writes': 'write', 'wrote': 'write', 'written': 'write',
    'reads': 'read',
    'eats': 'eat', 'ate': 'eat', 'eaten': 'eat', 'eating': 'eat',
    'drinks': 'drink', 'drank': 'drink', 'drunk': 'drink',
    'speaks': 'speak', 'spoke': 'speak', 'spoken': 'speak',
    'breaks': 'break', 'broke': 'break', 'broken': 'break',
    'drives': 'drive', 'drove': 'drive', 'driven': 'drive',
    'falls': 'fall', 'fell': 'fall', 'fallen': 'fall',
    'feels': 'feel', 'felt': 'feel',
    'keeps': 'keep', 'kept': 'keep',
    'leaves': 'leave', 'left': 'leave',
    'means': 'mean', 'meant': 'mean',
    'sends': 'send', 'sent': 'send',
    'spends': 'spend', 'spent': 'spend',
    'builds': 'build', 'built': 'build',
    'catches': 'catch', 'caught': 'catch',
    'teaches': 'teach', 'taught': 'teach',
    'sells': 'sell', 'sold': 'sell',
    'loves': 'love', 'loved': 'love'
  };

  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // Regular patterns
  // -ing -> base
  if (lower.endsWith('ing') && lower.length > 4) {
    const base = lower.slice(0, -3);
    // Double consonant: running -> run, swimming -> swim
    if (/([^aeiou])\1$/.test(base)) {
      return base.slice(0, -1);
    }
    // Verbs that dropped -e before -ing: loving -> love, making -> make
    // These typically end in consonant and the base form ends in -e
    // Common patterns: -ving, -king (but not walking), -cing, -ping, -ting
    // Only add 'e' for specific patterns that dropped it
    if (/[aeiou][bcdfgklmnprstvz]$/.test(base) && base.length > 2) {
      // Check if it looks like a verb that dropped 'e' (e.g., lov+ing from love)
      // These have vowel-consonant pattern at end
      return base + 'e';
    }
    return base;
  }

  // -ed -> base
  if (lower.endsWith('ed') && lower.length > 3) {
    // -ied -> -y
    if (lower.endsWith('ied')) {
      return lower.slice(0, -3) + 'y';
    }
    // doubled consonant: stopped -> stop
    const base = lower.slice(0, -2);
    if (/([^aeiou])\1$/.test(base) && base.length > 2) {
      return base.slice(0, -1);
    }
    // chase+d -> chase (verbs ending in e just add d)
    if (lower.endsWith('ced') || lower.endsWith('sed') || lower.endsWith('ged') ||
        lower.endsWith('ked') || lower.endsWith('ped') || lower.endsWith('ted') ||
        lower.endsWith('ved') || lower.endsWith('zed')) {
      return lower.slice(0, -1); // remove d only
    }
    // Regular -ed
    return lower.slice(0, -2);
  }

  // -ies -> -y
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }

  // -es after sibilant
  if ((lower.endsWith('ches') || lower.endsWith('shes') ||
       lower.endsWith('sses') || lower.endsWith('xes') ||
       lower.endsWith('zes')) && lower.length > 4) {
    return lower.slice(0, -2);
  }

  // -es -> -e (loves -> love is irregular, handled above)
  if (lower.endsWith('es') && lower.length > 3) {
    return lower.slice(0, -1);
  }

  // -s (third person)
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
    return lower.slice(0, -1);
  }

  return lower;
}

export default {
  normalizeText,
  removeFillers,
  expandContractions,
  toSentenceCase,
  capitalize,
  capitalizeWord,
  singularize,
  pluralize,
  normalizeVerb
};
