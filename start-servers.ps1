t would make the app# Mini Inventory System - Startup Script
# PowerShell version for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Mini Inventory System - Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command($command) {
    try {
        if (Get-Command $command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Check dependencies
Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow

if (-not (Test-Command "pipenv")) {
    Write-Host "❌ Error: pipenv is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install pipenv: pip install pipenv" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Command "pnpm")) {
    Write-Host "❌ Error: pnpm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install pnpm: npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Dependencies check passed" -ForegroundColor Green
Write-Host ""

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "Please copy env.example to .env and configure your database settings" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🚀 Starting servers..." -ForegroundColor Green
Write-Host ""
Write-Host "📡 Backend will run on: http://localhost:9000" -ForegroundColor Cyan
Write-Host "🌐 Frontend will run on: http://localhost:9001" -ForegroundColor Cyan
Write-Host "📱 App will be available at: http://localhost:9001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start backend server
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pipenv run uvicorn api.main:app --reload --port 9000
}

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "🌐 Starting Frontend Server..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm dev --port 9001
}

Write-Host ""
Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📋 Server Status:" -ForegroundColor Cyan
Write-Host "   - Backend:  http://localhost:9000" -ForegroundColor White
Write-Host "   - Frontend: http://localhost:9001" -ForegroundColor White
Write-Host "   - App:      http://localhost:9001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Use Get-Job to see running jobs" -ForegroundColor White
Write-Host "   - Use Stop-Job to stop individual servers" -ForegroundColor White
Write-Host "   - Use Remove-Job to clean up completed jobs" -ForegroundColor White
Write-Host "   - Make sure your .env file is configured properly" -ForegroundColor White
Write-Host ""

# Function to handle cleanup
function Stop-Servers {
    Write-Host "`n🛑 Shutting down servers..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Servers stopped" -ForegroundColor Green
}

# Register cleanup function for Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action { Stop-Servers }

# Keep the script running and show job status
try {
    while ($true) {
        Start-Sleep -Seconds 5

        # Check if jobs are still running
        $backendStatus = (Get-Job $backendJob).State
        $frontendStatus = (Get-Job $frontendJob).State

        if ($backendStatus -eq "Failed" -or $frontendStatus -eq "Failed") {
            Write-Host "❌ One or more servers failed to start" -ForegroundColor Red
            break
        }

        if ($backendStatus -eq "Completed" -or $frontendStatus -eq "Completed") {
            Write-Host "⚠️  One or more servers completed unexpectedly" -ForegroundColor Yellow
            break
        }
    }
}
catch {
    Write-Host "`n🛑 Interrupted by user" -ForegroundColor Yellow
}
finally {
    Stop-Servers
}
