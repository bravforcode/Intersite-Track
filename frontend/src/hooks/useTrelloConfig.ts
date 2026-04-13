import { useState, useEffect, useCallback } from 'react';
import type { TrelloConfigDisplay, TrelloConfigForm, TrelloConnectionTestResult } from '../types/trello';
import * as trelloService from '../services/trelloService';

export function useTrelloConfig() {
  const [config, setConfig] = useState<TrelloConfigDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TrelloConnectionTestResult | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await trelloService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดการตั้งค่าล้มเหลว');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = useCallback(async (form: TrelloConfigForm) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await trelloService.saveConfig(form);
      setConfig(updated);
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'บันทึกล้มเหลว';
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const testConn = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await trelloService.testConnection();
      setTestResult(result);
      return result;
    } catch (err) {
      const result: TrelloConnectionTestResult = {
        success: false,
        message: err instanceof Error ? err.message : 'ทดสอบล้มเหลว',
      };
      setTestResult(result);
      return result;
    } finally {
      setTesting(false);
    }
  }, []);

  return { config, loading, saving, testing, error, testResult, save, testConn, refetch: fetchConfig };
}
