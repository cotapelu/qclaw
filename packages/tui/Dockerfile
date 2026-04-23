# Node.js TUI Demo with pi-tui-professional
# Build: docker build -t pi-tui-demo .
# Run: docker run -it --rm pi-tui-demo

FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package manifests
COPY packages/tui/package.json .
COPY packages/tui/package-lock.json* ./

# Install dependencies (including peer deps)
RUN npm ci --omit=dev

# Copy built package
COPY packages/tui/dist ./dist
COPY packages/tui/README.md .

# Copy demo script
COPY packages/tui/examples/basic-chat.ts ./demo.js

# Convert TypeScript demo to JavaScript (simplified for Docker)
# In practice, you'd provide a pre-built JS demo or use tsx in container
# This is a placeholder – actual demo would need proper setup

# Run the demo (using tsx since it's a devDependency? Actually not in deps)
# For production image, we'd need to bundle or provide JS
# This Dockerfile is illustrative; real usage would use npm package after install

CMD ["node", "dist/index.js"]
