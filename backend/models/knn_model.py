from sklearn.neighbors import KNeighborsClassifier
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from models.base_model import BaseRiskModel

class KNNRiskClassifier(BaseRiskModel):
    def __init__(self, n_neighbors: int = 5, metric: str = "euclidean", weights: str = "distance"):
        super().__init__(name=f"KNN (k={n_neighbors}, {metric}, {weights})")
        self.n_neighbors = n_neighbors
        self.metric = metric
        self.weights = weights
        self.model = KNeighborsClassifier(
            n_neighbors=n_neighbors,
            metric=metric,
            weights=weights,
            algorithm="auto",
            n_jobs=-1
        )
        self.classes_ = None
        self.X_train_ = None
        self.y_train_ = None
        self.raw_train_df_ = None

    def train(self, X: np.ndarray, y: np.ndarray, raw_df: pd.DataFrame = None) -> None:
        self.model.fit(X, y)
        self.classes_ = self.model.classes_
        self.X_train_ = X
        self.y_train_ = y
        self.raw_train_df_ = raw_df
        self.is_trained = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def get_params(self) -> Dict[str, Any]:
        return {
            "n_neighbors": self.n_neighbors,
            "metric": self.metric,
            "weights": self.weights
        }

    def get_similar_cases(self, X_sample: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves top-K most similar historical cases from training data.
        Returns Case_ID, Category, Similarity %, Known Risk Level, and Feature values.
        """
        if self.X_train_ is None or self.raw_train_df_ is None:
            return []
            
        k = min(k, len(self.X_train_))
        distances, indices = self.model.kneighbors(X_sample.reshape(1, -1), n_neighbors=k)
        
        similar_cases = []
        for dist, idx in zip(distances[0], indices[0]):
            row = self.raw_train_df_.iloc[idx]
            
            # Compute percentage similarity based on distance metric
            if self.metric == "cosine":
                similarity_pct = max(0.0, (1.0 - (dist / 2.0)) * 100.0)
            else:
                similarity_pct = max(0.0, (1.0 / (1.0 + float(dist))) * 100.0)
                
            similar_cases.append({
                "case_id": str(row.get("Case_ID", f"RC-{1000+idx}")),
                "category": str(row.get("Category", "General")),
                "severity": float(row.get("Severity", 0)),
                "likelihood": float(row.get("Likelihood", 0)),
                "impact": float(row.get("Impact", 0)),
                "exposure": float(row.get("Exposure", 0)),
                "control_effectiveness": float(row.get("Control_Effectiveness", 0)),
                "distance": round(float(dist), 4),
                "similarity_pct": round(similarity_pct, 1),
                "known_risk_level": str(row.get("Risk_Level", "Unknown"))
            })
            
        return similar_cases
