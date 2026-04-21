#!/usr/bin/env bash
set -e

echo "🔧 Installing pi-sdk-agent..."

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required. Please install Node.js 20 or later."
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build
echo "🔨 Building..."
npm run build

echo "✅ Installation complete."
echo "   Run with: npm start"