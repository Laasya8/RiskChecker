import os
import sys

# Ensure root and backend directories are in Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))

for path in [backend_dir, root_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from backend.app import app  # Works for IDE static analyzers & root runners
except (ImportError, ModuleNotFoundError):
    from app import app  # type: ignore  # Works when backend is root in sys.path

