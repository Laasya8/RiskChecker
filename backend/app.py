from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import os
import io
import pandas as pd
import numpy as np
import json

from config import NUMERIC_FEATURES, RISK_CATEGORIES, TARGET_CLASSES, SCORE_WEIGHTS, DATASET_PATH
from database import init_db, save_assessment, get_assessment_history, delete_assessment, clear_all_history
from models.model_manager import ModelManager
from preprocessing.validation import validate_risk_input, ValidationError
from explainability.what_if import run_what_if_comparison

# Initialize FastAPI application
app = FastAPI(
    title="Intelligent Decision Support System for Risk Assessment",
    description="Machine Learning Decision Support System (MDS Project) featuring KNN, SVM, and Decision Tree classifiers with Explainability, What-If Analysis, and Cross-Validation.",
    version="2.0.0"
)

# CORS middleware for seamless frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database & ML pipeline on startup
manager = ModelManager()

@app.on_event("startup")
def startup_event():
    init_db()
    try:
        manager.initialize()
        print("ML Pipeline initialized and models trained successfully.")
    except Exception as e:
        print(f"Warning during ML initialization: {e}")

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message=".*Field.*deprecated.*")

# Pydantic Schemas
class RiskCaseInput(BaseModel):
    case_title: Optional[str] = "Risk Assessment Case"
    Category: str = Field(..., json_schema_extra={"example": "Financial"})
    Severity: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 7.5})
    Likelihood: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 6.0})
    Exposure: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 7.0})
    Frequency: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 4.0})
    Duration: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 5.0})
    Impact: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 7.0})
    Historical_Occurrence: float = Field(..., ge=0.0, le=10.0, json_schema_extra={"example": 2.0})
    Control_Effectiveness: float = Field(..., ge=1.0, le=10.0, json_schema_extra={"example": 4.5})
    chosen_model: Optional[str] = "auto"

class WhatIfRequest(BaseModel):
    original_inputs: Dict[str, Any]
    modified_inputs: Dict[str, Any]
    chosen_model: Optional[str] = "auto"

class RetrainRequest(BaseModel):
    k_neighbors: int = 5
    distance_metric: str = "euclidean"
    svm_kernel: str = "rbf"
    svm_c: float = 1.0
    tree_criterion: str = "gini"
    tree_max_depth: int = 5
    imputation: str = "median"
    outlier_strategy: str = "cap"
    cv_folds: int = 5

class SaveHistoryRequest(BaseModel):
    case_title: Optional[str] = "Risk Assessment Case"
    category: str
    features: Dict[str, Any]
    predicted_risk: str
    risk_score: float
    confidence: float
    selected_model: str
    probabilities: Optional[Dict[str, float]] = {}
    top_factors: Optional[List[Dict[str, Any]]] = []
    notes: Optional[str] = ""

# API Endpoints
@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "Risk Assessment ML Engine", "is_initialized": manager.is_initialized}

@app.get("/api/config")
def get_system_config():
    """Returns feature metadata, definitions, categories, and ranges (FR-02, FR-05)."""
    return {
        "categories": RISK_CATEGORIES,
        "numeric_features": NUMERIC_FEATURES,
        "target_classes": TARGET_CLASSES,
        "score_weights": SCORE_WEIGHTS,
        "default_case": {
            "case_title": "Critical Cloud Database Outage",
            "Category": "Cybersecurity",
            "Severity": 8,
            "Likelihood": 7,
            "Exposure": 8,
            "Frequency": 3,
            "Duration": 6,
            "Impact": 8,
            "Historical_Occurrence": 3,
            "Control_Effectiveness": 4
        },
        "presets": [
            {
                "title": "Data Breach & Ransomware Incident",
                "Category": "Cybersecurity",
                "Severity": 9,
                "Likelihood": 8,
                "Exposure": 9,
                "Frequency": 4,
                "Duration": 8,
                "Impact": 9,
                "Historical_Occurrence": 3,
                "Control_Effectiveness": 3
            },
            {
                "title": "Critical Component Supply Delay",
                "Category": "Operational",
                "Severity": 5,
                "Likelihood": 6,
                "Exposure": 6,
                "Frequency": 4,
                "Duration": 5,
                "Impact": 5,
                "Historical_Occurrence": 2,
                "Control_Effectiveness": 6
            },
            {
                "title": "Annual Regulatory Audit Review",
                "Category": "Business",
                "Severity": 2,
                "Likelihood": 3,
                "Exposure": 3,
                "Frequency": 1,
                "Duration": 2,
                "Impact": 2,
                "Historical_Occurrence": 0,
                "Control_Effectiveness": 9
            },
            {
                "title": "Market Currency Exchange Fluctuation",
                "Category": "Financial",
                "Severity": 7,
                "Likelihood": 7,
                "Exposure": 8,
                "Frequency": 7,
                "Duration": 4,
                "Impact": 7,
                "Historical_Occurrence": 5,
                "Control_Effectiveness": 5
            }
        ]
    }

@app.get("/api/summary")
def get_summary():
    """System overview, dataset summary, and current model rankings (FR-21)."""
    return manager.get_summary()

def sanitize_json_obj(obj):
    """Recursively converts any numpy or custom types into standard python types for JSON serialization."""
    if isinstance(obj, dict):
        return {str(k): sanitize_json_obj(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_json_obj(x) for x in obj]
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

@app.post("/api/assess")
def assess_risk(payload: RiskCaseInput):
    """Primary risk assessment endpoint producing classification, score, explanation, and similar cases (FR-16)."""
    try:
        input_dict = payload.model_dump()
        chosen_model = input_dict.pop("chosen_model", "auto")
        case_title = input_dict.pop("case_title", "Risk Assessment Case")
        
        result = manager.assess_risk(input_dict, chosen_model=chosen_model)
        result["case_title"] = str(case_title)
        return sanitize_json_obj(result)
    except ValidationError as ve:
        raise HTTPException(status_code=422, detail={"errors": ve.errors})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/api/what-if")
def what_if_analysis(payload: WhatIfRequest):
    """Interactive What-If feature perturbation simulation (FR-19)."""
    try:
        orig_res = manager.assess_risk(payload.original_inputs, chosen_model=payload.chosen_model)
        mod_res = manager.assess_risk(payload.modified_inputs, chosen_model=payload.chosen_model)
        
        comparison = run_what_if_comparison(orig_res, mod_res, payload.original_inputs, payload.modified_inputs)
        return sanitize_json_obj({
            "comparison": comparison,
            "original_result": orig_res,
            "modified_result": mod_res
        })
    except ValidationError as ve:
        raise HTTPException(status_code=422, detail={"errors": ve.errors})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.get("/api/models")
def get_model_details():
    """Detailed model analysis, cross-validation metrics, confusion matrices, and decision tree structures (FR-12, FR-13)."""
    if not manager.is_initialized:
        manager.initialize()
        
    tree_struct = manager.models["decision_tree"].export_tree_structure()
    importances = manager.models["decision_tree"].get_feature_importances()
    
    return {
        "best_model_name": manager.best_model_name,
        "evaluations": manager.evaluations,
        "cross_validations": manager.cross_validations,
        "decision_tree_structure": tree_struct,
        "feature_importances": importances
    }

@app.post("/api/retrain")
def retrain_models(config: RetrainRequest):
    """Retrain pipeline with custom hyperparameters."""
    try:
        summary = manager.initialize(
            k_neighbors=config.k_neighbors,
            distance_metric=config.distance_metric,
            svm_kernel=config.svm_kernel,
            svm_c=config.svm_c,
            tree_criterion=config.tree_criterion,
            tree_max_depth=config.tree_max_depth,
            imputation=config.imputation,
            outlier_strategy=config.outlier_strategy,
            cv_folds=config.cv_folds
        )
        return {"status": "success", "message": "Models successfully retrained", "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

@app.get("/api/dataset")
def get_dataset_details(limit: int = 50, offset: int = 0, split: str = "combined"):
    """Returns dataset summary, missing value stats, outlier counts, and paginated records for train, test, or combined sets (FR-07)."""
    if not manager.is_initialized:
        manager.initialize()
        
    if split == "train" and manager.train_df is not None:
        df = manager.train_df
    elif split == "test" and manager.test_df is not None:
        df = manager.test_df
    else:
        df = manager.raw_df
        
    num_cols = list(NUMERIC_FEATURES.keys())
    
    # Missing value info
    missing_info = df.isnull().sum().to_dict()
    
    # Summary statistics for numeric features
    stats = {}
    for col in num_cols:
        col_series = df[col]
        q25 = float(col_series.quantile(0.25))
        q75 = float(col_series.quantile(0.75))
        iqr = q75 - q25
        lower = max(NUMERIC_FEATURES[col]["min"], q25 - 1.5 * iqr)
        upper = min(NUMERIC_FEATURES[col]["max"], q75 + 1.5 * iqr)
        outlier_count = int(((col_series < lower) | (col_series > upper)).sum())
        
        stats[col] = {
            "mean": round(float(col_series.mean()), 2),
            "std": round(float(col_series.std()), 2),
            "min": round(float(col_series.min()), 2),
            "q25": round(q25, 2),
            "median": round(float(col_series.median()), 2),
            "q75": round(q75, 2),
            "max": round(float(col_series.max()), 2),
            "outliers_detected": outlier_count
        }
        
    # Correlation Matrix
    corr_matrix = df[num_cols].corr().round(3).to_dict()
    
    # Paginated records
    paged_records = df.iloc[offset:offset+limit].to_dict(orient="records")
    
    return {
        "split": split,
        "total_records": len(df),
        "train_records_count": len(manager.train_df) if manager.train_df is not None else 0,
        "test_records_count": len(manager.test_df) if manager.test_df is not None else 0,
        "limit": limit,
        "offset": offset,
        "columns": df.columns.tolist(),
        "missing_values": missing_info,
        "class_distribution": df["Risk_Level"].value_counts().to_dict(),
        "category_distribution": df["Category"].value_counts().to_dict(),
        "numeric_stats": stats,
        "correlation_matrix": corr_matrix,
        "records": paged_records
    }

@app.get("/api/decision-boundary")
def get_decision_boundary(feat1: str = "Severity", feat2: str = "Impact"):
    """Generates 2D decision boundary data from SVM for visual plotting."""
    if not manager.is_initialized:
        manager.initialize()
        
    try:
        feat_names = list(NUMERIC_FEATURES.keys())
        idx1 = feat_names.index(feat1) if feat1 in feat_names else 0
        idx2 = feat_names.index(feat2) if feat2 in feat_names else 5
        
        boundary = manager.models["svm"].generate_decision_boundary_2d(
            manager.X_train, manager.y_train, feat1_idx=idx1, feat2_idx=idx2
        )
        return {"feat1": feat1, "feat2": feat2, "boundary": boundary}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/history")
def get_history(limit: int = 100):
    return get_assessment_history(limit=limit)

@app.post("/api/history")
def save_history_record(payload: SaveHistoryRequest):
    inserted_id = save_assessment(payload.model_dump())
    return {"status": "success", "id": inserted_id}

@app.delete("/api/history/{record_id}")
def delete_history_record(record_id: int):
    success = delete_assessment(record_id)
    return {"status": "success" if success else "not_found"}

@app.delete("/api/history")
def clear_history():
    clear_all_history()
    return {"status": "success", "message": "History cleared"}

# Serve Unified React Frontend (Single-Service Deployment)
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))

if os.path.exists(FRONTEND_DIST):
    assets_folder = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_folder):
        app.mount("/assets", StaticFiles(directory=assets_folder), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Do not capture API routes or OpenAPI documentation
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        requested_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
            
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        raise HTTPException(status_code=404, detail="Frontend index.html not found. Run 'npm run build' in frontend/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f"Starting Unified Risk DSS Server on http://{host}:{port}")
    uvicorn.run("app:app", host=host, port=port, reload=True)
