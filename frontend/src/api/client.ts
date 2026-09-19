const API_BASE = 'https://materialdna-api.vercel.app/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }
  return res.json();
}

// Materials
export const getAnalytics = () => request<any>('/analytics');
export const getMaterials = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return request<any>(`/materials?${qs}`);
};
export const getMaterial = (id: string) => request<any>(`/materials/${id}`);
export const getCategories = () => request<string[]>('/materials/categories');
export const getCpses = () => request<string[]>('/materials/cpses');

// Matching
export const runMatch = (data: any) =>
  request<any>('/match', { method: 'POST', body: JSON.stringify(data) });
export const getMatch = (matchId: string) =>
  request<any>(`/matches/${matchId}`);

// Reviews
export const getReviews = (status = '') =>
  request<any[]>(`/reviews${status ? `?status=${status}` : ''}`);
export const approveReview = (id: string, data: any = {}) =>
  request<any>(`/reviews/${id}/approve`, { method: 'POST', body: JSON.stringify(data) });
export const rejectReview = (id: string, data: any = {}) =>
  request<any>(`/reviews/${id}/reject`, { method: 'POST', body: JSON.stringify(data) });

// Identities
export const getIdentities = () => request<any[]>('/material-identities');
export const createIdentity = (data: any) =>
  request<any>('/material-identities', { method: 'POST', body: JSON.stringify(data) });

// Audit
export const getAudit = (limit = 50) => request<any[]>(`/audit?limit=${limit}`);

// Upload
export const uploadPreview = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/materials/upload/preview`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

export const uploadMaterials = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/materials/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};
