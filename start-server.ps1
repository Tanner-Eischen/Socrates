# Start SocraTeach API Server
Write-Host "Starting SocraTeach API Server..." -ForegroundColor Green
Write-Host ""

# Set environment
$env:NODE_ENV = "development"

# Change to project directory
Set-Location $PSScriptRoot

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠ .env file not found - server may not have required configuration" -ForegroundColor Yellow
}

# Start the server
Write-Host ""
Write-Host "Starting server on port 3333..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run api:dev

