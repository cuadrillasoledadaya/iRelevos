# cargargit.ps1 - Setup rápido del proyecto en Windows
# Uso: .\cargargit.ps1

Write-Host "🚀 Configurando Relevos App en Windows..." -ForegroundColor Cyan

# Verificar si ya existe el repo
if (Test-Path ".\package.json") {
    Write-Host "✓ Repositorio ya clonado, actualizando..." -ForegroundColor Green
    git fetch origin
    git co main
    git pull origin main
} else {
    Write-Host "📦 Clonando repositorio desde GitHub..." -ForegroundColor Green
    git clone https://github.com/cuadrillasoledadaya/iRelevos.git .
}

# Instalar dependencias
Write-Host "📥 Instalando dependencias..." -ForegroundColor Green
npm install

# Crear .env.local si no existe
if (-not (Test-Path ".\.env.local")) {
    Write-Host "🔧 Creando .env.local desde template..." -ForegroundColor Green
    Copy-Item ".env.example" ".env.local"
    Write-Host "⚠️  EDITA .env.local con tus valores de Supabase antes de continuar!" -ForegroundColor Yellow
}

# Verificar instalación
Write-Host "✅ Verificando instalación..." -ForegroundColor Cyan
npm run type-check
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ TypeScript OK" -ForegroundColor Green
} else {
    Write-Host "✗ Error en TypeScript" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Setup completado!" -ForegroundColor Cyan
Write-Host "Para iniciar: npm run dev" -ForegroundColor Yellow