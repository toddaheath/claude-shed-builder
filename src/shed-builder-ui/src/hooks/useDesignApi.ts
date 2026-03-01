import { useState, useEffect, useCallback } from 'react';
import type { Design, BomResponse, DesignVersion, CreateDesignRequest, UpdateDesignRequest } from '../types';
import { api } from '../services/api';

export function useDesignApi() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [currentDesign, setCurrentDesign] = useState<Design | null>(null);
  const [bom, setBom] = useState<BomResponse | null>(null);
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const loadDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listDesigns();
      setDesigns(result.items);
    } catch {
      setError('Failed to load designs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDesign = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const design = await api.getDesign(id);
      setCurrentDesign(design);
    } catch {
      setError('Failed to load design.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDesign = useCallback(async (req: CreateDesignRequest) => {
    try {
      const design = await api.createDesign(req);
      setCurrentDesign(design);
      await loadDesigns();
      return design;
    } catch {
      setError('Failed to create design.');
      return null;
    }
  }, [loadDesigns]);

  const updateDesign = useCallback(async (id: string, req: UpdateDesignRequest) => {
    const design = await api.updateDesign(id, req);
    setCurrentDesign(design);
    return design;
  }, []);

  const deleteDesign = useCallback(async (id: string) => {
    try {
      await api.deleteDesign(id);
      if (currentDesign?.id === id) setCurrentDesign(null);
      await loadDesigns();
    } catch {
      setError('Failed to delete design.');
    }
  }, [currentDesign, loadDesigns]);

  const loadBom = useCallback(async (id: string) => {
    try {
      const bomData = await api.getBom(id);
      setBom(bomData);
    } catch {
      setError('Failed to load bill of materials.');
    }
  }, []);

  const loadVersions = useCallback(async (id: string) => {
    try {
      const v = await api.listVersions(id);
      setVersions(v);
    } catch {
      setError('Failed to load versions.');
    }
  }, []);

  const createVersion = useCallback(async (id: string, label: string) => {
    try {
      await api.createVersion(id, label);
      await loadVersions(id);
    } catch {
      setError('Failed to save version.');
    }
  }, [loadVersions]);

  const restoreVersion = useCallback(async (designId: string, versionId: string) => {
    try {
      const design = await api.restoreVersion(designId, versionId);
      setCurrentDesign(design);
    } catch {
      setError('Failed to restore version.');
    }
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
    error,
    clearError,
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
