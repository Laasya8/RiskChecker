"""Train and report the RiskChecker models without starting the web server."""

import argparse
import json
import os

from config import MODELS_CACHE_DIR
from models.model_manager import ModelManager


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reuse-cache",
        action="store_true",
        help="Reuse a matching model artifact instead of retraining.",
    )
    args = parser.parse_args()

    manager = ModelManager()
    summary = manager.initialize(force_retrain=not args.reuse_cache)
    report_path = os.path.join(MODELS_CACHE_DIR, "experiment_results.json")
    with open(report_path, "w", encoding="utf-8") as report_file:
        json.dump(summary, report_file, indent=2)

    print(json.dumps(summary, indent=2))
    print(f"\nExperiment report written to: {report_path}")


if __name__ == "__main__":
    main()
