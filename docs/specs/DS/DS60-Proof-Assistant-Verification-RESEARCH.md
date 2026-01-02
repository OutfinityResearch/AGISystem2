# AGISystem2 - System Specifications
#
# DS60: Proof Assistants / Certificate Verification — RESEARCH
#
**Document Version:** 0.1  
**Status:** Research / Not Implemented  
**Audience:** Core maintainers  
**Scope:** Verifier backend contracts for externally produced proof objects  

---

## 1. Goal

Define how AGISystem2 can:

- ingest proof/certificate artifacts,
- verify them with a small trusted checker (where feasible),
- and upgrade evidence status to `Verified`.

---

## 2. URC mapping

- **Evidence**: `ProofLog`, `DualCert`, `Invariant`, etc.
- **Artifacts**: proof formats (SAT/SMT/LP duals), checker logs
- **Policy**: verified evidence should be ranked stronger.

