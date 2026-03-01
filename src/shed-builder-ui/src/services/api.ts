import axios from 'axios';
import type {
  Design,
  CreateDesignRequest,
  UpdateDesignRequest,
  BomResponse,
  CostResponse,
  DesignVersion,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
});

const TOKEN_STORAGE = 'shed-builder-token';

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_STORAGE); } catch { return null; }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE, token);
    else localStorage.removeItem(TOKEN_STORAGE);
  } catch { /* ignore */ }
}

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setStoredToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }
    if (err.response?.status === 429) {
      window.dispatchEvent(new CustomEvent('api:rate-limited'));
    }
    return Promise.reject(err);
  }
);

export function extractApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { detail?: string } } }).response;
    if (resp?.data?.detail) return resp.data.detail;
  }
  return fallback;
}

export const api = {
  register: (req: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', req).then((r) => r.data),

  login: (req: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', req).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.post('/auth/change-password', { currentPassword, newPassword }),

  listDesigns: () =>
    client.get<{ items: Design[]; totalCount: number }>('/designs').then((r) => r.data),

  getDesign: (id: string) =>
    client.get<Design>(`/designs/${id}`).then((r) => r.data),

  createDesign: (req: CreateDesignRequest) =>
    client.post<Design>('/designs', req).then((r) => r.data),

  updateDesign: (id: string, req: UpdateDesignRequest) =>
    client.put<Design>(`/designs/${id}`, req).then((r) => r.data),

  deleteDesign: (id: string) =>
    client.delete(`/designs/${id}`),

  getBom: (id: string) =>
    client.get<BomResponse>(`/designs/${id}/bom`).then((r) => r.data),

  getCost: (id: string) =>
    client.get<CostResponse>(`/designs/${id}/cost`).then((r) => r.data),

  downloadStl: async (id: string, name: string) => {
    const res = await client.get(`/designs/${id}/stl`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.stl`;
    link.click();
    URL.revokeObjectURL(url);
  },

  downloadPdf: async (id: string, name: string) => {
    const res = await client.get(`/designs/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },

  listVersions: (id: string, page = 1, pageSize = 100) =>
    client.get<{ items: DesignVersion[]; totalCount: number }>(`/designs/${id}/versions`, { params: { page, pageSize } }).then((r) => r.data.items),

  createVersion: (id: string, label: string) =>
    client.post<DesignVersion>(`/designs/${id}/versions`, { label }).then((r) => r.data),

  getVersion: (id: string, vid: string) =>
    client.get<DesignVersion>(`/designs/${id}/versions/${vid}`).then((r) => r.data),

  restoreVersion: (id: string, vid: string) =>
    client.post<Design>(`/designs/${id}/versions/${vid}/restore`).then((r) => r.data),
};
