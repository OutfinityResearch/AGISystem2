# AGISystem2 Performance Benchmarks

## Overview

This directory contains performance benchmarks and comparison tests for different HDC strategies in AGISystem2.

## Structure

```
performance/
├── benchmarks.mjs          # Main benchmark runner
├── theories/               # Complex test theories for benchmarking
│   ├── medical.fsp         # Medical domain knowledge base
│   ├── legal.fsp           # Legal domain knowledge base
│   └── scientific.fsp      # Scientific domain knowledge base
├── results/                # Benchmark results (generated)
│   ├── dense-binary/       # Dense binary strategy results
│   └── fractal-semantic/   # FSP strategy results
└── README.md               # This file
```

## Benchmark Suite

### 1. Microbenchmarks

- **Vector Creation**: Time to create random/deterministic vectors
- **Binding Operations**: Time for bind operations with different vector sizes
- **Similarity Calculation**: Time for similarity computations
- **Bundle Operations**: Time for bundling multiple vectors

### 2. Reasoning Performance

- **Query Execution**: Time to execute different types of queries
- **Proof Generation**: Time to generate proofs of varying complexity
- **Knowledge Base Operations**: Time for KB loading/saving

### 3. Memory Usage

- **Vector Memory**: Memory footprint per vector
- **Knowledge Base Memory**: Memory usage for different KB sizes
- **Scalability**: Memory growth with increasing knowledge base size

### 4. Scalability Tests

- **Large Knowledge Bases**: Performance with 10K+ facts
- **Complex Queries**: Performance with multi-hole queries
- **Deep Reasoning Chains**: Performance with 10+ step transitive reasoning

## Running Benchmarks

### Basic Usage

```bash
# Run all benchmarks
node benchmarks.mjs

# Run specific benchmark
node benchmarks.mjs --strategy=dense-binary --test=binding

# Compare strategies
node benchmarks.mjs --compare
```

### Command Line Options

```
Options:
  --strategy, -s    Strategy to benchmark (dense-binary, fractal-semantic, all)
  --test, -t        Specific test to run (binding, similarity, bundle, reasoning, all)
  --size, -z        Vector size for tests (default: 500 for FSP, 32768 for dense)
  --iterations, -i  Number of iterations (default: 1000)
  --compare, -c     Compare all strategies
  --output, -o      Output format (text, json, csv)
  --help, -h        Show help
```

## Test Theories

### Medical Domain (`theories/medical.fsp`)

A comprehensive medical knowledge base with:
- Disease hierarchies (50+ diseases)
- Symptom relationships (200+ symptoms)
- Treatment protocols (100+ treatments)
- Drug interactions (50+ drugs)

### Legal Domain (`theories/legal.fsp`)

A legal reasoning knowledge base with:
- Legal hierarchies (court systems, laws)
- Case precedents (100+ cases)
- Legal principles (50+ principles)
- Jurisdiction rules (20+ jurisdictions)

### Scientific Domain (`theories/scientific.fsp`)

A scientific knowledge base with:
- Scientific disciplines (20+ fields)
- Research methodologies (50+ methods)
- Hypothesis testing (100+ hypotheses)
- Experimental results (200+ findings)

## Expected Results

### Performance Comparison

| Operation | Dense Binary | Fractal Semantic | Notes |
|-----------|--------------|------------------|-------|
| **Binding** | 0.01ms | 1-5ms | FSP slower due to O(k² log k) complexity |
| **Similarity** | 0.1ms | 0.1ms | Similar performance |
| **Bundle** | 0.5ms | 0.5ms | Similar performance |
| **Memory/Vector** | 4KB | 4KB | Similar memory usage |

### Use Case Recommendations

**Use Dense Binary when**:
- Maximum performance is required
- Working with smaller knowledge bases (< 10K facts)
- Backward compatibility is important
- Simple queries are sufficient

**Use Fractal Semantic when**:
- Infinite scalability is needed
- Working with very large knowledge bases (> 10K facts)
- Statistical robustness is important
- Memory efficiency is critical
- Complex reasoning patterns are required

## Benchmark Implementation

### Key Metrics

1. **Operations per Second**: Throughput for core operations
2. **Latency**: Response time for individual operations
3. **Memory Usage**: Memory footprint measurements
4. **Accuracy**: Reasoning accuracy (should be identical between strategies)

### Test Methodology

1. **Warm-up**: Run tests multiple times to warm up JIT
2. **Multiple Iterations**: Run each test 1000+ times for statistical significance
3. **Different Sizes**: Test with different vector sizes (100, 500, 1000 exponents)
4. **Real-world Data**: Use realistic knowledge bases, not synthetic data

## Future Enhancements

### Planned Benchmarks

- **Distributed Computing**: Performance with distributed knowledge bases
- **Parallel Processing**: Multi-core scaling tests
- **Hybrid Strategies**: Performance of combined approaches
- **Domain-Specific**: Specialized benchmarks for different domains

### Automation

- **CI Integration**: Automated performance testing in CI pipeline
- **Regression Testing**: Detect performance regressions
- **Trend Analysis**: Track performance over time

## Contributing

### Adding New Benchmarks

1. Create a new test file in the appropriate directory
2. Follow the existing pattern for benchmark structure
3. Add documentation in this README
4. Ensure the benchmark runs with both strategies

### Running Benchmarks

```bash
# Run specific benchmark
node benchmarks.mjs --strategy=fractal-semantic --test=reasoning

# Save results
node benchmarks.mjs --output=json > results/fractal-semantic.json
```

## License

All benchmark code and data are licensed under the same license as AGISystem2.