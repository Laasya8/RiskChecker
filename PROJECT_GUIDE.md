# RiskChecker Project Guide

This guide describes the files and behavior that exist in this repository. RiskChecker is a risk-classification decision-support application; it is not the house-price prediction project used as an organizational reference.

## 1. What RiskChecker does

RiskChecker accepts a risk domain and eight numerical risk indicators, then predicts a risk class: **Low**, **Medium**, or **High**. It also returns class probabilities, a probability-derived 0–100 score, model comparisons, similar training cases, and an explanation from the Decision Tree.

The application is decision support, not an automated decision-maker. Users should review the evidence and apply their organization's risk policy. In particular, the supplied data has repeated cases and its provenance and collection period are not recorded alongside the CSV files.

## 2. Dataset and target

The files are in `backend/data/`:

| File | Supplied rows | Purpose |
|---|---:|---|
| `train_risk_dataset.csv` | 20,000 | Fit models and perform stratified cross-validation |
| `test_risk_dataset.csv` | 20,000 | Held-out evaluation; labels are not used for fitting or model selection |
| `historical_risk_dataset.csv` | 40,000 | Combined dataset used for exploration and legacy configuration |

Each file has 11 columns. `Case_ID` is a record identifier and is never a model feature. `Category` is categorical, the eight risk dimensions are numeric, and `Risk_Level` is the target. The supplied split files have matching schemas and no IDs in common. In the checked-in data there are no missing values. Repeated rows and IDs are present (4,533 in training and 5,058 in test); repeated records mean row counts overstate the number of independent cases. A further 2,861 unique test feature vectors also occur in training despite different IDs, so they are excluded from primary test metrics.

The target counts in the supplied files are:

| Split | Low | Medium | High |
|---|---:|---:|---:|
| Training | 6,668 | 6,666 | 6,666 |
| Test | 6,668 | 6,666 | 6,666 |
| Historical combined | 13,336 | 13,332 | 13,332 |

Although the train/test identifiers do not overlap, 2,861 unique test feature vectors also appear in the training inputs. To avoid reporting scores on already-seen inputs, the primary test metrics use 6,593 unique test feature vectors absent from training: 879 Low, 2,777 Medium, and 2,937 High. Duplicate vectors are counted once. The complete 20,000-row test file remains intact for dataset exploration.

The project includes `backend/build_realtime_dataset.py`, which can transform NVD/CVSS feeds into the RiskChecker schema. It maps CVSS severity/score into risk classes and derives/standardizes several risk dimensions. The supplied CSVs do not include a source-version manifest, so their exact source snapshot and generation provenance cannot be independently established from the files alone.

The target-generation relationship is especially important: the builder assigns `Risk_Level` from CVSS base severity/score and also uses that same base score as `Severity`. The target is therefore directly encoded in one of the inputs. Perfect model scores indicate that the classifier reproduces this construction rule; they do not demonstrate an independently predictive risk model.

### Input features

| Feature | Meaning | Expected range |
|---|---|---:|
| `Category` | Risk domain (Financial, Operational, Cybersecurity, Environmental, Business, Safety, Project, Infrastructure) | One configured category |
| `Severity` | Potential consequence magnitude | 1–10 |
| `Likelihood` | Probability of occurrence | 1–10 |
| `Exposure` | Scope of assets or operations affected | 1–10 |
| `Frequency` | Recurrence of the risk trigger | 1–10 |
| `Duration` | Expected duration or resolution time | 1–10 |
| `Impact` | Financial, operational, or reputational consequence | 1–10 |
| `Historical_Occurrence` | Recorded past incidents | 0–10 |
| `Control_Effectiveness` | Strength of safeguards and mitigations | 1–10 |

`backend/config.py` is the authoritative source of categories, descriptions, defaults, anchors, ranges, class names, and risk-score weights. See that file for the full qualitative scale descriptions.

## 3. Data preparation

The backend's `PreprocessingPipeline` performs the transformations used for both fitting and inference:

1. Numeric missing values are imputed with the configured strategy (median by default).
2. Missing categories are filled with the most frequent training category.
3. `Category` is one-hot encoded; unknown categories do not create extra columns.
4. Numeric features are standardized.
5. Numeric outliers are capped using IQR bounds computed from training data (default).
6. `Case_ID` and `Risk_Level` are not passed into the predictor.

The final application model fits preprocessing only on the training split. During cross-validation, each fold now fits its own preprocessing pipeline on that fold's training portion, preventing validation-fold statistics from leaking into preprocessing. The held-out test labels are used only for final metrics.

### Training, validation, and test

- **Training data** is used to estimate preprocessing parameters and fit each classifier.
- **Cross-validation** repeatedly holds out a different stratified group fold from the training data. Identical feature vectors stay together, and each fold refits preprocessing from its training portion. Its average and standard deviation estimate performance and stability on unseen training feature combinations. It is used to select the model.
- **Test data** remains untouched until model evaluation. Duplicate test feature vectors already seen in training are excluded, duplicate test vectors are counted once, and remaining test metrics are a final report—not the model-selection criterion.

The inputs are balanced across the three labels, but class balance does not prove that labels reflect real-world prevalence. Repeated cases may also make metrics optimistic if duplicate records are treated as independent observations.

## 4. Algorithms and model selection

The application trains three classifiers using the same prepared inputs:

| Algorithm | Plain-English explanation | Why it is included |
|---|---|---|
| K-Nearest Neighbors (KNN) | Finds nearby historical training examples and votes among their classes. | Provides a similarity-based baseline and supports nearest-case retrieval. Feature scaling matters because distance is used. |
| Support Vector Machine (SVM) | Finds separating boundaries between classes; the default RBF kernel can model nonlinear boundaries. | A useful nonlinear classifier for standardized, tabular features. |
| Decision Tree | Repeatedly splits data using feature thresholds until it assigns a class. | Provides a compact, inspectable rule path and feature-importance summary. |

The current model manager selects the highest **five-fold cross-validation macro F1**. Macro F1 calculates F1 separately for each class and averages the classes equally, so the large class does not dominate the selection. High-risk recall is also reported because failing to identify a high-risk case can matter more than a false alarm. Accuracy alone is not used to choose the model.

The measured default run on the supplied files is shown below. These values were captured from actual command output and are also written to `backend/models_cache/experiment_results.json`; the command does not rewrite documentation. They must be interpreted as reconstruction of the target-generation rule given the direct `Severity` leakage described above.

| Model | CV macro F1 (mean ± SD) | Test accuracy | Test macro F1 | Test High recall |
|---|---:|---:|---:|---:|
| KNN | 0.9814 ± 0.0014 | 0.9519 | 0.9507 | 0.945 |
| SVM (RBF) | 0.9965 ± 0.0009 | 0.9927 | 0.9923 | 0.991 |
| Decision Tree (Gini, depth 5) | 1.0000 ± 0.0000 | 1.0000 | 1.0000 | 1.000 |

The Decision Tree is selected because its validation macro F1 is highest, not because accuracy alone is highest. The comparison table and detailed metrics in `README.md` are grounded in the run output, not estimated or copied from the reference project.

### Metrics

| Metric | Meaning |
|---|---|
| Accuracy | Fraction of all predictions that match the known label |
| Precision | Of predictions assigned to a class, fraction that are correct |
| Recall | Of examples belonging to a class, fraction correctly found |
| F1 | Harmonic balance between precision and recall |
| Macro average | Calculate each class's score separately and average equally |
| ROC-AUC (one-vs-rest) | How well class probabilities rank one class above the others across thresholds |
| Confusion matrix | Counts of actual-versus-predicted class pairs |
| Cross-validation standard deviation | Variation in a metric across folds; lower can indicate more stable results |

## 5. Analysis and visualizations

Open `ML_Model/src/main.ipynb` for a complete reproducible analysis. It contains:

1. Dataset loading and schema checks.
2. Data types, missing values, exact duplicates, duplicate IDs, and train/test overlap checks.
3. Target and category counts, numerical distributions, IQR outlier counts, and numerical correlations.
4. Numerical feature comparisons by target class.
5. Backend preprocessing and model fitting.
6. Cross-validation and a live/test comparison table.
7. Confusion matrix, High-risk ROC/precision-recall curves, model score charts, and Decision Tree feature importance.
8. Example held-out predictions and limitations.

The data plots describe the supplied observations; correlations do not demonstrate causation. Tree impurity importance indicates how the tree uses inputs and is not a causal explanation.

## 6. How prediction works

1. The React assessment form sends a JSON object to the FastAPI endpoint.
2. Pydantic checks the request shape and numeric limits; backend validation checks the configured category and features.
3. `ModelManager` transforms values using the fitted preprocessor, then asks the selected classifier for a risk label and probabilities.
4. Probabilities are combined into a score using the configured weights: `P(Low) * 15 + P(Medium) * 55 + P(High) * 95`.
5. The response also contains predictions from the other models, similar training cases, Decision Tree path, and contributing-factor summaries.
6. The frontend presents the response. Saved assessment history is stored separately in SQLite.

The backend loads only its fixed, application-managed `backend/models_cache/risk_models_v1.joblib` artifact. It checks a format version and a fingerprint of the dataset and model settings; if the artifact is missing or does not match, it retrains and replaces the artifact. The retraining API explicitly forces training. Do not load joblib/pickle files supplied by an untrusted user; deserializing such files can execute code.

## 7. Source tree and file responsibilities

```text
RiskChecker/
|-- api/
|   `-- index.py                 Serverless API entry point
|-- backend/
|   |-- app.py                   FastAPI routes, schemas, validation boundary
|   |-- config.py                Dataset paths, feature metadata, model settings
|   |-- database.py              SQLite assessment-history storage
|   |-- risk_assessment.db       Runtime history database (ignored)
|   |-- models_cache/            Generated model artifact and experiment report (ignored)
|   |-- data_generator.py        Synthetic sample-data generator
|   |-- build_realtime_dataset.py NVD/CVSS feed transformation
|   |-- train.py                 Standalone model training and JSON report command
|   |-- data/                    Supplied training, test, and historical CSVs
|   |-- evaluation/
|   |   |-- metrics.py           Classification metrics and confusion matrices
|   |   `-- cross_validator.py   Stratified fold evaluation
|   |-- explainability/
|   |   |-- reasoning.py         Risk score and contributing-factor calculations
|   |   `-- what_if.py           Baseline-versus-modified assessment
|   |-- models/
|   |   |-- base_model.py        Classifier interface
|   |   |-- knn_model.py         KNN classifier and similar-case retrieval
|   |   |-- svm_model.py         SVM classifier and boundary helper
|   |   |-- decision_tree_model.py Tree, importances, and decision paths
|   |   `-- model_manager.py     Training, selection, inference, and artifact cache
|   |-- preprocessing/
|   |   |-- pipeline.py          Imputation, encoding, scaling, outlier handling
|   |   `-- validation.py        Risk input validation
|   `-- test_*.py                Backend smoke and ML pipeline tests
|-- frontend/
|   |-- src/App.jsx              React application and routes
|   |-- src/api.js               API client
|   |-- src/pages/               Assessment, dashboard, analysis, history pages
|   `-- src/components/          Shared charts, metrics, and UI components
|-- ML_Model/src/main.ipynb      Reproducible dataset analysis and model comparison
|-- requirements.txt             Python app and notebook dependencies
|-- run.py                       Unified build-and-serve entry point
|-- start_backend.py             Backend development entry point
`-- PROJECT_GUIDE.md             This beginner-oriented guide
```

The model cache, JSON experiment report, SQLite runtime database, frontend build output, Python caches, and downloaded NVD feed files are ignored by Git.

## 8. API and frontend

The service is a React/Vite frontend and a FastAPI JSON API. Useful routes include:

| Method and route | Purpose |
|---|---|
| `GET /api/health` | Health and model initialization status |
| `GET /api/config` | Categories, feature metadata, defaults, and allowed ranges |
| `GET /api/summary` | Dataset summary, model ranking, and scores |
| `POST /api/assess` | Assess a risk case |
| `POST /api/what-if` | Compare original and modified inputs |
| `GET /api/models` | Model evaluations, cross-validation, tree and importances |
| `POST /api/retrain` | Force a model retraining using supplied settings |
| `GET /api/dataset` | Dataset summary and paginated rows |
| `GET /api/decision-boundary` | SVM boundary data for the analysis page |
| `/api/history` | Save, list, and delete assessment history |

Example request:

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

The response includes `predicted_risk`, `risk_score`, `confidence`, class `probabilities`, `selected_model`, `all_model_predictions`, `similar_cases`, `decision_tree_path`, `contributing_factors`, and `feature_importances`. Invalid or out-of-range requests are rejected rather than passed directly to the classifiers.

## 9. Install and run

Use Python 3.10 or newer (the repository was exercised locally with Python 3.11), Node.js/npm, and Windows PowerShell commands below.

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

The unified service is available at `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`. `python run.py` builds the frontend if `frontend/dist` is absent. For frontend development, run `npm run dev` from `frontend/` and run the backend separately with `python start_backend.py`.

### Train and reproduce the analysis

Run from the repository root:

```powershell
python backend\train.py
```

This explicitly retrains the models, performs fold-local preprocessing and five-fold cross-validation, evaluates the held-out test set, writes a versioned artifact to `backend/models_cache/`, and saves the measured summary to `backend/models_cache/experiment_results.json`. To reuse a matching artifact instead:

```powershell
python backend\train.py --reuse-cache
```

To run the notebook interactively:

```powershell
python -m notebook ML_Model\src\main.ipynb
```

To execute it from top to bottom in a clean kernel:

```powershell
python -m nbconvert --to notebook --execute --output main.executed.ipynb --output-dir backend\models_cache ML_Model\src\main.ipynb
```

The notebook retrains and refreshes the local model artifact. It does not download external data; the supplied CSV files are required.

## 10. Testing and troubleshooting

Run the focused data/preprocessing/metrics/cross-validation tests:

```powershell
python backend\test_ml_pipeline.py
```

Run the API smoke/integration checks (the first run may train models if there is no matching cache):

```powershell
python backend\test_all_endpoints.py
```

Build and lint the frontend from its directory:

```powershell
Set-Location frontend
npm run build
npm run lint
```

Common issues:

- **Python package import errors:** activate the virtual environment and install `requirements.txt` from the repository root.
- **Slow first startup:** initial model fitting and five-fold cross-validation are computationally heavier; subsequent startup reuses a matching versioned cache.
- **Cache not reused:** training/test CSV bytes and settings are fingerprinted; changing either correctly triggers retraining.
- **Notebook cannot find files:** start Jupyter from the repository root, or open the notebook located under `ML_Model/src`.
- **Frontend does not load:** build it with `npm run build` inside `frontend`, then restart `python run.py`.
- **Unexpected score quality:** inspect repeated IDs, target provenance, High-risk recall, and confusion matrix; do not infer real-world reliability from a balanced dataset alone.

## 11. Limitations and future work

- Duplicate identifiers and rows reduce the effective sample size and may overweight repeated examples.
- Dataset provenance/version and a documented independent real-world validation cohort are absent.
- Risk dimensions and target labels are derived from common source fields; the direct `Severity` label leakage makes strong metrics reflect the construction rule.
- Balanced classes do not represent operational class prevalence. Precision, calibration, thresholds, and false-alarm costs may change in deployment.
- Risk assessment requires human review and domain-specific policy; this model does not replace expert judgment.
- Useful next steps include evaluating with independent labels that are not generated from `Severity`, deduplicating with domain approval, recording immutable source manifests, obtaining independently labeled cases, calibrating probabilities, selecting thresholds with stakeholders, and monitoring drift and subgroup performance.
