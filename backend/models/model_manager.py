import os
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
from sklearn.model_selection import train_test_split
import joblib

from config import DATASET_PATH, TRAIN_DATASET_PATH, TEST_DATASET_PATH, MODELS_CACHE_DIR, RANDOM_SEED, TARGET_CLASSES, RISK_CATEGORIES, NUMERIC_FEATURES
from preprocessing.pipeline import PreprocessingPipeline
from preprocessing.validation import validate_risk_input, ValidationError
from models.knn_model import KNNRiskClassifier
from models.svm_model import SVMRiskClassifier
from models.decision_tree_model import DecisionTreeRiskClassifier
from evaluation.metrics import calculate_metrics
from evaluation.cross_validator import perform_cross_validation
from explainability.reasoning import compute_calibrated_risk_score, extract_contributing_factors

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance.pipeline = None
            cls._instance.models = {}
            cls._instance.evaluations = {}
            cls._instance.cross_validations = {}
            cls._instance.best_model_name = None
            cls._instance.raw_df = None
            cls._instance.X_train = None
            cls._instance.X_test = None
            cls._instance.y_train = None
            cls._instance.y_test = None
            cls._instance.train_df = None
            cls._instance.is_initialized = False
        return cls._instance

    def initialize(self, dataset_path: str = DATASET_PATH, k_neighbors: int = 5, distance_metric: str = "euclidean", 
                   svm_kernel: str = "rbf", svm_c: float = 1.0, tree_criterion: str = "gini", tree_max_depth: int = 5,
                   imputation: str = "median", outlier_strategy: str = "cap", cv_folds: int = 5):
        """
        Loads dataset, runs full preprocessing, trains KNN, SVM, Decision Tree,
        performs K-Fold Cross Validation, evaluates all models and determines the best model.
        Supports dedicated train (20k) and test (20k) datasets when available.
        """
        if os.path.exists(TRAIN_DATASET_PATH) and os.path.exists(TEST_DATASET_PATH) and (dataset_path == DATASET_PATH or dataset_path == TRAIN_DATASET_PATH):
            self.train_df = pd.read_csv(TRAIN_DATASET_PATH)
            self.test_df = pd.read_csv(TEST_DATASET_PATH)
            self.raw_df = pd.concat([self.train_df, self.test_df], ignore_index=True)
        else:
            if not os.path.exists(dataset_path):
                raise FileNotFoundError(f"Dataset not found at {dataset_path}")
            self.raw_df = pd.read_csv(dataset_path)
            train_df, test_df = train_test_split(
                self.raw_df, 
                test_size=0.20, 
                random_state=RANDOM_SEED, 
                stratify=self.raw_df["Risk_Level"]
            )
            self.train_df = train_df.reset_index(drop=True)
            self.test_df = test_df.reset_index(drop=True)
            
        # 1. Initialize & Fit Preprocessing Pipeline
        self.pipeline = PreprocessingPipeline(
            imputation_strategy=imputation,
            outlier_strategy=outlier_strategy
        )
        
        # Fit pipeline on training data to prevent data leakage (NFR-04)
        self.pipeline.fit(self.train_df)
        self.X_train = self.pipeline.transform(self.train_df)
        self.y_train = np.asarray(self.train_df["Risk_Level"].values, dtype=str)
        
        self.X_test = self.pipeline.transform(self.test_df)
        self.y_test = np.asarray(self.test_df["Risk_Level"].values, dtype=str)
        
        # 2. Instantiate Models
        self.models = {
            "knn": KNNRiskClassifier(n_neighbors=k_neighbors, metric=distance_metric, weights="distance"),
            "svm": SVMRiskClassifier(kernel=svm_kernel, C=svm_c),
            "decision_tree": DecisionTreeRiskClassifier(criterion=tree_criterion, max_depth=tree_max_depth)
        }
        
        # 3. Train all models
        self.models["knn"].train(self.X_train, self.y_train, raw_df=self.train_df)
        self.models["svm"].train(self.X_train, self.y_train)
        self.models["decision_tree"].train(self.X_train, self.y_train, feature_names=self.pipeline.feature_names_out_)
        
        # 4. Evaluate on Test set
        self.evaluations = {}
        for key, model_obj in self.models.items():
            y_pred = model_obj.predict(self.X_test)
            self.evaluations[key] = calculate_metrics(self.y_test, y_pred)
            self.evaluations[key]["display_name"] = model_obj.name
            self.evaluations[key]["params"] = model_obj.get_params()
            
        # 5. K-Fold Cross Validation
        self.cross_validations = {}
        # KNN CV
        self.cross_validations["knn"] = perform_cross_validation(
            lambda: KNNRiskClassifier(n_neighbors=k_neighbors, metric=distance_metric, weights="distance").model,
            self.X_train, self.y_train, n_splits=cv_folds
        )
        # SVM CV
        self.cross_validations["svm"] = perform_cross_validation(
            lambda: SVMRiskClassifier(kernel=svm_kernel, C=svm_c).model,
            self.X_train, self.y_train, n_splits=cv_folds
        )
        # Decision Tree CV
        self.cross_validations["decision_tree"] = perform_cross_validation(
            lambda: DecisionTreeRiskClassifier(criterion=tree_criterion, max_depth=tree_max_depth).model,
            self.X_train, self.y_train, n_splits=cv_folds
        )
        
        # 6. Model Selection (FR-15: based on CV F1-macro score)
        best_key = max(self.cross_validations, key=lambda k: self.cross_validations[k]["mean_f1_macro"])
        self.best_model_name = best_key
        
        self.is_initialized = True
        print(f"Models successfully trained & cross-validated. Best model: {best_key.upper()} (CV F1-Macro: {self.cross_validations[best_key]['mean_f1_macro']})")
        return self.get_summary()

    def get_summary(self) -> Dict[str, Any]:
        """Returns overall system, dataset, and model performance overview."""
        if not self.is_initialized:
            self.initialize()
            
        class_counts = self.raw_df["Risk_Level"].value_counts().to_dict()
        category_counts = self.raw_df["Category"].value_counts().to_dict()
        
        return {
            "dataset_info": {
                "total_records": len(self.raw_df),
                "train_records": len(self.train_df),
                "test_records": len(self.test_df),
                "feature_count": len(NUMERIC_FEATURES) + 1,
                "class_distribution": class_counts,
                "category_distribution": category_counts,
                "missing_values_total": int(self.raw_df.isnull().sum().sum())
            },
            "best_model": {
                "key": self.best_model_name,
                "display_name": self.models[self.best_model_name].name,
                "cv_f1_macro": self.cross_validations[self.best_model_name]["mean_f1_macro"],
                "cv_accuracy": self.cross_validations[self.best_model_name]["mean_accuracy"],
                "test_accuracy": self.evaluations[self.best_model_name]["accuracy_pct"],
                "selection_reason": f"Highest Cross-Validation F1-Score ({self.cross_validations[self.best_model_name]['mean_f1_macro']:.3f} +/- {self.cross_validations[self.best_model_name]['std_f1_macro']:.3f})"
            },
            "model_comparisons": self.evaluations,
            "cross_validations": self.cross_validations
        }

    def assess_risk(self, case_input: Dict[str, Any], chosen_model: str = "auto") -> Dict[str, Any]:
        """
        End-to-End Primary Risk Assessment (FR-16, FR-17, FR-18, FR-20).
        """
        if not self.is_initialized:
            self.initialize()
            
        # 1. Validate Input
        is_valid, errors, cleaned_data = validate_risk_input(case_input)
        if not is_valid:
            raise ValidationError(errors)
            
        # 2. Transform input
        X_sample = self.pipeline.transform_single_case(cleaned_data)
        
        # 3. Determine active model
        active_model_key = self.best_model_name if chosen_model == "auto" or chosen_model not in self.models else chosen_model
        primary_model = self.models[active_model_key]
        
        # 4. Predict Risk Level & Probabilities
        prediction = primary_model.predict(X_sample)[0]
        proba_array = primary_model.predict_proba(X_sample)[0]
        
        # Build probability dictionary mapped to classes
        prob_dict = {}
        for cls_name, prob_val in zip(primary_model.classes_, proba_array):
            prob_dict[str(cls_name)] = round(float(prob_val), 4)
            
        # Ensure all standard classes have entries
        for c in TARGET_CLASSES:
            if c not in prob_dict:
                prob_dict[c] = 0.0
                
        confidence = float(np.max(proba_array))
        
        # 5. Compute Calibrated 0-100 Risk Score (FR-17)
        risk_score = compute_calibrated_risk_score(prob_dict)
        
        # 6. Multi-Model Predictions Comparison
        all_model_preds = {}
        for k, m in self.models.items():
            m_pred = m.predict(X_sample)[0]
            m_proba = m.predict_proba(X_sample)[0]
            m_prob_dict = {str(cls_): round(float(pv), 4) for cls_, pv in zip(m.classes_, m_proba)}
            m_score = compute_calibrated_risk_score(m_prob_dict)
            all_model_preds[k] = {
                "name": m.name,
                "prediction": str(m_pred),
                "confidence": round(float(np.max(m_proba)), 4),
                "risk_score": m_score,
                "probabilities": m_prob_dict
            }
            
        # 7. Similar Historical Cases (KNN Retrieval)
        similar_cases = self.models["knn"].get_similar_cases(X_sample[0], k=5)
        
        # 8. Decision Tree Path Explanation
        decision_path = self.models["decision_tree"].extract_decision_path(X_sample[0])
        
        # 9. Key Contributing Factors
        contributing_factors = extract_contributing_factors(cleaned_data, self.train_df)
        
        # 10. Feature Importances
        feature_importances = self.models["decision_tree"].get_feature_importances()
        
        return {
            "case_inputs": cleaned_data,
            "predicted_risk": str(prediction),
            "risk_score": risk_score,
            "confidence": round(confidence, 4),
            "confidence_pct": round(confidence * 100, 1),
            "probabilities": prob_dict,
            "selected_model": {
                "key": active_model_key,
                "display_name": primary_model.name,
                "f1_score": self.evaluations[active_model_key]["f1_macro"],
                "accuracy": self.evaluations[active_model_key]["accuracy_pct"],
                "is_auto_selected": (chosen_model == "auto")
            },
            "all_model_predictions": all_model_preds,
            "similar_cases": similar_cases,
            "decision_tree_path": decision_path,
            "contributing_factors": contributing_factors,
            "feature_importances": feature_importances[:6],
            "methodology_note": "Score is derived from calibrated probability distribution (P_Low*15 + P_Med*55 + P_High*95)."
        }
