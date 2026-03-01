import { useEffect, useRef, useCallback, useState } from 'react';
import type { SaveStatus, UpdateDesignRequest } from '../types';
import { api } from '../services/api';

export function useAutoSave(designId: string | null, data: UpdateDesignRequest | null) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const [prevDesignId, setPrevDesignId] = useState(designId);

  if (prevDesignId !== designId) {
    setPrevDesignId(designId);
    setStatus('idle');
  }

  useEffect(() => {
    lastSavedRef.current = '';
  }, [designId]);

  const save = useCallback(async (id: string, req: UpdateDesignRequest) => {
    setStatus('saving');
    try {
      await api.updateDesign(id, req);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!designId || !data) return;

    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = serialized;
      save(designId, data);
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [designId, data, save]);

  return status;
}
