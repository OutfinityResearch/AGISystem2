export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

export function generateCaseId(source, example) {
  const hash = simpleHash(JSON.stringify({ c: example.context?.slice(0, 100), q: example.question }));
  return `${source}_${hash}`;
}

