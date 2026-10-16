import os
import sys
import uvicorn

# Set current directory to backend
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if __name__ == "__main__":
    print("=" * 70)
    print("  Intelligent Decision Support System for Risk Assessment (MDS)")
    print("  FastAPI ML Server starting on http://127.0.0.1:8000")
    print("  Interactive API Docs: http://127.0.0.1:8000/docs")
    print("=" * 70)
    
    os.chdir(BACKEND_DIR)
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
