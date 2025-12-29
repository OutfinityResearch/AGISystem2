#!/usr/bin/env node
/**
 * Generate saturation “books” with fixed chapter count and increasing
 * ideas-per-chapter / per-idea “metadata width”.
 *
 * Writes into: evals/saturation/books/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'evals', 'saturation', 'books');

function pad(n, w) {
  return String(n).padStart(w, '0');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function generateBook({
  filename,
  bookId,
  recordPrefix, // 'B10', 'B11', ...
  chapters = 10,
  ideasPerChapter,
  keyPrefix,
  expectChapter,
  expectIdeaIndex,
}) {
  const concepts = ['Process', 'Memory', 'Learning', 'Planner', 'Control', 'Protocol', 'Coordination', 'Optimization', 'Safety', 'Mapping'];
  const traits = ['Precise', 'Selective', 'Volatile', 'Durable', 'Incremental', 'Adaptive', 'Hierarchical', 'Ordered', 'Stable', 'Resilient'];
  const domains = ['Perception', 'Memory', 'Learning', 'Planning', 'Control', 'Communication', 'Coordination', 'Optimization', 'Safety', 'Governance'];
  const mechanisms = ['Fusion', 'Gate', 'Index', 'Update', 'Stack', 'Loop', 'Routing', 'Pruning', 'Guard', 'Weaving'];
  const constraints = ['Bounded', 'Strict', 'Fast', 'Minimal', 'Exact', 'Robust', 'Coherent', 'Traceable', 'Secure', 'Scalable'];
  const effects = ['Accuracy', 'Throughput', 'Consistency', 'Convergence', 'Stability', 'Latency', 'Coverage', 'Precision', 'Recall', 'Auditability'];

  const ideaPad = ideasPerChapter >= 100 ? 3 : 2;

  const expectKey = `${keyPrefix}_C${pad(expectChapter, 2)}_I${pad(expectIdeaIndex, ideaPad)}`;
  const expectIdea = `Idea_${keyPrefix}_C${pad(expectChapter, 2)}_I${pad(expectIdeaIndex, ideaPad)}`;
  const missingKey = `${keyPrefix}_Missing`;

  const lines = [];
  lines.push(`# ${filename}: 10 chapters, ${ideasPerChapter} ideas/chapter`);
  lines.push(`# SAT_QUERY_POS op=Mentions book=${bookId} key=${expectKey} expect=${expectIdea}`);
  lines.push(`# SAT_QUERY_NEG op=Mentions book=${bookId} key=${missingKey} expect=none`);
  lines.push('');
  lines.push('@Mentions:Mentions __Relation');
  lines.push('@IdeaAbout:IdeaAbout __Relation');
  lines.push('');

  let mentionId = 0;
  let aboutId = 0;

  const chapterVars = [];

  for (let c = 1; c <= chapters; c++) {
    const chLabel = `Ch${pad(c, 2)}`;
    const chapterParts = [];

    // Split large chapters into stable-sized bundles (keeps lines reasonable).
    const partSizeIdeas = ideasPerChapter <= 25 ? ideasPerChapter : 25;
    const parts = Math.ceil(ideasPerChapter / partSizeIdeas);

    for (let p = 0; p < parts; p++) {
      const start = p * partSizeIdeas + 1;
      const end = Math.min(ideasPerChapter, (p + 1) * partSizeIdeas);

      const refs = [];
      for (let i = start; i <= end; i++) {
        const idea = `Idea_${keyPrefix}_C${pad(c, 2)}_I${pad(i, ideaPad)}`;
        const key = `${keyPrefix}_C${pad(c, 2)}_I${pad(i, ideaPad)}`;

        const concept = concepts[(c + i) % concepts.length];
        const trait = traits[(c * 3 + i) % traits.length];
        const domain = domains[(c + p) % domains.length];
        const mechanism = mechanisms[(i + p) % mechanisms.length];
        const constraint = constraints[(i * 2 + c) % constraints.length];
        const effect = effects[(i * 5 + c) % effects.length];

        mentionId++;
        aboutId++;
        const mRef = `${recordPrefix}_R${pad(mentionId, 4)}`;
        const dRef = `${recordPrefix}_D${pad(aboutId, 4)}`;

        lines.push(`@${mRef}:Mentions_${mRef} Mentions ${bookId} ${key} ${idea}`);
        lines.push(`@${dRef}:IdeaAbout_${dRef} IdeaAbout ${bookId} ${chLabel} ${idea} ${concept} ${trait} ${domain} ${mechanism} ${constraint} ${effect}`);
        refs.push(`$${mRef}`, `$${dRef}`);
      }

      const partVar = `Chapter${pad(c, 2)}_P${p + 1}`;
      lines.push('');
      lines.push(`@${partVar}:${partVar} bundle [${refs.join(', ')}]`);
      chapterParts.push(`$${partVar}`);
    }

    const chapterVar = `Chapter${pad(c, 2)}`;
    lines.push('');
    lines.push(`@${chapterVar}:${chapterVar} bundle [${chapterParts.join(', ')}]`);
    lines.push(`@${chapterVar}_Seq __Sequence [${chapterParts.join(', ')}]`);
    lines.push('');
    chapterVars.push(`$${chapterVar}`);
  }

  lines.push(`@Book_Seq __Sequence [${chapterVars.join(', ')}]`);
  lines.push(`@Book:Book bundle [${chapterVars.join(', ')}]`);
  lines.push('');

  return lines.join('\n');
}

function writeBook(filename, content) {
  ensureDir(BOOKS_DIR);
  const outPath = path.join(BOOKS_DIR, filename);
  fs.writeFileSync(outPath, content, 'utf8');
  return outPath;
}

function main() {
  const out1 = writeBook(
    'book_10cap_100.sys2',
    generateBook({
      filename: 'book_10cap_100.sys2',
      bookId: 'Book10Cap100',
      recordPrefix: 'B10',
      chapters: 10,
      ideasPerChapter: 10,
      keyPrefix: 'Key_B10C100',
      expectChapter: 10,
      expectIdeaIndex: 10,
    })
  );

  const out2 = writeBook(
    'book_10cap_1000.sys2',
    generateBook({
      filename: 'book_10cap_1000.sys2',
      bookId: 'Book10Cap1000',
      recordPrefix: 'B11',
      chapters: 10,
      ideasPerChapter: 100,
      keyPrefix: 'Key_B10C1000',
      expectChapter: 10,
      expectIdeaIndex: 100,
    })
  );

  process.stdout.write(`Generated:\n- ${out1}\n- ${out2}\n`);
}

main();

