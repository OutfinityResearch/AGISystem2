# FastEval Supported English

Generated at: 2025-12-30T21:44:02.489Z

This file is generated from canonical DSL, not from existing suite prose.
It shows the English subset we can realistically standardize on.

## Summary

| Suite | Cases | Supported NL |
|---|---:|---:|
| suite27_contrapositive_negation | 6 | 6 |


## suite27_contrapositive_negation - Contrapositive Negation

Derive Not(antecedent) from Not(conclusion) and remaining antecedents

| # | action | NL (original) | NL (supported) |
|---:|---|---|---|
| 2 | prove | Prove: Stella is not a yumpus (via contrapositive from Not(Tumpus)). | Stella is not a Yumpus. |
| 4 | prove | Prove: Alex is not a vumpus (from Not(Brimpus) and Vumpus→(Brimpus∧Zumpus)). | Alex is not a Vumpus. |
| 6 | prove | Prove: Stella is not a vumpus (from Not(Numpus) and the implication chain). | Stella is not a Vumpus. |
| 8 | prove | Prove: Max is not a shumpus (from Not(Impus) and (Lempus OR Shumpus OR Yumpus)→Impus). | Max is not a Shumpus. |
| 10 | prove | Prove: Wren is not a numpus (from Not(Brimpus) + Or→Brimpus + Numpus→(Wumpus∧Tumpus)). | Wren is not a Numpus. |
| 12 | prove | Prove: Stella is not a shumpus (should find the easy refutation path via Not(Sterpus) without exhausting step budget). | Stella is not a Shumpus. |
