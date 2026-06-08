import axios from 'axios'

// Use Vite proxy in dev (/api → localhost:8000); override with VITE_API_BASE if needed
const BASE = import.meta.env.VITE_API_BASE ?? ''

export const api = {
  // Data
  getAttractions: () => axios.get(`${BASE}/api/attractions`).then(r => r.data),
  getGraph:       () => axios.get(`${BASE}/api/graph`).then(r => r.data),

  // CO2 Search
  runSearch: (payload) => axios.post(`${BASE}/api/search/run`, payload).then(r => r.data),
  compareSearch: (payload) => axios.post(`${BASE}/api/search/compare`, payload).then(r => r.data),

  // CO3 CSP
  scheduleCSP: (payload) => axios.post(`${BASE}/api/csp/schedule`, payload).then(r => r.data),

  // CO4 Decision
  computeUtility: (payload)  => axios.post(`${BASE}/api/decision/utility`, payload).then(r => r.data),
  runMinimax:     (payload)  => axios.post(`${BASE}/api/decision/minimax`, payload).then(r => r.data),
  expectedUtility:(payload)  => axios.post(`${BASE}/api/decision/expected-utility`, payload).then(r => r.data),

  // CO5 Probabilistic
  bayesUpdate:    (payload)  => axios.post(`${BASE}/api/probabilistic/bayes-update`, payload).then(r => r.data),
  infer:          (payload)  => axios.post(`${BASE}/api/probabilistic/infer`, payload).then(r => r.data),
  hmmTrack:       (payload)  => axios.post(`${BASE}/api/probabilistic/hmm`, payload).then(r => r.data),

  // CO6 Hybrid
  hybridPlan: (payload) => axios.post(`${BASE}/api/hybrid/plan`, payload).then(r => r.data),
}
