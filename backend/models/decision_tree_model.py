from sklearn.tree import DecisionTreeClassifier, _tree
import numpy as np
from typing import Dict, Any, List
from models.base_model import BaseRiskModel
from config import RANDOM_SEED

class DecisionTreeRiskClassifier(BaseRiskModel):
    def __init__(self, criterion: str = "gini", max_depth: int = 5, min_samples_split: int = 4):
        super().__init__(name=f"Decision Tree ({criterion.capitalize()}, Depth={max_depth})")
        self.criterion = criterion
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.model = DecisionTreeClassifier(
            criterion=criterion,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            class_weight="balanced",
            random_state=RANDOM_SEED
        )
        self.classes_ = None
        self.feature_names_ = None

    def train(self, X: np.ndarray, y: np.ndarray, feature_names: List[str] = None) -> None:
        self.model.fit(X, y)
        self.classes_ = self.model.classes_
        self.feature_names_ = feature_names or [f"Feature_{i}" for i in range(X.shape[1])]
        self.is_trained = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def get_params(self) -> Dict[str, Any]:
        return {
            "criterion": self.criterion,
            "max_depth": int(self.max_depth),
            "min_samples_split": int(self.min_samples_split)
        }

    def get_feature_importances(self) -> List[Dict[str, Any]]:
        """Returns sorted list of feature importances with percentage contributions."""
        if not self.is_trained:
            return []
        importances = self.model.feature_importances_
        sorted_indices = np.argsort(importances)[::-1]
        
        results = []
        for idx in sorted_indices:
            feat_name = self.feature_names_[idx] if idx < len(self.feature_names_) else f"Feature_{idx}"
            results.append({
                "feature": str(feat_name),
                "importance": round(float(importances[idx]), 4),
                "importance_pct": round(float(importances[idx] * 100), 2)
            })
        return results

    def extract_decision_path(self, X_sample: np.ndarray) -> Dict[str, Any]:
        """
        Extracts step-by-step decision rules traversed by the decision tree for a single input case.
        Converts all scalar types to standard native python types for JSON serialization.
        """
        if not self.is_trained:
            return {"steps": [], "final_class": "Unknown"}

        tree_ = self.model.tree_
        feature_name = [
            self.feature_names_[i] if i != _tree.TREE_UNDEFINED else "undefined!"
            for i in tree_.feature
        ]
        
        sample = X_sample.reshape(1, -1)
        node_indicator = self.model.decision_path(sample)
        node_index = node_indicator.indices[node_indicator.indptr[0]:node_indicator.indptr[1]]
        
        steps = []
        for node_id in node_index:
            # Check if leaf node
            if tree_.feature[node_id] == _tree.TREE_UNDEFINED:
                value = tree_.value[node_id][0]
                pred_idx = np.argmax(value)
                leaf_class = self.classes_[pred_idx]
                steps.append({
                    "node_id": int(node_id),
                    "type": "leaf",
                    "prediction": str(leaf_class),
                    "class_distribution": {str(c): int(v) for c, v in zip(self.classes_, value)},
                    "description": f"Terminal Node Reached -> Classified as {leaf_class.upper()} RISK"
                })
            else:
                feat = feature_name[node_id]
                threshold = float(tree_.threshold[node_id])
                feat_val = float(sample[0, tree_.feature[node_id]])
                is_less = bool(feat_val <= threshold)
                operator = "<=" if is_less else ">"
                
                steps.append({
                    "node_id": int(node_id),
                    "type": "decision",
                    "feature": str(feat),
                    "threshold": round(threshold, 3),
                    "sample_value": round(feat_val, 3),
                    "decision": f"{feat} {operator} {round(threshold, 2)}",
                    "passed": is_less,
                    "description": f"Condition: {feat} ({round(feat_val, 2)}) {operator} {round(threshold, 2)} -> {'YES' if is_less else 'NO'} branch taken"
                })
                
        return {
            "steps": steps,
            "final_class": steps[-1].get("prediction", "Unknown") if steps else "Unknown"
        }

    def export_tree_structure(self) -> Dict[str, Any]:
        """Exports tree hierarchy for visualization."""
        if not self.is_trained:
            return {}
            
        tree_ = self.model.tree_
        
        def recurse(node_id, depth=0):
            if tree_.feature[node_id] != _tree.TREE_UNDEFINED and (self.max_depth is None or depth < self.max_depth):
                feat_name = self.feature_names_[tree_.feature[node_id]]
                threshold = round(float(tree_.threshold[node_id]), 2)
                return {
                    "name": f"{feat_name} <= {threshold}",
                    "feature": str(feat_name),
                    "threshold": float(threshold),
                    "samples": int(tree_.n_node_samples[node_id]),
                    "children": [
                        recurse(tree_.children_left[node_id], depth + 1),
                        recurse(tree_.children_right[node_id], depth + 1)
                    ]
                }
            else:
                value = tree_.value[node_id][0]
                pred_idx = np.argmax(value)
                leaf_class = self.classes_[pred_idx]
                return {
                    "name": f"Risk: {leaf_class}",
                    "leaf": True,
                    "class": str(leaf_class),
                    "samples": int(tree_.n_node_samples[node_id]),
                    "distribution": {str(c): int(v) for c, v in zip(self.classes_, value)}
                }
                
        return recurse(0)
