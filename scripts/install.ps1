# PowerShell installer
Write-Host "🔧 Installing pi-sdk-agent..." -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is required. Please install Node.js 20 or later." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci --only=production

# Build
Write-Host "🔨 Building..." -ForegroundColor Yellow
npm run build

Write-Host "✅ Installation complete." -ForegroundColor Green
Write-Host "   Run with: npm start" -ForegroundColor Cyan