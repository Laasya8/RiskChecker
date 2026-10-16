import os

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    MODELS_CACHE_DIR = "/tmp/models_cache"
    DB_PATH = "/tmp/risk_assessment.db"
else:
    MODELS_CACHE_DIR = os.path.join(BASE_DIR, "models_cache")
    DB_PATH = os.path.join(BASE_DIR, "risk_assessment.db")

DATASET_PATH = os.path.join(DATA_DIR, "historical_risk_dataset.csv")
TRAIN_DATASET_PATH = os.path.join(DATA_DIR, "train_risk_dataset.csv")
TEST_DATASET_PATH = os.path.join(DATA_DIR, "test_risk_dataset.csv")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_CACHE_DIR, exist_ok=True)

# Random Seed for Reproducibility
RANDOM_SEED = 42

# Risk Categories
RISK_CATEGORIES = [
    "Financial",
    "Operational",
    "Cybersecurity",
    "Environmental",
    "Business",
    "Safety",
    "Project",
    "Infrastructure"
]

# Real-World Discrete Feature Definitions with Qualitative Anchors
NUMERIC_FEATURES = {
    "Severity": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 5, 
        "unit": "1 to 10 Scale",
        "description": "Potential magnitude of consequence",
        "anchors": {
            1: "Negligible", 
            3: "Minor", 
            5: "Moderate", 
            7: "Major", 
            9: "Critical",
            10: "Catastrophic"
        }
    },
    "Likelihood": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 5, 
        "unit": "1 to 10 Scale",
        "description": "Probability of occurrence",
        "anchors": {
            1: "Rare", 
            3: "Unlikely", 
            5: "Possible", 
            7: "Likely", 
            9: "Almost Certain",
            10: "Imminent"
        }
    },
    "Exposure": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 5, 
        "unit": "1 to 10 Scale",
        "description": "Scope of assets / operations affected",
        "anchors": {
            1: "Isolated", 
            3: "Single Team", 
            5: "Multiple Units", 
            7: "Core Systems", 
            10: "Enterprise-wide"
        }
    },
    "Frequency": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 4, 
        "unit": "1 to 10 Scale",
        "description": "Recurrence rate of risk trigger",
        "anchors": {
            1: "Annual", 
            3: "Quarterly", 
            5: "Monthly", 
            7: "Weekly", 
            10: "Daily / Constant"
        }
    },
    "Duration": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 4, 
        "unit": "1 to 10 Scale",
        "description": "Expected downtime / resolution time",
        "anchors": {
            1: "< 1 hour", 
            3: "Half-day", 
            5: "1 to 3 days", 
            7: "1 to 2 weeks", 
            10: "> 1 month"
        }
    },
    "Impact": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 5, 
        "unit": "1 to 10 Scale",
        "description": "Collateral financial & operational impact",
        "anchors": {
            1: "Insignificant", 
            3: "Low", 
            5: "Moderate", 
            7: "Substantial", 
            10: "Severe / Existential"
        }
    },
    "Historical_Occurrence": {
        "min": 0, 
        "max": 10, 
        "step": 1,
        "default": 2, 
        "unit": "Incident Count (0-10)",
        "description": "Past incidents recorded (past 3 years)",
        "anchors": {
            0: "0 incidents", 
            2: "1-2 incidents", 
            5: "3-5 incidents", 
            8: "6-8 incidents", 
            10: "10+ incidents"
        }
    },
    "Control_Effectiveness": {
        "min": 1, 
        "max": 10, 
        "step": 1,
        "default": 6, 
        "unit": "1 to 10 Scale",
        "description": "Safeguards and mitigation strength",
        "anchors": {
            1: "No Controls", 
            3: "Weak / Ad-hoc", 
            5: "Adequate", 
            7: "Strong", 
            9: "Optimized",
            10: "Fully Automated"
        }
    }
}

# Target Classes
TARGET_CLASSES = ["Low", "Medium", "High"]

# Quantitative Risk Score Formula Weights
SCORE_WEIGHTS = {
    "Low": 15.0,
    "Medium": 55.0,
    "High": 95.0
}
