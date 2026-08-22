/**
 * Nyaya Setu - API Client Service
 * Connects frontend UI to FastAPI backend endpoints with fallback handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message, model_loaded: false };
  }
}

export async function fetchReferenceData() {
  try {
    const res = await fetch(`${API_BASE_URL}/reference_data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Using local reference fallback:', err);
    return null;
  }
}

export async function scoreSingleCase(caseData) {
  const res = await fetch(`${API_BASE_URL}/score_case`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(caseData),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `Server error (${res.status})` }));
    throw new Error(errData.detail || `Scoring failed with status ${res.status}`);
  }

  return await res.json();
}

export async function scoreBatchCases(casesArray) {
  const res = await fetch(`${API_BASE_URL}/score_batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ cases: casesArray }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `Server error (${res.status})` }));
    throw new Error(errData.detail || `Batch scoring failed (${res.status})`);
  }

  return await res.json();
}

export async function uploadCauseListCSV(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/upload_cause_list`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `Upload failed (${res.status})` }));
    throw new Error(errData.detail || `Upload failed with status ${res.status}`);
  }

  return await res.json();
}

