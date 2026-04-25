Write-Host "Building VidyaAI frontend..."
Set-Location "$PSScriptRoot\frontend"
npm install
npm run build

Write-Host "Starting VidyaAI backend..."
Set-Location "$PSScriptRoot\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
