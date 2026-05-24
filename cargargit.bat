@echo off
REM cargargit.bat - Setup rápido del proyecto en Windows CMD

echo 🚀 Configurando Relevos App en Windows...

if exist package.json (
    echo ✓ Repositorio ya clonado, actualizando...
    git fetch origin
    git checkout main
    git pull origin main
) else (
    echo 📦 Clonando repositorio desde GitHub...
    git clone https://github.com/cuadrillasoledadaya/iRelevos.git .
)

echo 📥 Instalando dependencias...
npm install

if not exist .env.local (
    echo 🔧 Creando .env.local desde template...
    copy .env.example .env.local
    echo ⚠️  EDITA .env.local con tus valores de Supabase!
)

echo ✅ Verificando instalación...
npm run type-check
if %ERRORLEVEL% EQU 0 (
    echo ✓ TypeScript OK
)

echo.
echo 🎉 Setup completado!
echo Para iniciar: npm run dev