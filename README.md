# RiskChecker

RiskChecker is a machine-learning decision-support web app for classifying risk scenarios as **Low**, **Medium**, or **High**. A React frontend sends risk inputs to a FastAPI backend, which validates the request, applies the trained preprocessing pipeline, evaluates classifiers, and returns a risk class, class probabilities, a derived 0–100 score, similar cases, and explanations.

> **Important interpretation:** the repository's NVD/CVSS data builder maps CVSS base severity/score directly to `Risk_Level`, and uses the same base score as the `Severity` feature. The measured scores below show the models reproduce that label rule on the supplied split; they are not evidence of independent real-world predictive performance. Do not use this model as an autonomous risk decision-maker.

## Problem and capabilities

The application supports structured risk review across Financial, Operational, Cybersecurity, Environmental, Business, Safety, Project, and Infrastructure domains. Features include:

- Low/Medium/High classification and class probabilities.
- A 0–100 probability-weighted risk score.
- KNN, SVM, and Decision Tree comparison, cross-validation, and class-level metrics.
- Similar historical training cases, a Decision Tree path, and contributing-factor summaries.
- What-if comparison, dataset exploration, model analysis, and saved assessment history.
- A React/Vite frontend and FastAPI JSON API.
- A reproducible analysis notebook at [`ML_Model/src/main.ipynb`](ML_Model/src/main.ipynb).

## Supplied dataset

The CSV files are under `backend/data/`. The named split files are used for model training and held-out testing; `Case_ID` is excluded from model inputs.

| File | Rows | Columns |
|---|---:|---:|
| `train_risk_dataset.csv` | 20,000 | 11 |
| `test_risk_dataset.csv` | 20,000 | 11 |
| `historical_risk_dataset.csv` | 40,000 | 11 |

Each file contains `Case_ID`, `Category`, eight numerical inputs, and `Risk_Level`. The training and test schemas match, and there are no training/test ID overlaps. The supplied files contain no missing cells. Repeated rows/IDs are present: 4,533 in training, 5,058 in test, and 9,591 in the historical file. In addition, 2,861 unique test feature vectors also occur in training, even though their IDs differ. Repeated and shared feature vectors reduce the effective independent sample size and can inflate ordinary held-out metrics.

The target distribution is nearly exactly balanced:

| Split | Low | Medium | High |
|---|---:|---:|---:|
| Training | 6,668 | 6,666 | 6,666 |
| Test file | 6,668 | 6,666 | 6,666 |
| Historical file | 13,336 | 13,332 | 13,332 |

Primary test metrics are calculated on 6,593 unique test feature vectors not seen in training (879 Low, 2,777 Medium, 2,937 High). Duplicate test feature vectors are counted once; feature vectors already present in training are excluded from this evaluation.

### Inputs

`backend/config.py` is the source of truth for feature descriptions and allowed ranges.

| Feature | Description | Range |
|---|---|---:|
| `Category` | Risk domain | Configured category |
| `Severity` | Potential consequence magnitude | 1–10 |
| `Likelihood` | Probability of occurrence | 1–10 |
| `Exposure` | Scope of assets/operations affected | 1–10 |
| `Frequency` | Recurrence of risk trigger | 1–10 |
| `Duration` | Expected downtime or resolution time | 1–10 |
| `Impact` | Financial/operational consequence | 1–10 |
| `Historical_Occurrence` | Recorded prior incidents | 0–10 |
| `Control_Effectiveness` | Strength of safeguards | 1–10 |
| `Risk_Level` | Prediction target: Low, Medium, or High | Three classes |

The repository's `backend/build_realtime_dataset.py` maps NVD/CVSS data into these fields. Its label rule uses CVSS base severity/score, while `Severity` is derived from that same base score. This makes the target directly encoded in a model input. The supplied CSVs have no source-version manifest, and several other dimensions are derived/standardized values. Treat the experiment as reproducing this dataset's target construction, not as a real-world benchmark or proof of causality.

## Data preparation and analysis

The backend applies median numeric imputation, most-frequent categorical imputation, one-hot encoding of `Category`, numeric standardization, and IQR-based numeric capping. Identifiers and target labels are not model features. The preprocessing is fitted on training data; during stratified group cross-validation, duplicate feature vectors are kept in the same fold and each fold fits its own preprocessing pipeline using only its training portion. Test evaluation excludes duplicates of training feature vectors and counts each test feature vector once.

The notebook calculates schema and data-quality tables, missing-value and duplicate checks, target and category distributions, numerical histograms, IQR outlier summaries, numerical correlations, feature/target comparisons, validation predictions, model metrics, and diagnostic plots. In the supplied training data, the strongest absolute numerical correlation is Severity–Impact (about 0.906), followed by Duration–Impact (about 0.889). These are associations only and do not imply causation.

## Models, metrics, and measured comparison

The backend trains the existing three classifiers using the same split and preprocessing:

- **KNN:** distance-based classifier and similar-case retrieval; requires scaled inputs.
- **SVM (RBF):** nonlinear decision boundary over standardized features.
- **Decision Tree:** threshold rules with an inspectable path and impurity-based feature importance.

The selected model is the one with the highest **five-fold cross-validation macro F1**. Macro F1 weights classes equally; High-risk recall is reported as a separate diagnostic. Accuracy is overall correctness; precision is correctness among predicted positives; recall is the fraction of true positives found; F1 balances precision and recall; macro one-vs-rest ROC-AUC measures class ranking quality. CV standard deviation shows variation across folds. Confusion matrices show true versus predicted class counts.

The scores below were captured from a real run of `python backend\train.py` on the supplied CSV files with seed 42 and the default configuration. Test metrics use the unique test feature vectors not present in training; test labels were not used for fitting or model selection. The command also writes the current results to `backend/models_cache/experiment_results.json`; it does not rewrite this README.

| Model | CV accuracy (mean ± SD) | CV macro precision (mean ± SD) | CV macro recall (mean ± SD) | CV macro F1 (mean ± SD) | CV macro ROC-AUC OvR (mean ± SD) | Test accuracy | Test macro precision | Test macro recall | Test macro F1 | Test macro ROC-AUC OvR | Test High recall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| KNN | 0.9814 ± 0.0016 | 0.9814 ± 0.0015 | 0.9814 ± 0.0014 | 0.9814 ± 0.0014 | 0.9950 ± 0.0007 | 0.9519 | 0.9422 | 0.9607 | 0.9507 | 0.9872 | 0.945 |
| SVM (RBF) | 0.9965 ± 0.0009 | 0.9966 ± 0.0009 | 0.9965 ± 0.0009 | 0.9965 ± 0.0009 | 1.0000 ± 0.0000 | 0.9927 | 0.9907 | 0.9939 | 0.9923 | 0.9999 | 0.991 |
| Decision Tree (Gini, depth 5) | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.000 |

**Selected model:** Decision Tree, because its five-fold validation macro F1 was highest (1.0000 ± 0.0000). This perfect score is expected to reflect the direct relationship between the label rule and the `Severity` input, and is not a basis for claiming generalization to independently labeled risk. The notebook reports these outputs dynamically; rerun training after changing the data or model configuration and refresh this README's table from the JSON report.

## Visualizations and findings

The notebook generates:

- Target-class and risk-category distributions.
- Numerical feature histograms, IQR outlier counts, and a correlation heatmap.
- Numerical feature distributions grouped by target class.
- Model score comparison chart.
- Selected-model confusion matrix and High-risk ROC/precision-recall curves.
- Decision Tree impurity feature-importance chart.

The provided labels are balanced and the leading numerical features are correlated. Because of the label construction and repeated records, these plots and metrics should be read as analysis of the supplied files, not as evidence that these patterns are universal or causal.

## Application architecture

```text
Browser
  -> React 19 / Vite frontend (frontend/src)
  -> FastAPI routes and Pydantic request validation (backend/app.py)
  -> ModelManager (backend/models/model_manager.py)
  -> preprocessing pipeline -> KNN / SVM / Decision Tree
  -> JSON prediction/explanation -> frontend
  -> SQLite audit history (backend/database.py)
```

The backend caches the fitted preprocessing pipeline, classifiers, evaluation results, and required training state in the fixed local file `backend/models_cache/risk_models_v1.joblib`. It reuses the artifact only when its format version and fingerprint of data/settings match. Otherwise it retrains. `POST /api/retrain` forces a refresh. Only load this application-generated file; joblib/pickle deserialization is unsafe for untrusted inputs.

### API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Service health |
| `GET /api/config` | Categories, feature definitions, ranges, defaults |
| `GET /api/summary` | Dataset/model summary |
| `POST /api/assess` | Classify and explain a case |
| `POST /api/what-if` | Compare original and modified inputs |
| `GET /api/models` | Model metrics, cross-validation, tree information |
| `POST /api/retrain` | Force retraining |
| `GET /api/dataset` | Dataset statistics and paginated rows |
| `GET /api/decision-boundary` | SVM two-feature visualization data |
| `/api/history` | List/save/delete assessment history |

Example assessment request:

```json
{
  "case_title": "Database outage scenario",
  "Category": "Cybersecurity",
  "Severity": 8,
  "Likelihood": 7,
  "Exposure": 8,
  "Frequency": 4,
  "Duration": 6,
  "Impact": 8,
  "Historical_Occurrence": 3,
  "Control_Effectiveness": 4,
  "chosen_model": "auto"
}
```

Successful responses include `predicted_risk`, `risk_score`, `confidence`, `probabilities`, `selected_model`, `all_model_predictions`, `similar_cases`, `decision_tree_path`, and `contributing_factors`.

## Directory structure

```text
RiskChecker/
|-- api/index.py
|-- backend/
|   |-- app.py, config.py, database.py
|   |-- build_realtime_dataset.py, data_generator.py, train.py
|   |-- risk_assessment.db (runtime database, ignored)
|   |-- models_cache/ (generated model artifact/report, ignored)
|   |-- data/
|   |   |-- train_risk_dataset.csv
|   |   |-- test_risk_dataset.csv
|   |   `-- historical_risk_dataset.csv
|   |-- evaluation/ (metrics.py, cross_validator.py)
|   |-- explainability/ (reasoning.py, what_if.py)
|   |-- models/ (KNN, SVM, Decision Tree, model manager)
|   |-- preprocessing/ (pipeline.py, validation.py)
|   `-- test_*.py
|-- frontend/
|   |-- src/App.jsx, api.js, pages/, components/, assets/
|   |-- package.json
|   `-- vite.config.js
|-- ML_Model/src/main.ipynb
|-- requirements.txt
|-- Dockerfile, Procfile, vercel.json, build.sh
|-- run.py, start_backend.py, start_all.bat
|-- .gitignore
|-- README.md
`-- PROJECT_GUIDE.md
```

Generated model artifacts, report JSON, database, caches, downloaded NVD feeds, frontend build output, and `node_modules` are ignored by Git.

## Setup and startup

Requirements: Python 3.10+ (the current code/tests were exercised using Python 3.11), Node.js/npm for frontend builds.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Set-Location frontend
npm install
npm run build
Set-Location ..
python run.py
```

Open `http://localhost:8000`; API documentation is at `http://localhost:8000/docs`. `python run.py` builds the frontend if `frontend/dist` does not exist. For frontend development, run `npm run dev` from `frontend/` and start the API separately using `python start_backend.py`.

### Model training and notebook

Train models, force five-fold CV, evaluate the held-out test data, save the model artifact, and write the measured JSON summary:

```powershell
python backend\train.py
```

Reuse a matching cached artifact instead of retraining:

```powershell
python backend\train.py --reuse-cache
```

Open the notebook:

```powershell
python -m notebook ML_Model\src\main.ipynb
```

Execute the notebook from top to bottom without overwriting its clean source:

```powershell
python -m nbconvert --to notebook --execute --output main.executed.ipynb --output-dir backend\models_cache ML_Model\src\main.ipynb
```

The notebook uses the supplied CSVs and does not download data. Training and notebook runs write cache/report files under `backend/models_cache/`.

## Tests and troubleshooting

```powershell
python backend\test_ml_pipeline.py
python backend\test_all_endpoints.py
Set-Location frontend
npm run build
npm run lint
```

The ML tests cover split schema/ID integrity, identifier exclusion, preprocessing output, fold-local preprocessing, and multiclass ROC-AUC. The API script exercises health/config/summary, prediction, what-if, model and dataset routes, and history CRUD.

- **Missing Python imports:** activate the virtual environment and install `requirements.txt` from the repository root.
- **Slow first run:** initial model training and five-fold CV take longer; a matching local model artifact is reused on later starts.
- **Cache refresh:** data or model-setting changes invalidate the cache; `/api/retrain` always forces a refresh.
- **Notebook path errors:** start Jupyter from the project root; the notebook also searches parent directories for `backend/data`.
- **Frontend is not served:** run `npm run build` in `frontend/` and restart `python run.py`.
- **Perfect model scores:** review label derivation, `Severity` leakage, duplicate cases, and provenance. These scores do not demonstrate real-world validity.

## Limitations and responsible use

- `Risk_Level` is constructed from CVSS severity/score, and `Severity` is the same score in the dataset builder. This is direct target leakage for a model intended to independently estimate risk.
- Repeated rows and IDs can inflate the apparent number of independent examples and influence model metrics.
- The supplied files do not identify the exact source snapshot or data preparation version.
- Several model inputs are derived values, and the classes are balanced; actual deployment prevalence may differ.
- Probability outputs and score weights are not externally calibrated against independently adjudicated outcomes.
- Correlation and feature importance are not causal explanations.
- Keep a human reviewer in the decision loop. Obtain independent labels, document data provenance, evaluate meaningful false-positive/false-negative costs, calibrate probabilities, and monitor drift before any operational use.

See [`PROJECT_GUIDE.md`](PROJECT_GUIDE.md) for a beginner-oriented explanation of the project modules and workflow.
