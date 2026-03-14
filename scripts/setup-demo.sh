#!/bin/bash
# Socrates AI Tutoring Platform - Quick Demo Setup
# Run this script to set up a local demo environment in under 2 minutes

set -e

echo "=========================================="
echo "  Socrates AI Tutor - Quick Demo Setup"
echo "=========================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[ERROR] Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "[OK] Node.js $(node -v) found"
echo ""

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "[SETUP] Creating .env from .env.example..."
    cp .env.example .env

    # Enable in-memory database for quick demo (no PostgreSQL needed)
    if grep -q "# DB_INMEM=true" .env; then
        sed -i.bak 's/# DB_INMEM=true/DB_INMEM=true/' .env && rm -f .env.bak
        echo "[OK] Enabled in-memory database (no PostgreSQL required)"
    fi
else
    echo "[SKIP] .env already exists"
fi

echo ""
echo "[SETUP] Installing backend dependencies..."
npm install

echo ""
echo "[SETUP] Installing frontend dependencies..."
cd client && npm install && cd ..

echo ""
echo "=========================================="
echo "  Demo Setup Complete!"
echo "=========================================="
echo ""
echo "To start the demo:"
echo ""
echo "  Terminal 1 (API):"
echo "    npm run api:dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd client && npm run dev"
echo ""
echo "Then open http://localhost:5173"
echo "Click 'use test account' to sign in with demo credentials."
echo ""
