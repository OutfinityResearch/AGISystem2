export function tryRecordNlTranslationProvenance(session, { nlText, dslText, translation }) {
  try {
    session.recordNlTranslationProvenance?.(
      { nlText, dslText, translation },
      // Best-effort: include derived provenance DSL lines only when explicitly enabled.
      // Provenance must not be injected into the KB truth store.
      { materializeFacts: session?.urcMaterializeFacts === true }
    );
    return { success: true };
  } catch {
    // Provenance must not block user commands.
    return { success: false };
  }
}
