$ErrorActionPreference = "SilentlyContinue"
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  ORBITA STUDIO - Unified Multimedia & Document Suite" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Kill any existing processes on 5001 and 3003
Get-NetTCPConnection -LocalPort 5001, 3003 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Start Python Engine
$pyServer = Join-Path $scriptDir "python_engine\server.py"
$pythonProcess = Start-Process -FilePath "python" -ArgumentList "`"$pyServer`"" -PassThru -WindowStyle Hidden

Start-Sleep -Milliseconds 800

Write-Host ">>> Backend Engine Active on http://localhost:5001" -ForegroundColor Green
Write-Host ">>> Launching ORBITA Studio UI on http://localhost:3003" -ForegroundColor Cyan
Write-Host ">>> Press [Ctrl + C] anytime to stop immediately (No Y/N prompt)." -ForegroundColor Gray

Set-Location $scriptDir
try {
    npm run dev
} finally {
    if ($pythonProcess -and !$pythonProcess.HasExited) {
        Stop-Process -Id $pythonProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Write-Host "`nORBITA Studio stopped cleanly." -ForegroundColor Yellow
}

