# Suite 33: Policy View (URC)

Purpose:
- Validate the derived policy view surface (`Session.materializePolicyView`).
- Validate that `negates(new, old)` removes the superseded fact from the current view.
- Validate that policy configuration facts (e.g. `policyNewerWins`) are discoverable in the policy view.
- Validate optional audit-line materialization (`@_ Set urcMaterializeFacts True`) without mutating the KB truth store.

Notes:
- This suite does not test full evidence ranking yet (future DS49 work).
- It focuses on the minimal deterministic semantics already implemented in v0.

