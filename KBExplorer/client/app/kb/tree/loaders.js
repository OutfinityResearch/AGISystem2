import { ensureCategoryLoaded, handleAction } from './loaders/categories.js';
import { ensureDefinitionLoaded, ensureDefinitionTreeLoaded } from './loaders/definitions.js';
import {
  ensureFactLoaded,
  ensureGraphLoaded,
  ensureKbBundleLoaded,
  ensureUrcArtifactLoaded,
  ensureUrcEvidenceLoaded,
  ensureUrcPolicyViewLoaded,
  ensureUrcProvenanceLoaded,
  ensureVocabAtomLoaded
} from './loaders/entities.js';

export { ensureFactLoaded } from './loaders/entities.js';

export const loaders = {
  ensureDefinitionLoaded,
  ensureDefinitionTreeLoaded,
  ensureKbBundleLoaded,
  ensureCategoryLoaded,
  ensureGraphLoaded,
  ensureVocabAtomLoaded,
  ensureFactLoaded,
  ensureUrcArtifactLoaded,
  ensureUrcEvidenceLoaded,
  ensureUrcProvenanceLoaded,
  ensureUrcPolicyViewLoaded,
  handleAction
};
