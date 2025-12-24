# BUG003: Deep chain failure

## Description
Multi-hop inference chains (>3 steps)

## How to Run Cases
```bash
node autoDiscovery/runBugSuite.mjs --bug=BUG003
```

## Cases

### folio_3f468f42
- **Source:** folio
- **Expected:** TRUE | **Actual:** not proved
- **JSON:** `autoDiscovery/bugCases/BUG003/folio_3f468f42.json`
- **Run:** `node autoDiscovery/runBugCase.mjs autoDiscovery/bugCases/BUG003/folio_3f468f42.json`

