from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report, roc_auc_score
import numpy as np
from typing import Dict, Any, List, Optional
from config import TARGET_CLASSES

def calculate_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    classes: List[str] = TARGET_CLASSES,
    y_score: Optional[np.ndarray] = None,
    score_labels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Computes comprehensive multi-class evaluation metrics (FR-12).
    Accuracy, precision, recall, F1 (macro and weighted), confusion matrix, and optional multiclass ROC-AUC.
    """
    acc = accuracy_score(y_true, y_pred)
    
    prec_macro = precision_score(y_true, y_pred, average="macro", zero_division=0)
    rec_macro = recall_score(y_true, y_pred, average="macro", zero_division=0)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    
    prec_weighted = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    rec_weighted = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    
    # Class-level breakdown
    report = classification_report(y_true, y_pred, labels=classes, output_dict=True, zero_division=0)
    class_metrics = {}
    for cls_name in classes:
        if cls_name in report:
            class_metrics[cls_name] = {
                "precision": round(float(report[cls_name]["precision"]), 3),
                "recall": round(float(report[cls_name]["recall"]), 3),
                "f1": round(float(report[cls_name]["f1-score"]), 3),
                "support": int(report[cls_name]["support"])
            }
            
    result = {
        "accuracy": round(float(acc), 4),
        "accuracy_pct": round(float(acc * 100), 2),
        "precision_macro": round(float(prec_macro), 4),
        "recall_macro": round(float(rec_macro), 4),
        "f1_macro": round(float(f1_macro), 4),
        "precision_weighted": round(float(prec_weighted), 4),
        "recall_weighted": round(float(rec_weighted), 4),
        "f1_weighted": round(float(f1_weighted), 4),
        "confusion_matrix": cm.tolist(),
        "classes": classes,
        "class_metrics": class_metrics
    }
    if y_score is not None and score_labels is not None and len(np.unique(y_true)) > 2:
        ordered_labels = np.unique(y_true)
        score_positions = [list(score_labels).index(label) for label in ordered_labels]
        result["roc_auc_ovr_macro"] = round(
            float(
                roc_auc_score(
                    y_true,
                    y_score[:, score_positions],
                    labels=ordered_labels,
                    multi_class="ovr",
                    average="macro",
                )
            ),
            4,
        )
    return result
