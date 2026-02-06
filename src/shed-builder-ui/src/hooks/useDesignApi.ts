import { useState, useEffect, useCallback } from 'react';
import type { Design, BomResponse, DesignVersion, CreateDesignRequest, UpdateDesignRequest } from '../types';
import { api } from '../services/api';

export function useDesignApi() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [bom, setBom] = useState<BomResponse | null>(null);
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listDesigns();
      setDesigns(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDesign = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const design = await api.getDesign(id);
      setCurrentDesign(design);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDesign = useCallback(async (req: CreateDesignRequest) => {
    const design = await api.createDesign(req);
    setCurrentDesign(design);
    await loadDesigns();
    return design;
  }, [loadDesigns]);

  const updateDesign = useCallback(async (id: string, req: UpdateDesignRequest) => {
    const design = await api.updateDesign(id, req);
    setCurrentDesign(design);
    return design;
  }, []);

  const deleteDesign = useCallback(async (id: string) => {
    await api.deleteDesign(id);
    if (currentDesign?.id === id) setCurrentDesign(null);
    await loadDesigns();
  }, [currentDesign, loadDesigns]);

  const loadBom = useCallback(async (id: string) => {
    const bomData = await api.getBom(id);
    setBom(bomData);
  }, []);

  const loadVersions = useCallback(async (id: string) => {
    const v = await api.listVersions(id);
    setVersions(v);
  }, []);

  const createVersion = useCallback(async (id: string, label: string) => {
    await api.createVersion(id, label);
    await loadVersions(id);
  }, [loadVersions]);

  const restoreVersion = useCallback(async (designId: string, versionId: string) => {
    const design = await api.restoreVersion(designId, versionId);
    setCurrentDesign(design);
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  return {
    designs,
    currentDesign,
    bom,
    versions,
    loading,
    setCurrentDesign,
    loadDesigns,
    loadDesign,
    createDesign,
    updateDesign,
    deleteDesign,
    loadBom,
    loadVersions,
    createVersion,
    restoreVersion,
  };
}
