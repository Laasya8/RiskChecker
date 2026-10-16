import numpy as np
import pandas as pd
from typing import Tuple, List, Dict
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
import joblib
import os
from config import NUMERIC_FEATURES, RISK_CATEGORIES, TARGET_CLASSES, MODELS_CACHE_DIR

class PreprocessingPipeline:
    def __init__(self, imputation_strategy="median", outlier_strategy="cap", scale_method="standard"):
        """
        Configurable Preprocessing Pipeline supporting:
        - Missing-value imputation: 'mean', 'median', 'mode' (FR-06)
        - Categorical encoding: One-Hot Encoding
        - Feature scaling: StandardScaler
        - Outlier handling: 'retain', 'cap' (IQR winsorization), 'remove'
        """
        self.imputation_strategy = imputation_strategy
        self.outlier_strategy = outlier_strategy
        self.scale_method = scale_method
        
        self.numeric_cols = list(NUMERIC_FEATURES.keys())
        self.cat_cols = ["Category"]
        self.target_col = "Risk_Level"
        
        # Transformers
        self.num_imputer = SimpleImputer(strategy=imputation_strategy)
        self.cat_imputer = SimpleImputer(strategy="most_frequent")
        self.encoder = OneHotEncoder(categories=[RISK_CATEGORIES], sparse_output=False, handle_unknown="ignore")
        self.scaler = StandardScaler()
        
        # Outlier bounds (computed during fit)
        self.outlier_bounds = {}
        self.feature_names_out_ = []
        self.is_fitted = False
        
    def _compute_outlier_bounds(self, df_num: pd.DataFrame):
        bounds = {}
        for col in self.numeric_cols:
            q25 = df_num[col].quantile(0.25)
            q75 = df_num[col].quantile(0.75)
            iqr = q75 - q25
            lower = max(NUMERIC_FEATURES[col]["min"], q25 - 1.5 * iqr)
            upper = min(NUMERIC_FEATURES[col]["max"], q75 + 1.5 * iqr)
            bounds[col] = {"lower": round(lower, 2), "upper": round(upper, 2), "q25": round(q25, 2), "q75": round(q75, 2), "iqr": round(iqr, 2)}
        return bounds

    def _handle_outliers(self, df_num: pd.DataFrame, is_training: bool = False):
        df_out = df_num.copy()
        if self.outlier_strategy == "cap":
            for col in self.numeric_cols:
                if col in self.outlier_bounds:
                    lower = self.outlier_bounds[col]["lower"]
                    upper = self.outlier_bounds[col]["upper"]
                    df_out[col] = df_out[col].clip(lower=lower, upper=upper)
        elif self.outlier_strategy == "remove" and is_training:
            # Mask records with severe outliers
            mask = pd.Series(True, index=df_out.index)
            for col in self.numeric_cols:
                lower = self.outlier_bounds[col]["lower"]
                upper = self.outlier_bounds[col]["upper"]
                mask = mask & (df_out[col] >= lower) & (df_out[col] <= upper)
            return df_out[mask], mask
        return df_out, None

    def fit(self, df: pd.DataFrame):
        df_clean = df.copy()
        
        # 1. Fit Imputers
        df_num = pd.DataFrame(self.num_imputer.fit_transform(df_clean[self.numeric_cols]), columns=self.numeric_cols)
        df_cat = pd.DataFrame(self.cat_imputer.fit_transform(df_clean[self.cat_cols]), columns=self.cat_cols)
        
        # 2. Outlier bounds
        self.outlier_bounds = self._compute_outlier_bounds(df_num)
        df_num_out, _ = self._handle_outliers(df_num, is_training=True)
        
        # 3. Fit Encoder & Scaler
        self.encoder.fit(df_cat)
        self.scaler.fit(df_num_out)
        
        cat_encoded_cols = [f"Category_{c}" for c in self.encoder.categories_[0]]
        self.feature_names_out_ = self.numeric_cols + cat_encoded_cols
        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("Pipeline must be fitted before transforming.")
        
        df_clean = df.copy()
        
        # Impute
        num_imputed = self.num_imputer.transform(df_clean[self.numeric_cols])
        df_num = pd.DataFrame(num_imputed, columns=self.numeric_cols)
        
        cat_imputed = self.cat_imputer.transform(df_clean[self.cat_cols])
        df_cat = pd.DataFrame(cat_imputed, columns=self.cat_cols)
        
        # Outlier handling
        df_num_capped, _ = self._handle_outliers(df_num, is_training=False)
        
        # Scaling & Encoding
        scaled_num = self.scaler.transform(df_num_capped)
        encoded_cat = self.encoder.transform(df_cat)
        
        # Concatenate features
        X_trans = np.hstack([scaled_num, encoded_cat])
        return X_trans

    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
        self.fit(df)
        X_trans = self.transform(df)
        y = df[self.target_col].values if self.target_col in df.columns else None
        return X_trans, y, df

    def transform_single_case(self, case_dict: dict) -> np.ndarray:
        df_single = pd.DataFrame([case_dict])
        return self.transform(df_single)

    def save(self, filepath=os.path.join(MODELS_CACHE_DIR, "preprocessing_pipeline.joblib")):
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath=os.path.join(MODELS_CACHE_DIR, "preprocessing_pipeline.joblib")):
        if os.path.exists(filepath):
            return joblib.load(filepath)
        return None
