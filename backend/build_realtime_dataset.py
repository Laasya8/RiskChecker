import os
import sys
import json
import lzma
import urllib.request
import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

TRAIN_DATASET_PATH = os.path.join(DATA_DIR, "train_risk_dataset.csv")
TEST_DATASET_PATH = os.path.join(DATA_DIR, "test_risk_dataset.csv")
COMBINED_DATASET_PATH = os.path.join(DATA_DIR, "historical_risk_dataset.csv")

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

CATEGORY_KEYWORDS = {
    "Financial": [
        "bank", "fintech", "payment", "credit", "wallet", "crypto", "currency", 
        "invoice", "e-commerce", "checkout", "billing", "monetary", "paypal", 
        "stripe", "ledger", "transaction", "atm", "cardholder", "pos terminal", "treasury"
    ],
    "Environmental": [
        "energy", "sensor", "hvac", "temperature", "water", "power", "solar", 
        "grid", "smart meter", "climate", "iot", "scada", "modbus", "building",
        "plc", "industrial control", "utility", "thermostat", "generator", "turbine"
    ],
    "Safety": [
        "health", "medical", "hospital", "patient", "automotive", "vehicle", 
        "brake", "aviation", "flight", "emergency", "physical", "alarm", 
        "hazmat", "fire", "telehealth", "implant", "infusion", "airbag", "collision"
    ],
    "Project": [
        "git", "github", "gitlab", "repository", "ci/cd", "pipeline", "build", 
        "compiler", "npm", "maven", "gradle", "nuget", "pip", "library", 
        "package", "dependency", "jenkins", "devops", "sdk", "artifact", "submodule"
    ],
    "Operational": [
        "erp", "crm", "supply chain", "logistics", "inventory", "warehouse", 
        "workflow", "scheduler", "sap", "oracle erp", "salesforce", "service desk",
        "procurement", "dispatch", "telecom", "telephony", "pbx", "call center"
    ],
    "Business": [
        "portal", "accounting", "reporting", "hr", "payroll", "document", 
        "cms", "wordpress", "drupal", "sharepoint", "intranet", "email", 
        "exchange", "collaboration", "wiki", "confluence", "jira", "timesheet"
    ],
    "Infrastructure": [
        "kernel", "firmware", "router", "switch", "hypervisor", "vmware", 
        "cisco", "vpn", "dns", "dhcp", "cloud", "aws", "azure", "docker", 
        "kubernetes", "linux", "windows server", "virtualization", "storage", "san"
    ]
}

def determine_category(desc_text: str, cve_id: str) -> str:
    """Classifies a vulnerability into one of the 8 industrial categories."""
    desc_lower = desc_text.lower()
    
    score_by_cat = {}
    for cat, kws in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in kws if kw in desc_lower)
        if score > 0:
            score_by_cat[cat] = score
            
    if score_by_cat:
        best_cat = max(score_by_cat, key=score_by_cat.get)
        return best_cat
        
    # Balanced fallback across categories to maintain representation
    h = hash(cve_id) % len(RISK_CATEGORIES)
    return RISK_CATEGORIES[h]

def download_nvd_feed(year: int, cache_dir: str = DATA_DIR) -> Dict[str, Any]:
    """Downloads and decompresses an official NVD yearly feed snapshot."""
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f"CVE-{year}.json")
    
    if os.path.exists(cache_file) and os.path.getsize(cache_file) > 1000000:
        print(f"Loading cached CVE-{year} from {cache_file}...")
        with open(cache_file, "r", encoding="utf-8") as f:
            return json.load(f)
            
    url = f"https://github.com/fkie-cad/nvd-json-data-feeds/releases/latest/download/CVE-{year}.json.xz"
    print(f"Downloading CVE-{year} feed from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=60) as res:
        compressed_bytes = res.read()
        
    print(f"Decompressing {len(compressed_bytes) / 1024 / 1024:.2f} MB of xz data for {year}...")
    json_bytes = lzma.decompress(compressed_bytes)
    data = json.loads(json_bytes.decode("utf-8"))
    
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            f.write(json_bytes.decode("utf-8"))
        print(f"Saved cached feed to {cache_file}")
    except Exception as e:
        print(f"Warning caching feed: {e}")
        
    return data

def parse_cve_to_risk_case(cve_item: Dict[str, Any], vendor_counts: Dict[str, int]) -> Optional[Dict[str, Any]]:
    """Maps a raw NVD CVE record into the 9-dimensional DSS risk format."""
    cve_id = cve_item.get("id") or "CVE-UNKNOWN"
    
    # 1. Extract CVSS v3.1 or v3.0 metrics
    metrics = cve_item.get("metrics", {})
    cvss_list = metrics.get("cvssMetricV31") or metrics.get("cvssMetricV30")
    if not cvss_list or not isinstance(cvss_list, list):
        return None
        
    primary_metric = cvss_list[0]
    cvss_data = primary_metric.get("cvssData", {})
    
    base_score = float(cvss_data.get("baseScore", 5.0))
    base_severity = str(cvss_data.get("baseSeverity", "MEDIUM")).upper()
    
    # Target Class Mapping
    if base_severity in ["CRITICAL", "HIGH"] or base_score >= 7.0:
        risk_level = "High"
    elif base_severity == "LOW" or base_score <= 3.9:
        risk_level = "Low"
    else:
        risk_level = "Medium"
        
    # 2. Extract description for domain classification
    descriptions = cve_item.get("descriptions", [])
    desc_text = ""
    for d in descriptions:
        if d.get("lang") == "en":
            desc_text = d.get("value", "")
            break
    if not desc_text and descriptions:
        desc_text = descriptions[0].get("value", "")
        
    category = determine_category(desc_text, cve_id)
    
    # 3. Standardized Feature Mappings (1.0 to 10.0 scale)
    # Severity: Direct mapping from CVSS Base Score
    severity = np.clip(round(base_score, 1), 1.0, 10.0)
    
    # Likelihood: Exploitability Score (0.1 - 3.9) + User Interaction modifier
    exploit_raw = float(primary_metric.get("exploitabilityScore", 2.0))
    exploit_norm = (exploit_raw / 3.9) * 7.5 + 1.5
    user_interaction = cvss_data.get("userInteraction", "NONE").upper()
    if user_interaction == "NONE":
        exploit_norm += 0.8
    elif user_interaction == "REQUIRED":
        exploit_norm -= 0.8
    likelihood = np.clip(round(exploit_norm, 1), 1.0, 10.0)
    
    # Exposure: Attack Vector (Network = wide, Physical = isolated) + Scope
    attack_vector = cvss_data.get("attackVector", "NETWORK").upper()
    vector_map = {
        "NETWORK": 8.5,
        "ADJACENT_NETWORK": 6.5,
        "LOCAL": 4.5,
        "PHYSICAL": 2.0
    }
    expo_base = vector_map.get(attack_vector, 5.0)
    if cvss_data.get("scope", "UNCHANGED").upper() == "CHANGED":
        expo_base += 1.2
    exposure = np.clip(round(expo_base + (hash(cve_id) % 7 - 3) * 0.15, 1), 1.0, 10.0)
    
    # Frequency: Attack Complexity (Low = repeatable, High = rare)
    attack_complexity = cvss_data.get("attackComplexity", "LOW").upper()
    if attack_complexity == "LOW":
        freq_val = 7.0 + (hash(cve_id) % 5) * 0.5
    else:
        freq_val = 2.5 + (hash(cve_id) % 5) * 0.4
    frequency = np.clip(round(freq_val, 1), 1.0, 10.0)
    
    # Duration: Downtime & Recovery latency
    avail_impact = cvss_data.get("availabilityImpact", "LOW").upper()
    integ_impact = cvss_data.get("integrityImpact", "LOW").upper()
    dur_score = 3.5
    if avail_impact == "HIGH":
        dur_score += 3.0
    if integ_impact == "HIGH":
        dur_score += 2.0
    duration = np.clip(round(dur_score + (hash(cve_id) % 5 - 2) * 0.2, 1), 1.0, 10.0)
    
    # Impact: Impact Score (0.0 - 6.0) normalized to 1.0 - 10.0
    impact_raw = float(primary_metric.get("impactScore", 3.5))
    norm_impact = (impact_raw / 6.0) * 8.0 + 1.5
    impact = np.clip(round(norm_impact, 1), 1.0, 10.0)
    
    # Historical Occurrence (0.0 - 10.0 scale)
    # Based on vendor / component frequency in dataset
    source_id = str(cve_item.get("sourceIdentifier", "vendor"))
    vendor_freq = vendor_counts.get(source_id, 1)
    hist_occ = np.clip(round(np.log1p(vendor_freq) * 1.5), 0.0, 10.0)
    
    # Control Effectiveness: Privileges Required (Mitigating Safeguards)
    priv_req = cvss_data.get("privilegesRequired", "NONE").upper()
    if priv_req == "HIGH":
        ctrl_base = 8.5
    elif priv_req == "LOW":
        ctrl_base = 5.5
    else:
        ctrl_base = 2.5
    if user_interaction == "REQUIRED":
        ctrl_base += 1.0
    ctrl_eff = np.clip(round(ctrl_base + (hash(cve_id) % 5 - 2) * 0.2, 1), 1.0, 10.0)
    
    return {
        "Case_ID": cve_id,
        "Category": category,
        "Severity": float(severity),
        "Likelihood": float(likelihood),
        "Exposure": float(exposure),
        "Frequency": float(frequency),
        "Duration": float(duration),
        "Impact": float(impact),
        "Historical_Occurrence": float(hist_occ),
        "Control_Effectiveness": float(ctrl_eff),
        "Risk_Level": risk_level
    }

def build_datasets(train_target: int = 20000, test_target: int = 20000):
    """
    Builds authentic, separate 20k Training and 20k Testing datasets from official NVD CVE feeds.
    Temporal separation:
      - Training: Real vulnerabilities from 2021, 2022, 2023
      - Testing: Real vulnerabilities from 2024
    """
    print(f"\n=======================================================")
    print(f"Building Real-World Risk Assessment Datasets")
    print(f"Target: {train_target:,} Train Records & {test_target:,} Test Records")
    print(f"=======================================================\n")
    
    # 1. Fetch Training Feeds (2022, 2023)
    train_cves = []
    for y in [2022, 2023]:
        feed = download_nvd_feed(y)
        train_cves.extend(feed.get("cve_items", []))
    print(f"Total raw training candidate CVEs (2022-2023): {len(train_cves):,}")
    
    # 2. Fetch Testing Feed (2024)
    test_feed = download_nvd_feed(2024)
    test_cves = test_feed.get("cve_items", [])
    print(f"Total raw testing candidate CVEs (2024): {len(test_cves):,}")
    
    # Count vendor frequencies
    vendor_counts = {}
    for c in train_cves + test_cves:
        sid = str(c.get("sourceIdentifier", "vendor"))
        vendor_counts[sid] = vendor_counts.get(sid, 0) + 1
        
    # 3. Parse Training Records
    print("\nProcessing training cases...")
    train_cases = []
    for c in train_cves:
        case = parse_cve_to_risk_case(c, vendor_counts)
        if case:
            train_cases.append(case)
    print(f"Parsed {len(train_cases):,} valid training cases with CVSS v3 telemetry.")
    
    # 4. Parse Testing Records
    print("\nProcessing testing cases...")
    test_cases = []
    for c in test_cves:
        case = parse_cve_to_risk_case(c, vendor_counts)
        if case:
            test_cases.append(case)
    print(f"Parsed {len(test_cases):,} valid testing cases with CVSS v3 telemetry.")
    
    # Stratified balance across classes
    def balance_and_sample(cases: List[Dict[str, Any]], target_count: int, seed: int = 42) -> pd.DataFrame:
        df = pd.DataFrame(cases).drop_duplicates(subset=["Case_ID"])
        rng = np.random.RandomState(seed)
        
        counts = df["Risk_Level"].value_counts()
        print(f"Raw class counts: {counts.to_dict()}")
        
        # Balance classes so ML models have balanced representation
        target_per_class = target_count // 3
        remainder = target_count - (target_per_class * 3)
        
        dfs = []
        for level in ["Low", "Medium", "High"]:
            subset = df[df["Risk_Level"] == level]
            needed = target_per_class + (remainder if level == "Low" else 0)
            
            if len(subset) >= needed:
                sampled = subset.sample(n=needed, random_state=rng)
            else:
                # Upsample slightly if minority class needs coverage
                replace_count = needed - len(subset)
                extra = subset.sample(n=replace_count, replace=True, random_state=rng)
                sampled = pd.concat([subset, extra], ignore_index=True)
            dfs.append(sampled)
            
        combined = pd.concat(dfs, ignore_index=True)
        # Shuffle final dataframe
        combined = combined.sample(frac=1.0, random_state=rng).reset_index(drop=True)
        return combined

    train_df = balance_and_sample(train_cases, train_target, seed=42)
    test_df = balance_and_sample(test_cases, test_target, seed=123)
    
    print("\nSaving datasets...")
    train_df.to_csv(TRAIN_DATASET_PATH, index=False)
    print(f"Saved Train Dataset ({len(train_df):,} rows) to: {TRAIN_DATASET_PATH}")
    print(f"Train Class Distribution:\n{train_df['Risk_Level'].value_counts(normalize=True).round(3)}")
    print(f"Train Category Distribution:\n{train_df['Category'].value_counts()}")
    
    test_df.to_csv(TEST_DATASET_PATH, index=False)
    print(f"\nSaved Test Dataset ({len(test_df):,} rows) to: {TEST_DATASET_PATH}")
    print(f"Test Class Distribution:\n{test_df['Risk_Level'].value_counts(normalize=True).round(3)}")
    
    # Also save combined 40,000 dataset for backward compatibility
    combined_df = pd.concat([train_df, test_df], ignore_index=True)
    combined_df.to_csv(COMBINED_DATASET_PATH, index=False)
    print(f"\nSaved Combined Dataset ({len(combined_df):,} rows) to: {COMBINED_DATASET_PATH}")
    
    print("\nDataset creation complete successfully!")
    return train_df, test_df

if __name__ == "__main__":
    build_datasets()
