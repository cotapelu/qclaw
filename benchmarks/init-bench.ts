import { performance } from 'perf_hooks';
import { AgentCore } from '../src/agent/core.js';
import { SettingsManager } from '@mariozechner/pi-coding-agent';

console.log('🏎️  Agent Initialization Benchmark\n');

async function benchInit(persisted: boolean, iterations: number = 5) {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Use in-memory settings to avoid file I/O variance
    const settingsManager = SettingsManager.inMemory({
      compaction: { enabled: true, tokens: 2000 },
      retry: { enabled: true, maxRetries: 2 },
    });

    const agent = new AgentCore({
      usePersistence: persisted,
      verbose: false,
      quiet: true,
    });

    // Inject in-memory settings to avoid file load
    (agent as any).settingsManager = settingsManager;

    const start = performance.now();
    await agent.initialize();
    const end = performance.now();

    agent.dispose();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`  Persisted: ${persisted ? 'Yes' : 'No'}`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Avg: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms\n`);
}

async function run() {
  console.log('Running initialization benchmarks...\n');
  await benchInit(false, 5);
  await benchInit(true, 5);
  console.log('✅ Done');
}

run().catch(console.error);
