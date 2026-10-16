import sqlite3
import json
from datetime import datetime
from config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Prediction History Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            case_title TEXT,
            category TEXT NOT NULL,
            features_json TEXT NOT NULL,
            predicted_risk TEXT NOT NULL,
            risk_score REAL NOT NULL,
            confidence REAL NOT NULL,
            selected_model TEXT NOT NULL,
            model_probabilities_json TEXT,
            top_factors_json TEXT,
            notes TEXT
        )
    """)
    
    # System benchmark logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS benchmark_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            model_name TEXT NOT NULL,
            accuracy REAL NOT NULL,
            precision_macro REAL NOT NULL,
            recall_macro REAL NOT NULL,
            f1_macro REAL NOT NULL,
            cv_folds INTEGER NOT NULL,
            cv_mean REAL NOT NULL,
            cv_std REAL NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

def save_assessment(assessment_data: dict) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO assessment_history (
            timestamp, case_title, category, features_json,
            predicted_risk, risk_score, confidence, selected_model,
            model_probabilities_json, top_factors_json, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now,
        assessment_data.get("case_title", "Risk Assessment Case"),
        assessment_data.get("category", "General"),
        json.dumps(assessment_data.get("features", {})),
        assessment_data.get("predicted_risk", "Unknown"),
        float(assessment_data.get("risk_score", 0.0)),
        float(assessment_data.get("confidence", 0.0)),
        assessment_data.get("selected_model", "Auto"),
        json.dumps(assessment_data.get("probabilities", {})),
        json.dumps(assessment_data.get("top_factors", [])),
        assessment_data.get("notes", "")
    ))
    
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return inserted_id

def get_assessment_history(limit: int = 100):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM assessment_history ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    
    history = []
    for r in rows:
        history.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "case_title": r["case_title"],
            "category": r["category"],
            "features": json.loads(r["features_json"]),
            "predicted_risk": r["predicted_risk"],
            "risk_score": r["risk_score"],
            "confidence": r["confidence"],
            "selected_model": r["selected_model"],
            "probabilities": json.loads(r["model_probabilities_json"]) if r["model_probabilities_json"] else {},
            "top_factors": json.loads(r["top_factors_json"]) if r["top_factors_json"] else [],
            "notes": r["notes"]
        })
    conn.close()
    return history

def delete_assessment(assessment_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessment_history WHERE id = ?", (assessment_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def clear_all_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessment_history")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
