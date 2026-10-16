from typing import Dict, Any, List
import copy

def run_what_if_comparison(original_assessment: Dict[str, Any], modified_assessment: Dict[str, Any], original_inputs: Dict[str, Any], modified_inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes comparative diffs for What-If Analysis (FR-19).
    Shows:
    - Changed variables & deltas
    - Risk Level transition (e.g. High -> Medium)
    - Risk Score delta (e.g. 84.2 -> 52.0, -32.2)
    - Probability shifts
    - Analysis commentary
    """
    changed_features = []
    for key, orig_val in original_inputs.items():
        if key in modified_inputs:
            mod_val = modified_inputs[key]
            if orig_val != mod_val:
                try:
                    delta = round(float(mod_val) - float(orig_val), 2)
                except (ValueError, TypeError):
                    delta = None
                changed_features.append({
                    "feature": key,
                    "original": orig_val,
                    "modified": mod_val,
                    "delta": delta
                })
                
    orig_score = original_assessment.get("risk_score", 0.0)
    mod_score = modified_assessment.get("risk_score", 0.0)
    score_diff = round(mod_score - orig_score, 1)
    
    orig_level = original_assessment.get("predicted_risk", "Unknown")
    mod_level = modified_assessment.get("predicted_risk", "Unknown")
    
    # Class probability shifts
    orig_prob = original_assessment.get("probabilities", {})
    mod_prob = modified_assessment.get("probabilities", {})
    prob_shifts = {}
    for cls in ["Low", "Medium", "High"]:
        p_orig = orig_prob.get(cls, 0.0)
        p_mod = mod_prob.get(cls, 0.0)
        prob_shifts[cls] = {
            "original": p_orig,
            "modified": p_mod,
            "shift": round(p_mod - p_orig, 3)
        }
        
    # Generate human-readable analytical commentary
    if score_diff < -15.0:
        summary = f"Risk significantly mitigated! Score dropped by {abs(score_diff)} points ({orig_score} -> {mod_score}). Risk level transitioned from {orig_level} to {mod_level}."
    elif score_diff < -2.0:
        summary = f"Moderate risk reduction observed. Score decreased by {abs(score_diff)} points ({orig_score} -> {mod_score})."
    elif score_diff > 15.0:
        summary = f"Risk escalation alert! Score jumped by {score_diff} points ({orig_score} -> {mod_score}). Risk level transitioned from {orig_level} to {mod_level}."
    elif score_diff > 2.0:
        summary = f"Risk increased slightly by {score_diff} points ({orig_score} -> {mod_score})."
    else:
        summary = f"Marginal change ({score_diff:+} score points). Risk level remains {mod_level}."
        
    return {
        "changed_features": changed_features,
        "original_risk_level": orig_level,
        "modified_risk_level": mod_level,
        "original_risk_score": orig_score,
        "modified_risk_score": mod_score,
        "score_delta": score_diff,
        "probability_shifts": prob_shifts,
        "summary": summary
    }
