#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing Python backend dependencies..."
pip install -r requirements.txt

echo "Building React frontend production bundle..."
cd frontend
npm install
npm run build
cd ..

echo "Build complete! Ready for single-service deployment."
