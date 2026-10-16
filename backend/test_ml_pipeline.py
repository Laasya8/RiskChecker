import os
import sys
import unittest

import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import StratifiedGroupKFold

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import NUMERIC_FEATURES, RISK_CATEGORIES, TARGET_CLASSES
from evaluation.cross_validator import perform_cross_validation
from evaluation.metrics import calculate_metrics
from models.model_manager import ModelManager
from preprocessing.pipeline import PreprocessingPipeline


class MLPipelineTests(unittest.TestCase):
    def test_data_splits_have_consistent_schema_and_disjoint_ids(self):
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        train = pd.read_csv(os.path.join(data_dir, "train_risk_dataset.csv"))
        test = pd.read_csv(os.path.join(data_dir, "test_risk_dataset.csv"))

        self.assertEqual(list(train.columns), list(test.columns))
        self.assertTrue(set(TARGET_CLASSES).issuperset(train["Risk_Level"].unique()))
        self.assertEqual(set(train["Case_ID"]) & set(test["Case_ID"]), set())
        self.assertNotIn("Case_ID", NUMERIC_FEATURES)

    def test_preprocessing_excludes_identifiers_and_transforms_real_rows(self):
        data_path = os.path.join(
            os.path.dirname(__file__), "data", "train_risk_dataset.csv"
        )
        sample = pd.read_csv(data_path).head(80)
        pipeline = PreprocessingPipeline().fit(sample)
        transformed = pipeline.transform(sample)

        self.assertEqual(transformed.shape[0], len(sample))
        self.assertNotIn("Case_ID", pipeline.feature_names_out_)
        self.assertEqual(transformed.shape[1], len(pipeline.feature_names_out_))
        self.assertTrue(set(RISK_CATEGORIES).issuperset(sample["Category"].unique()))

    def test_cross_validation_fits_preprocessing_within_each_fold(self):
        features = pd.DataFrame(
            {
                "measurement": np.arange(30, dtype=float),
                "group": ["a", "b"] * 15,
            }
        )
        labels = np.array(["Low", "Medium", "High"] * 10)
        groups = np.repeat(np.arange(15), 2)
        fitted_sizes = []

        class RecordingPreprocessor:
            def fit(self, frame):
                fitted_sizes.append(len(frame))
                self.mean = frame["measurement"].mean()
                return self

            def transform(self, frame):
                return np.column_stack(
                    [frame["measurement"].to_numpy() - self.mean]
                )

        result = perform_cross_validation(
            lambda: DecisionTreeClassifier(max_depth=2, random_state=42),
            features,
            labels,
            n_splits=3,
            preprocessing_factory=RecordingPreprocessor,
            groups=groups,
        )

        self.assertEqual(len(fitted_sizes), 3)
        self.assertTrue(all(size < len(features) for size in fitted_sizes))
        self.assertIn("mean_roc_auc_ovr_macro", result)
        self.assertIn("mean_f1_macro", result)
        splitter = StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=42)
        for train_indices, validation_indices in splitter.split(features, labels, groups):
            self.assertFalse(
                set(groups[train_indices]) & set(groups[validation_indices])
            )

    def test_test_metrics_exclude_repeated_training_features(self):
        feature_columns = ["Category", "Severity"]
        train = pd.DataFrame(
            {
                "Category": ["Cybersecurity", "Financial"],
                "Severity": [8.0, 4.0],
                "Case_ID": ["train-1", "train-2"],
                "Risk_Level": ["High", "Medium"],
            }
        )
        test = pd.DataFrame(
            {
                "Category": ["Cybersecurity", "Cybersecurity", "Safety", "Safety"],
                "Severity": [8.0, 8.0, 6.0, 6.0],
                "Case_ID": ["test-1", "test-2", "test-3", "test-4"],
                "Risk_Level": ["High", "High", "Medium", "Medium"],
            }
        )

        unseen = ModelManager._select_unseen_test_rows(train, test, feature_columns)

        self.assertEqual(unseen["Case_ID"].tolist(), ["test-3"])

    def test_classification_metrics_include_multiclass_roc_auc(self):
        actual = np.array(["Low", "Medium", "High", "Low", "Medium", "High"])
        predicted = actual.copy()
        scores = np.array(
            [
                [0.9, 0.05, 0.05],
                [0.05, 0.9, 0.05],
                [0.05, 0.05, 0.9],
                [0.8, 0.1, 0.1],
                [0.1, 0.8, 0.1],
                [0.1, 0.1, 0.8],
            ]
        )
        metrics = calculate_metrics(
            actual,
            predicted,
            y_score=scores,
            score_labels=["Low", "Medium", "High"],
        )

        self.assertEqual(metrics["accuracy"], 1.0)
        self.assertEqual(metrics["roc_auc_ovr_macro"], 1.0)


if __name__ == "__main__":
    unittest.main()
