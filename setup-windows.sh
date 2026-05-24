#!/bin/bash
# setup-windows.sh - Setup rápido del proyecto en Git Bash / WSL / Linux

set -e

echo "🚀 Configurando Relevos App..."

# Verificar si ya existe el repo
if [ -f "package.json" ]; then
    echo "✓ Repositorio ya clonado, actualizando..."
    git fetch origin
    git checkout main
    git pull origin main
else
    echo "📦 Clonando repositorio desde GitHub..."
    git clone https://github.com/cuadrillasoledadaya/iRelevos.git .
fi

# Instalar dependencias
echo "📥 Instalando dependencias..."
npm install

# Crear .env.local si no existe
if [ ! -f ".env.local" ]; then
    echo "🔧 Creando .env.local desde template..."
    cp .env.example .env.local
    echo "⚠️  EDITA .env.local con tus valores de Supabase antes de continuar!"
fi

# Verificar instalación
echo "✅ Verificando instalación..."
npm run type-check

echo "🎉 Setup completado!"
echo "Para iniciar: npm run dev"