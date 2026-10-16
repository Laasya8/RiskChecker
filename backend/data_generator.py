import numpy as np
import pandas as pd
import os
from config import DATASET_PATH, RISK_CATEGORIES, RANDOM_SEED

def generate_risk_dataset(n_samples=10010, output_path=DATASET_PATH, seed=RANDOM_SEED):
    """
    Generates a realistic, dense, multi-domain risk assessment dataset with 10,000+ records.
    Designed to solve:
      1. Class Imbalance: Ensures balanced, calibrated Low / Medium / High representation (~33.3% each).
      2. Sparsity: Densely populates all 8 industrial risk categories and 8 risk dimensions with realistic covariance.
      3. High ML Model Efficiency: Smooth decision boundaries for SVM, KNN, and Decision Trees.
    
    Features:
      - Case_ID: Unique identifier (e.g. RC-10001)
      - Category: Financial, Operational, Cybersecurity, Environmental, Business, Safety, Project, Infrastructure
      - Severity: 1.0 - 10.0
      - Likelihood: 1.0 - 10.0
      - Exposure: 1.0 - 10.0
      - Frequency: 1.0 - 10.0
      - Duration: 1.0 - 10.0
      - Impact: 1.0 - 10.0
      - Historical_Occurrence: 0.0 - 10.0
      - Control_Effectiveness: 1.0 - 10.0
      - Risk_Level: Low, Medium, High
    """
    np.random.seed(seed)
    
    # 1. Uniform category distribution to avoid category sparsity
    n_per_cat = n_samples // len(RISK_CATEGORIES)
    remainder = n_samples % len(RISK_CATEGORIES)
    categories = []
    for cat in RISK_CATEGORIES:
        categories.extend([cat] * n_per_cat)
    if remainder > 0:
        categories.extend(np.random.choice(RISK_CATEGORIES, size=remainder))
    np.random.shuffle(categories)
    
    cat_risk_bias = {
        "Financial": 0.10,
        "Cybersecurity": 0.20,
        "Operational": 0.05,
        "Environmental": -0.08,
        "Business": 0.08,
        "Safety": 0.18,
        "Project": -0.05,
        "Infrastructure": 0.12
    }
    
    data = []
    composite_scores = []
    raw_entries = []
    
    for i in range(n_samples):
        cat = categories[i]
        bias = cat_risk_bias.get(cat, 0.0)
        
        # Latent continuous risk spectrum
        latent_risk = np.random.beta(2.2, 2.2) + bias * 0.12
        latent_risk = np.clip(latent_risk, 0.02, 0.98)
        
        # Dense continuous feature generation with realistic covariance
        sev = np.clip(np.round(latent_risk * 7.5 + np.random.normal(1.4, 0.9), 1), 1.0, 10.0)
        like = np.clip(np.round(latent_risk * 7.5 + np.random.normal(1.4, 0.9), 1), 1.0, 10.0)
        expo = np.clip(np.round(latent_risk * 7.0 + np.random.normal(1.6, 1.0), 1), 1.0, 10.0)
        freq = np.clip(np.round(latent_risk * 6.5 + np.random.normal(1.8, 1.1), 1), 1.0, 10.0)
        dur = np.clip(np.round(latent_risk * 6.0 + np.random.normal(2.0, 1.2), 1), 1.0, 10.0)
        imp = np.clip(np.round(0.40 * sev + 0.35 * like + 0.25 * expo + np.random.normal(0, 0.6), 1), 1.0, 10.0)
        
        # Historical occurrence (0-10 count)
        hist = np.clip(np.round(latent_risk * 7.0 + np.random.normal(0.6, 1.2)), 0.0, 10.0)
        
        # Control effectiveness (higher control mitigates composite risk)
        ctrl = np.clip(np.round((1.0 - latent_risk) * 7.8 + np.random.normal(1.5, 1.0), 1), 1.0, 10.0)
        
        # Multi-factor composite risk formula
        composite_metric = (
            (sev * like * 0.28) + 
            (imp * expo * 0.26) + 
            (freq * dur * 0.12) + 
            (hist * 1.4) - 
            (ctrl * 2.3) +
            np.random.normal(0, 1.5)
        )
        
        composite_scores.append(composite_metric)
        raw_entries.append((cat, sev, like, expo, freq, dur, imp, hist, ctrl))

    composite_scores = np.array(composite_scores)
    
    # Quantile thresholds to guarantee balanced class distribution (solve class imbalance)
    q_low = np.quantile(composite_scores, 1.0 / 3.0)
    q_high = np.quantile(composite_scores, 2.0 / 3.0)
    
    for i in range(n_samples):
        cat, sev, like, expo, freq, dur, imp, hist, ctrl = raw_entries[i]
        score = composite_scores[i]
        
        if score <= q_low:
            risk_label = "Low"
        elif score <= q_high:
            risk_label = "Medium"
        else:
            risk_label = "High"
            
        case_id = f"RC-{10000 + i + 1}"
        data.append({
            "Case_ID": case_id,
            "Category": cat,
            "Severity": sev,
            "Likelihood": like,
            "Exposure": expo,
            "Frequency": freq,
            "Duration": dur,
            "Impact": imp,
            "Historical_Occurrence": hist,
            "Control_Effectiveness": ctrl,
            "Risk_Level": risk_label
        })
        
    df = pd.DataFrame(data)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Dataset generated with {len(df):,} records at: {output_path}")
    print(f"Class distribution:\n{df['Risk_Level'].value_counts(normalize=True).round(4)}")
    return df

if __name__ == "__main__":
    generate_risk_dataset(10000)
