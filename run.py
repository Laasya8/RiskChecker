import os
import sys
import subprocess
import uvicorn

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dist = os.path.join(root_dir, "frontend", "dist")
    
    # Auto-build frontend if dist does not exist
    if not os.path.exists(frontend_dist):
        print("Frontend build not found. Building React bundle with npm...")
        frontend_dir = os.path.join(root_dir, "frontend")
        try:
            subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True, shell=True)
            print("Frontend built successfully.")
        except Exception as e:
            print(f"Warning: Could not build frontend automatically: {e}")
            print("Make sure you run 'npm run build' inside the frontend folder.")

    backend_dir = os.path.join(root_dir, "backend")
    sys.path.insert(0, backend_dir)
    
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("=" * 65)
    print("   INTELLIGENT RISK DECISION SUPPORT SYSTEM (UNIFIED APP)   ")
    print("=" * 65)
    print(f"-> Application URL: http://localhost:{port}")
    print(f"-> API Swagger Docs: http://localhost:{port}/docs")
    print(f"-> Single-service deployment ready.")
    print("=" * 65)
    
    uvicorn.run("app:app", app_dir=backend_dir, host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
