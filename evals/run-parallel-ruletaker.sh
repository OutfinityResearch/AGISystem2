#!/bin/bash
# Run 10 parallel RuleTaker evaluations with different seeds

echo "Starting 10 parallel RuleTaker evaluations..."
echo "================================================"

# Run 10 workers in parallel
for i in 1 2 3 4 5 6 7 8 9 10; do
  seed=$((42 + i))
  echo "[W$i] Starting with seed=$seed..."
  (
    node evals/runRuleTakerEval.mjs --fast --seed=$seed -v 2>&1 | while read line; do
      echo "[W$i] $line"
    done
  ) &
done

# Wait for all to complete
wait

echo ""
echo "================================================"
echo "=== All 10 workers completed ==="
