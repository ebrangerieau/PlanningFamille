import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Identity, SessionInfo } from '../types';

const UNPAIRED: SessionInfo = { paired: false };

export function useIdentity() {
  const [session, setSession] = useState<SessionInfo>(UNPAIRED);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session');
      if (!response.ok) throw new Error('Session indisponible');
      setSession(await response.json() as SessionInfo);
    } catch {
      setSession(UNPAIRED);
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const pairDevice = useCallback(async (token: string, label: string) => {
    const response = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, label }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Appairage impossible');
    window.history.replaceState({}, '', window.location.pathname);
    await refreshSession();
  }, [refreshSession]);

  const unpairDevice = useCallback(async () => {
    await fetch('/api/session/unpair', { method: 'POST' }).catch(() => undefined);
    setSession(UNPAIRED);
  }, []);

  const verifyParentPin = useCallback(async (pin: string) => {
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'PIN incorrect');
    setSession(current => ({ ...current, adminUnlocked: true }));
    return true;
  }, []);

  const lockSettings = useCallback(async () => {
    await fetch('/api/auth/lock', { method: 'POST' });
    setSession(current => ({ ...current, adminUnlocked: false }));
  }, []);

  const identity = useMemo<Identity | null>(() => {
    if (!session.paired || !session.device) return null;
    return {
      role: session.device.role === 'adult' ? 'parent' : 'shared',
      memberId: null,
    };
  }, [session]);

  return {
    identity,
    role: identity?.role ?? null,
    memberId: null,
    session,
    isSessionLoading,
    pairDevice,
    unpairDevice,
    verifyParentPin,
    lockSettings,
    refreshSession,
  };
}
