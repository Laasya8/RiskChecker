import json
import os
import sys

# Ensure backend path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app
from fastapi.testclient import TestClient

client = TestClient(app.app)

def test_all():
    print("--- 1. Testing GET /api/health ---")
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    h = res.json()
    assert h["status"] == "healthy"
    print("Health OK:", h)

    print("\n--- 2. Testing GET /api/config ---")
    res = client.get("/api/config")
    assert res.status_code == 200, res.text
    cfg = res.json()
    assert "numeric_features" in cfg
    assert "Severity" in cfg["numeric_features"]
    print("Config OK. Total numeric features:", len(cfg["numeric_features"]))
    for feat, meta in cfg["numeric_features"].items():
        print(f"  * {feat}: min={meta['min']}, max={meta['max']}, step={meta.get('step', 1)}, anchors={meta.get('anchors', {})}")

    print("\n--- 3. Testing GET /api/summary ---")
    res = client.get("/api/summary")
    assert res.status_code == 200, res.text
    summ = res.json()
    assert "dataset_info" in summ
    assert "best_model" in summ
    print("Summary OK. Best model:", summ["best_model"]["display_name"])
    print(f"Dataset total cases: {summ['dataset_info']['total_records']}")

    print("\n--- 4. Testing POST /api/assess ---")
    test_case = {
        "case_title": "Database Outage Scenario",
        "Category": "Cybersecurity",
        "Severity": 8,
        "Likelihood": 7,
        "Exposure": 8,
        "Frequency": 4,
        "Duration": 6,
        "Impact": 8,
        "Historical_Occurrence": 3,
        "Control_Effectiveness": 3,
        "chosen_model": "auto"
    }
    res = client.post("/api/assess", json=test_case)
    assert res.status_code == 200, res.text
    ass_res = res.json()
    assert "predicted_risk" in ass_res
    assert "risk_score" in ass_res
    assert "similar_cases" in ass_res
    assert "decision_tree_path" in ass_res
    print(f"Assessment OK. Predicted Risk: {ass_res['predicted_risk']}, Risk Score: {ass_res['risk_score']} / 100")
    print(f"Model Confidence: {ass_res['confidence_pct']}%")
    print(f"Similar Cases retrieved (KNN): {len(ass_res['similar_cases'])}")
    for sc in ass_res["similar_cases"][:3]:
        print(f"   - #{sc['case_id']} | Sim: {sc['similarity_pct']}% | Risk: {sc['known_risk_level']}")
    print(f"Decision Tree Steps: {len(ass_res['decision_tree_path']['steps'])}")
    for st in ass_res['decision_tree_path']['steps']:
        print(f"   - Step {st['node_id']}: {st['description']}")

    print("\n--- 5. Testing POST /api/what-if ---")
    mod_case = dict(test_case)
    mod_case["Control_Effectiveness"] = 9
    mod_case["Likelihood"] = 3
    mod_case["Severity"] = 4
    res = client.post("/api/what-if", json={"original_inputs": test_case, "modified_inputs": mod_case, "chosen_model": "auto"})
    assert res.status_code == 200, res.text
    what_if_res = res.json()
    comp = what_if_res["comparison"]
    print(f"What-If OK. Transition: {comp['original_risk_level']} ({comp['original_risk_score']}) -> {comp['modified_risk_level']} ({comp['modified_risk_score']})")
    print(f"Score Delta: {comp['score_delta']}")
    print(f"Analysis: {comp['summary']}")

    print("\n--- 6. Testing GET /api/models ---")
    res = client.get("/api/models")
    assert res.status_code == 200, res.text
    models_res = res.json()
    assert "evaluations" in models_res
    assert "cross_validations" in models_res
    assert models_res["dataset_info"]["test_evaluation_records"] > 0
    assert models_res["dataset_info"]["evaluation_caveat"]
    assert all(
        cv["splitter"] == "StratifiedGroupKFold"
        for cv in models_res["cross_validations"].values()
    )
    print("Models OK. Models evaluated:", list(models_res["evaluations"].keys()))
    for k, ev in models_res["evaluations"].items():
        print(f"  * {k.upper()}: Accuracy={ev['accuracy_pct']}%, F1={ev['f1_macro']}")

    print("\n--- 7. Testing POST /api/retrain ---")
    res = client.post("/api/retrain", json={"cv_folds": 5})
    assert res.status_code == 200, res.text
    retrain_res = res.json()
    assert retrain_res["status"] == "success"
    assert retrain_res["summary"]["best_model"]["key"] in models_res["evaluations"]
    print("Retraining OK. Best model:", retrain_res["summary"]["best_model"]["display_name"])

    print("\n--- 8. Testing GET /api/dataset ---")
    res = client.get("/api/dataset?limit=10&offset=0")
    assert res.status_code == 200, res.text
    ds_res = res.json()
    assert len(ds_res["records"]) == 10
    print("Dataset OK. Total records:", ds_res["total_records"])

    print("\n--- 9. Testing /api/history CRUD ---")
    hist_payload = {
        "case_title": "Verified Cloud Assessment Log",
        "category": "Cybersecurity",
        "features": test_case,
        "predicted_risk": ass_res["predicted_risk"],
        "risk_score": ass_res["risk_score"],
        "confidence": ass_res["confidence"],
        "selected_model": "SVM",
        "probabilities": ass_res["probabilities"],
        "top_factors": ass_res["contributing_factors"],
        "notes": "Verified during comprehensive integration test."
    }
    res = client.post("/api/history", json=hist_payload)
    assert res.status_code == 200, res.text
    rec_id = res.json()["id"]
    print(f"History Saved. ID: {rec_id}")

    res = client.get("/api/history")
    assert res.status_code == 200, res.text
    hist_list = res.json()
    assert any(h["id"] == rec_id for h in hist_list)
    print("History List verified. Count:", len(hist_list))

    res = client.delete(f"/api/history/{rec_id}")
    assert res.status_code == 200, res.text
    print("History Delete OK:", res.json())

    print("\n=================================================================")
    print("   ALL 9 FUNCTIONAL AREAS VERIFIED AND WORKING FLAWLESSLY!      ")
    print("=================================================================")

if __name__ == "__main__":
    test_all()
