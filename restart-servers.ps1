# Socrates Server Restart Script
Write-Host "Stopping existing servers..." -ForegroundColor Yellow

# Kill any Node processes using ports 3333 (backend) and 5173 (frontend)
$port3333 = netstat -ano | findstr :3333 | ForEach-Object { $_ -split '\s+' | Select-Object -Last 1 } | Select-Object -Unique
$port5173 = netstat -ano | findstr :5173 | ForEach-Object { $_ -split '\s+' | Select-Object -Last 1 } | Select-Object -Unique

if ($port3333) {
    Write-Host "   Killing backend (port 3333, PID: $port3333)..." -ForegroundColor Red
    taskkill /PID $port3333 /F 2>$null
}

if ($port5173) {
    Write-Host "   Killing frontend (port 5173, PID: $port5173)..." -ForegroundColor Red
    taskkill /PID $port5173 /F 2>$null
}

Write-Host "Servers stopped" -ForegroundColor Green
Write-Host ""

# Wait a moment for ports to free up
Start-Sleep -Seconds 2

# Start backend in new window
Write-Host "Starting backend server (port 3333)..." -ForegroundColor Cyan
$backendPath = $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$backendPath'; node dist/api/index.js`""

# Wait for backend to initialize
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "Starting frontend server (port 5173)..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "client"
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$frontendPath'; npm run dev`""

Write-Host ""
Write-Host "Servers starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:   http://localhost:3333" -ForegroundColor Yellow
Write-Host "Assessments: http://localhost:5173/assessments" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to exit this script (servers will keep running)" -ForegroundColor Gray
Write-Host "Close the server windows to stop them" -ForegroundColor Gray

# Keep script running
Read-Host "Press Enter to close this launcher"
