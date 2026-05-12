# Corre el ETL localmente usando el JSON de la Service Account
# Uso: .\scripts\test_local.ps1

$credPath = "$env:USERPROFILE\Downloads\sacred-amp-400917-4781c794e556.json"

if (-not (Test-Path $credPath)) {
    Write-Error "No se encontró el JSON en $credPath"
    exit 1
}

$env:GOOGLE_CREDENTIALS_JSON = Get-Content $credPath -Raw

Set-Location (Split-Path $PSScriptRoot -Parent)

# Instalar dependencias si no están
pip install -r scripts/requirements.txt --quiet

# Correr ETL
python scripts/etl_ml.py
