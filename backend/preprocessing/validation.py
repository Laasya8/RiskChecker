from typing import Dict, Any, Tuple, List
from config import NUMERIC_FEATURES, RISK_CATEGORIES

class ValidationError(Exception):
    def __init__(self, errors: List[str]):
        super().__init__(", ".join(errors))
        self.errors = errors

def validate_risk_input(data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Validates user input according to FR-05 & FR-02:
    - Missing required fields
    - Invalid numeric values
    - Values outside allowed ranges (e.g., Severity 1-10)
    - Invalid categorical values
    - Type coercion and cleaning
    """
    errors = []
    cleaned_data = {}
    
    # Validate Category
    category = data.get("Category")
    if not category:
        errors.append("Field 'Category' is required.")
    elif category not in RISK_CATEGORIES:
        errors.append(f"Invalid Category '{category}'. Allowed: {', '.join(RISK_CATEGORIES)}")
    else:
        cleaned_data["Category"] = category
        
    # Validate Numeric Features
    for feat_name, constraints in NUMERIC_FEATURES.items():
        val = data.get(feat_name)
        if val is None:
            # Fallback to default if missing, but note or require
            cleaned_data[feat_name] = constraints["default"]
        else:
            try:
                num_val = float(val)
                min_val = constraints["min"]
                max_val = constraints["max"]
                
                if num_val < min_val or num_val > max_val:
                    errors.append(
                        f"Feature '{feat_name}' with value {num_val} is outside allowed range [{min_val}, {max_val}]."
                    )
                else:
                    cleaned_data[feat_name] = round(num_val, 2)
            except (ValueError, TypeError):
                errors.append(f"Feature '{feat_name}' must be a valid numeric value.")
                
    is_valid = len(errors) == 0
    return is_valid, errors, cleaned_data
