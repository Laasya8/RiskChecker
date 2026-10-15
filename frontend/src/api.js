const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { detail: text || `HTTP ${response.status} Error` };
    }

    if (!response.ok) {
      const errorMsg = data.detail?.errors ? data.detail.errors.join(', ') : (data.detail || `Server error (Status ${response.status})`);
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`API error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  getConfig: () => fetchApi('/config'),
  getSummary: () => fetchApi('/summary'),
  assessRisk: (payload) => fetchApi('/assess', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  runWhatIf: (originalInputs, modifiedInputs, chosenModel = 'auto') => fetchApi('/what-if', {
    method: 'POST',
    body: JSON.stringify({
      original_inputs: originalInputs,
      modified_inputs: modifiedInputs,
      chosen_model: chosenModel,
    }),
  }),
  getModelDetails: () => fetchApi('/models'),
  retrainModels: (params) => fetchApi('/retrain', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  getDatasetDetails: (limit = 50, offset = 0, split = 'combined') => fetchApi(`/dataset?limit=${limit}&offset=${offset}&split=${split}`),
  getDecisionBoundary: (feat1 = 'Severity', feat2 = 'Impact') => fetchApi(`/decision-boundary?feat1=${feat1}&feat2=${feat2}`),
  getHistory: (limit = 100) => fetchApi(`/history?limit=${limit}`),
  saveHistory: (payload) => fetchApi('/history', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteHistory: (id) => fetchApi(`/history/${id}`, {
    method: 'DELETE',
  }),
  clearHistory: () => fetchApi('/history', {
    method: 'DELETE',
  }),
};
