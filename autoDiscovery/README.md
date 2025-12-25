# AutoDiscovery (Agent Workflow)

`autoDiscovery/` is a **bug-discovery + regression-tracking** harness that:
1) samples examples from external reasoning suites (LogiGlue subsets)
2) runs `translateNL2DSL`/`translateExample` (NL→DSL)
3) runs the real symbolic engine: `Session.learn(contextDsl)` then `Session.prove/query(questionDsl)`
4) buckets failures into `autoDiscovery/bugCases/` (reasoning) and keeps `quarantine/` empty

## One Command (Recommended)

Use the single entry point:

```bash
node autoDiscovery/runAutodiscoveryAgent.mjs --help
```

Typical runs:

```bash
# Clean + run a batch (cache-only/offline by default)
node autoDiscovery/runAutodiscoveryAgent.mjs --clean --batch=500

# Limit to one external suite (source)
node autoDiscovery/runAutodiscoveryAgent.mjs --source=prontoqa --batch=500

# Continuous loop (Ctrl+C to stop)
node autoDiscovery/runAutodiscoveryAgent.mjs --continuous --batch=200

# Show current folder status
node autoDiscovery/runAutodiscoveryAgent.mjs status
```

## What It Prints Each Run

Every run prints:
- global totals (passed / total; plus translation vs reasoning vs unsupported/no-expectation counts)
- **per-source pass rate** (e.g. `prontoqa`, `logicnli`, `logiqa`, `folio`, `reclor`, `clutrr`, …)
  - computed as `passed / evaluable`, where `evaluable = total - unsupported - noExpectation`

This is the “% passed per external evaluation suite” view.

## Outputs / Invariants

After a normal run we expect:
- `autoDiscovery/quarantine/` to be empty (the agent processes it into bug folders)
- `autoDiscovery/nlpBugs/` to be empty (we treat translation bugs as “fix immediately”, not “accumulate”)
- reasoning failures recorded as JSONs in `autoDiscovery/bugCases/BUG*/`

Useful status check:

```bash
node autoDiscovery/runAutodiscoveryAgent.mjs status
```

## Offline vs Online

By default the agent runs **offline (cache-only)** to avoid slow network retries.

- Default: offline/cache-only
- Opt-in downloads: add `--online`

```bash
node autoDiscovery/runAutodiscoveryAgent.mjs --online --batch=200
```

## Options (Summary)

Run `--help` for the full list. The important ones:
- `--batch=N` how many examples to sample per iteration
- `--workers=N` parallelism for executing examples
- `--source=NAME` restrict to a single suite/subset
- `--strict-operators` disables auto-declaration of unknown operators (useful for “strict” translation checks)
- `--clean` resets `analised.md`, `quarantine/`, and (by default) `bugCases/` + `nlpBugs/`

