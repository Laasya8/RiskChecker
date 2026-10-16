from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
import numpy as np

class BaseRiskModel(ABC):
    def __init__(self, name: str):
        self.name = name
        self.model = None
        self.is_trained = False
        
    @abstractmethod
    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        """Trains the underlying ML model."""
        pass
        
    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predicts risk class ('Low', 'Medium', 'High')."""
        pass
        
    @abstractmethod
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Returns probability distribution across classes."""
        pass
        
    @abstractmethod
    def get_params(self) -> Dict[str, Any]:
        """Returns hyperparameter configuration."""
        pass
