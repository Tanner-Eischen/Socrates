# Socrates AI Tutoring Platform - Quick Demo Setup (Windows PowerShell)
# Run this script to set up a local demo environment in under 2 minutes

Write-Host "=========================================="
Write-Host "  Socrates AI Tutor - Quick Demo Setup"
Write-Host "=========================================="
Write-Host ""

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 18) {
    Write-Host "[ERROR] Node.js 18+ required. Current version: $(node -v)" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Node.js $(node -v) found" -ForegroundColor Green
Write-Host ""

# Create .env from example if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "[SETUP] Creating .env from .env.example..."
    Copy-Item ".env.example" ".env"

    # Enable in-memory database for quick demo (no PostgreSQL needed)
    (Get-Content ".env") -replace '# DB_INMEM=true', 'DB_INMEM=true' | Set-Content ".env"
    Write-Host "[OK] Enabled in-memory database (no PostgreSQL required)" -ForegroundColor Green
} else {
    Write-Host "[SKIP] .env already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[SETUP] Installing backend dependencies..."
npm install

Write-Host ""
Write-Host "[SETUP] Installing frontend dependencies..."
Set-Location client
npm install
Set-Location ..

Write-Host ""
Write-Host "=========================================="
Write-Host "  Demo Setup Complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "To start the demo:"
Write-Host ""
Write-Host "  Terminal 1 (API):"
Write-Host "    npm run api:dev"
Write-Host ""
Write-Host "  Terminal 2 (Frontend):"
Write-Host "    cd client && npm run dev"
Write-Host ""
Write-Host "Then open http://localhost:5173"
Write-Host "Click 'use test account' to sign in with demo credentials."
Write-Host ""
