# Benchmarking Suite

This directory contains performance benchmarks for the Pi SDK Agent.

## Running Benchmarks

```bash
# Run all benchmarks (requires tsx)
tsx benchmarks/init-bench.ts
```

## Benchmarks

- **Initialization** (`init-bench.ts`) - Measures agent startup time
- **Command Execution** (`commands-bench.ts`) - Measures command handler latency
- **Session Operations** (`session-bench.ts`) - Measures session read/write performance

## Baseline (as of 2026-04-22)

- Agent init: ~50-100ms (without API warmup)
- Command help: <5ms
- Session append: <1ms per entry
