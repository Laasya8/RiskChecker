import warnings
from sklearn.svm import SVC
import numpy as np
from typing import Dict, Any
from models.base_model import BaseRiskModel
from config import RANDOM_SEED

class SVMRiskClassifier(BaseRiskModel):
    def __init__(self, kernel: str = "rbf", C: float = 1.0, gamma: str = "scale", degree: int = 3):
        super().__init__(name=f"SVM ({kernel.upper()} Kernel, C={C})")
        self.kernel = kernel
        self.C = C
        self.gamma = gamma
        self.degree = degree
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.model = SVC(
                kernel=kernel,
                C=C,
                gamma=gamma,
                degree=degree,
                probability=True,
                class_weight="balanced",
                cache_size=1000,
                tol=1e-3,
                random_state=RANDOM_SEED
            )
        self.classes_ = None

    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        X_arr = np.asarray(X)
        y_arr = np.asarray(y, dtype=str)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.model.fit(X_arr, y_arr)
        self.classes_ = self.model.classes_
        self.is_trained = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        X_arr = np.asarray(X)
        return self.model.predict(X_arr)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        X_arr = np.asarray(X)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return self.model.predict_proba(X_arr)

    def get_params(self) -> Dict[str, Any]:
        return {
            "kernel": self.kernel,
            "C": self.C,
            "gamma": self.gamma,
            "degree": self.degree,
            "probability": True
        }

    def generate_decision_boundary_2d(self, X_train: np.ndarray, y_train: np.ndarray, feat1_idx: int = 0, feat2_idx: int = 1, grid_res: int = 40):
        """
        Generates 2D decision boundary grid data for interactive visualization.
        """
        if not self.is_trained or X_train.shape[1] < 2:
            return None
            
        f1_min, f1_max = X_train[:, feat1_idx].min() - 0.5, X_train[:, feat1_idx].max() + 0.5
        f2_min, f2_max = X_train[:, feat2_idx].min() - 0.5, X_train[:, feat2_idx].max() + 0.5
        
        xx, yy = np.meshgrid(np.linspace(f1_min, f1_max, grid_res), np.linspace(f2_min, f2_max, grid_res))
        
        means = np.mean(X_train, axis=0)
        grid_points = np.tile(means, (xx.ravel().shape[0], 1))
        grid_points[:, feat1_idx] = xx.ravel()
        grid_points[:, feat2_idx] = yy.ravel()
        
        preds = self.model.predict(grid_points)
        class_map = {"Low": 0, "Medium": 1, "High": 2}
        z = np.array([class_map.get(p, 0) for p in preds]).reshape(xx.shape)
        
        return {
            "x": xx[0, :].tolist(),
            "y": yy[:, 0].tolist(),
            "z": z.tolist(),
            "classes": ["Low", "Medium", "High"]
        }
