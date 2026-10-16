import numpy as np
from typing import Dict, Any, List
from config import NUMERIC_FEATURES, SCORE_WEIGHTS, TARGET_CLASSES

def compute_calibrated_risk_score(probabilities: Dict[str, float]) -> float:
    """
    Computes a mathematically grounded, continuous 0-100 Risk Score (FR-17).
    Uses the model's calibrated class probabilities:
    Score = P(Low)*15.0 + P(Medium)*55.0 + P(High)*95.0
    """
    p_low = probabilities.get("Low", 0.0)
    p_med = probabilities.get("Medium", 0.0)
    p_high = probabilities.get("High", 0.0)
    
    score = (p_low * SCORE_WEIGHTS["Low"]) + (p_med * SCORE_WEIGHTS["Medium"]) + (p_high * SCORE_WEIGHTS["High"])
    return round(float(np.clip(score, 0.0, 100.0)), 1)

def extract_contributing_factors(case_data: Dict[str, Any], raw_train_df = None) -> List[Dict[str, Any]]:
    """
    Identifies the key contributing factors elevating or mitigating the risk level (FR-16, FR-18).
    Compares the current case inputs to baseline averages and thresholds.
    """
    factors = []
    
    severity = float(case_data.get("Severity", 5.0))
    likelihood = float(case_data.get("Likelihood", 5.0))
    exposure = float(case_data.get("Exposure", 5.0))
    frequency = float(case_data.get("Frequency", 5.0))
    impact = float(case_data.get("Impact", 5.0))
    hist_occ = float(case_data.get("Historical_Occurrence", 2.0))
    control_eff = float(case_data.get("Control_Effectiveness", 5.0))
    
    # 1. Severity & Impact
    if severity >= 7.0:
        factors.append({
            "factor": "Elevated Severity",
            "feature": "Severity",
            "value": severity,
            "impact_type": "escalating",
            "badge": "High Risk Driver",
            "explanation": f"Severity magnitude of {severity}/10 indicates severe potential damage if triggered."
        })
    elif severity <= 3.5:
        factors.append({
            "factor": "Low Severity",
            "feature": "Severity",
            "value": severity,
            "impact_type": "mitigating",
            "badge": "Favorable",
            "explanation": f"Low severity ({severity}/10) significantly limits overall consequence."
        })
        
    # 2. Likelihood
    if likelihood >= 7.0:
        factors.append({
            "factor": "High Occurrence Likelihood",
            "feature": "Likelihood",
            "value": likelihood,
            "impact_type": "escalating",
            "badge": "Critical Driver",
            "explanation": f"Likelihood score of {likelihood}/10 indicates high probability of manifestation."
        })
    elif likelihood <= 3.5:
        factors.append({
            "factor": "Low Likelihood",
            "feature": "Likelihood",
            "value": likelihood,
            "impact_type": "mitigating",
            "badge": "Favorable",
            "explanation": f"Low likelihood ({likelihood}/10) reduces the frequency of risk events."
        })
        
    # 3. Control Effectiveness (Inverse)
    if control_eff <= 4.0:
        factors.append({
            "factor": "Inadequate Safeguards / Controls",
            "feature": "Control_Effectiveness",
            "value": control_eff,
            "impact_type": "escalating",
            "badge": "Vulnerability",
            "explanation": f"Control effectiveness of {control_eff}/10 reveals weak preventive safeguards."
        })
    elif control_eff >= 7.5:
        factors.append({
            "factor": "Strong Existing Controls",
            "feature": "Control_Effectiveness",
            "value": control_eff,
            "impact_type": "mitigating",
            "badge": "Strong Defense",
            "explanation": f"Robust mitigation controls ({control_eff}/10) actively suppress risk realization."
        })

    # 4. Exposure & Impact
    if impact >= 7.0:
        factors.append({
            "factor": "High Collateral Impact",
            "feature": "Impact",
            "value": impact,
            "impact_type": "escalating",
            "badge": "High Impact",
            "explanation": f"Collateral impact of {impact}/10 threatens operational continuity."
        })
        
    if exposure >= 7.5:
        factors.append({
            "factor": "Broad Threat Exposure",
            "feature": "Exposure",
            "value": exposure,
            "impact_type": "escalating",
            "badge": "High Exposure",
            "explanation": f"Exposure rating of {exposure}/10 means extensive assets are subject to the threat."
        })
        
    # 5. Historical Occurrence
    if hist_occ >= 5.0:
        factors.append({
            "factor": "Repeated Historical Incidents",
            "feature": "Historical_Occurrence",
            "value": hist_occ,
            "impact_type": "escalating",
            "badge": "Past Precedent",
            "explanation": f"History of {int(hist_occ)} prior incidents establishes a proven pattern of occurrence."
        })
        
    # If factors list is empty, add balanced neutral summary
    if not factors:
        factors.append({
            "factor": "Moderate Risk Profile",
            "feature": "Balanced Attributes",
            "value": 5.0,
            "impact_type": "neutral",
            "badge": "Neutral",
            "explanation": "Attributes are in moderate ranges with standard control efficacy."
        })
        
    return factors
