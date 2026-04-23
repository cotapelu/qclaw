# Deployment Guide

## Quick Start

### 1. Build the Application

```bash
npm ci
npm run build
```

### 2. Configure API Keys

Set environment variables or create `~/.pi/agent/auth.json`:

```json
{
  "credentials": [
    { "provider": "anthropic", "apiKey": "sk-ant-..." }
  ]
}
```

### 3. Run

```bash
# Interactive CLI
npm start

# Print mode (single query)
npm start --print "Explain main.ts"

# RPC mode (JSON-RPC over stdio)
npm start --rpc
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t pi-sdk-agent .

# Run (mount agent directory for persistence)
docker run -it -v ~/.pi/agent:/home/nodejs/.pi/agent pi-sdk-agent
```

### Docker Compose

```yaml
version: '3'
services:
  qclaw:
    image: pi-sdk-agent:latest
    volumes:
      - ~/.pi/agent:/home/nodejs/.pi/agent
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    stdin_open: true
    tty: true
```

## Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pi-agent
spec:
  containers:
  - name: agent
    image: pi-sdk-agent:latest
    env:
    - name: ANTHROPIC_API_KEY
      valueFrom:
        secretKeyRef:
          name: pi-secrets
          key: anthropic-api-key
    volumeMounts:
    - name: agent-data
      mountPath: /home/nodejs/.pi/agent
    stdin: true
    tty: true
  volumes:
  - name: agent-data
    persistentVolumeClaim:
      claimName: agent-pvc
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude) |
| `OPENAI_API_KEY` | OpenAI API key (GPT) |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `PI_AGENT_DIR` | Agent directory (default: `~/.pi/agent`) |
| `PI_VERBOSE` | Enable verbose logging (`true`/`false`) |

## Production Considerations

- **Persistence**: Mount volume for `~/.pi/agent` to preserve sessions, settings, logs
- **Secrets**: Use Docker/K8s secrets for API keys; avoid baking into image
- **Resource limits**: Agent is memory-intensive; allocate ~512MB minimum
- **Logging**: File logs written to `~/.pi/agent/logs/`; consider log rotation
- **Security**: Run as non-root user (Dockerfile already configured)

## Monitoring

- Health check: `node dist/index.js --print "/health"` (if RPC mode, send `{"jsonrpc":"2.0","method":"health","id":1}`)
- Cost tracking: Use `/cost history` command
- Logs: Check `~/.pi/agent/logs/` for structured logs

## Updates

```bash
git pull
npm ci
npm run build
# Restart agent
```

## Troubleshooting

- **No models available**: Check API key and billing
- **Permission errors**: Ensure mounted volume is writable by UID 1001 (nodejs user in container)
- **High latency**: Enable model caching (automatic) and check network connectivity
