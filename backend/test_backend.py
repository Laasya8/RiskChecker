import sys
import os

from config import DATASET_PATH
from database import init_db
from models.model_manager import ModelManager

print("Initializing DB...")
init_db()
print("DB initialized.")

print("Initializing ModelManager...")
manager = ModelManager()
summary = manager.initialize()
print("Initialization successful!")
print("Best model:", summary["best_model"])

# Test assessment
test_case = {
    "Category": "Cybersecurity",
    "Severity": 8.0,
    "Likelihood": 7.5,
    "Exposure": 8.0,
    "Frequency": 4.0,
    "Duration": 6.0,
    "Impact": 8.5,
    "Historical_Occurrence": 3.0,
    "Control_Effectiveness": 3.5
}
print("\nTesting Assessment...")
res = manager.assess_risk(test_case)
print(f"Predicted Risk: {res['predicted_risk']}")
print(f"Risk Score: {res['risk_score']} / 100")
print(f"Confidence: {res['confidence_pct']}%")
print(f"Selected Model: {res['selected_model']['display_name']}")
print(f"Top Contributing Factors: {[f['factor'] for f in res['contributing_factors']]}")
print(f"Similar Historical Cases found: {len(res['similar_cases'])}")
for sc in res['similar_cases'][:3]:
    print(f"  - {sc['case_id']} | Category: {sc['category']} | Sim: {sc['similarity_pct']}% | Risk: {sc['known_risk_level']}")
print("\nBackend self-test passed with flying colors!")
