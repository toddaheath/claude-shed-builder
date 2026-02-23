import axios from 'axios';
import type {
  Design,
  CreateDesignRequest,
  UpdateDesignRequest,
  BomResponse,
  CostResponse,
  DesignVersion,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
});

export const api = {
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

  downloadStl: (id: string, name: string) => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/designs/${id}/stl`;
    link.download = `${name}.stl`;
    link.click();
  },

  downloadPdf: (id: string, name: string) => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/designs/${id}/pdf`;
    link.download = `${name}.pdf`;
    link.click();
  },

  listVersions: (id: string) =>
    client.get<DesignVersion[]>(`/designs/${id}/versions`).then((r) => r.data),

  createVersion: (id: string, label: string) =>
    client.post<DesignVersion>(`/designs/${id}/versions`, { label }).then((r) => r.data),

  getVersion: (id: string, vid: string) =>
    client.get<DesignVersion>(`/designs/${id}/versions/${vid}`).then((r) => r.data),

  restoreVersion: (id: string, vid: string) =>
    client.post<Design>(`/designs/${id}/versions/${vid}/restore`).then((r) => r.data),
};
