@echo off
echo ======================================================================
echo  Intelligent Decision Support System for Risk Assessment Using ML
echo ======================================================================
echo Starting FastAPI ML Backend on http://127.0.0.1:8000 ...
start "Risk Assessment Backend (FastAPI)" cmd /k "python start_backend.py"

echo Starting React Vite Frontend on http://localhost:5173 ...
cd frontend
start "Risk Assessment Frontend (React)" cmd /k "npm run dev"

echo.
echo Both servers initiated!
echo Backend:  http://127.0.0.1:8000 (API Docs: http://127.0.0.1:8000/docs)
echo Frontend: http://localhost:5173
echo ======================================================================
pause
