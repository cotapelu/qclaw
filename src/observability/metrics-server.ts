import { initMetrics, getMetricsString } from '../observability/metrics.js';
import { createServer } from 'http';

/**
 * Metrics server for Prometheus scraping
 */
export class MetricsServer {
  private server: any;
  private port: number;

  constructor(port: number = 9090) {
    this.port = port;
  }

  /**
   * Start the metrics HTTP server
   */
  start(): void {
    if (this.server) {
      return; // Already started
    }

    initMetrics();

    this.server = createServer(async (req, res) => {
      if (req.url === '/metrics') {
        try {
          const metrics = await getMetricsString();
          res.writeHead(200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(metrics);
        } catch (error) {
          res.writeHead(500);
          res.end(`# Error generating metrics: ${error}\n`);
        }
      } else if (req.url === '/health') {
        // Simple health check
        const health = this.getHealthStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
      } else {
        res.writeHead(404);
        res.end('Not Found\n');
      }
    });

    this.server.listen(this.port, () => {
      console.log(`📊 Metrics server listening on port ${this.port}`);
      console.log(`   /metrics - Prometheus format`);
      console.log(`   /health  - Health check JSON`);
    });

    // Handle errors quietly if port in use
    this.server.on('error', (err: any) => {
      if (err.code !== 'EADDRINUSE') {
        console.error('Metrics server error:', err.message);
      }
    });
  }

  /**
   * Stop the metrics server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  /**
   * Get current health status
   */
  private getHealthStatus(): any {
    const now = Date.now();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      uptime: `${Math.floor(uptime)}s`,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get port number
   */
  getPort(): number {
    return this.port;
  }
}

/**
 * Singleton metrics server instance
 */
let metricsServerInstance: MetricsServer | null = null;

export function startMetricsServer(port?: number): MetricsServer {
  if (!metricsServerInstance) {
    metricsServerInstance = new MetricsServer(port);
    metricsServerInstance.start();
  }
  return metricsServerInstance;
}

export function stopMetricsServer(): void {
  metricsServerInstance?.stop();
  metricsServerInstance = null;
}
