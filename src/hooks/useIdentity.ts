import { useCallback, useEffect, useState } from 'react';
import type { Identity, Role } from '../types';
import { IDENTITY_STORAGE_KEY } from '../constants';

const VISITOR: Identity = { role: 'visitor', memberId: null };

function readStored(): Identity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (parsed.role === 'parent' || parsed.role === 'child' || parsed.role === 'visitor') {
      return {
        role:     parsed.role,
        memberId: typeof parsed.memberId === 'string' ? parsed.memberId : null,
      };
    }
  } catch {
    /* noop */
  }
  return null;
}

function writeStored(identity: Identity | null) {
  if (typeof window === 'undefined') return;
  if (!identity) window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
  else           window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
}

export function useIdentity() {
  // `null` = pas encore choisi → on affiche l'écran d'accueil.
  const [identity,     setIdentityState] = useState<Identity | null>(() => readStored());
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);

  // Statut serveur : un PIN parent est-il déjà configuré ?
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/status')
      .then(r => r.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setPinConfigured(Boolean(data.configured));
      })
      .catch(() => { if (!cancelled) setPinConfigured(false); });
    return () => { cancelled = true; };
  }, []);

  const setIdentity = useCallback((next: Identity) => {
    setIdentityState(next);
    writeStored(next);
  }, []);

  const clearIdentity = useCallback(() => {
    setIdentityState(null);
    writeStored(null);
  }, []);

  const setVisitor = useCallback(() => setIdentity(VISITOR), [setIdentity]);

  const setChild = useCallback((memberId: string) => {
    setIdentity({ role: 'child', memberId });
  }, [setIdentity]);

  const verifyParentPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.ok) {
        setIdentity({ role: 'parent', memberId: null });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setIdentity]);

  const setupParentPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/setup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.ok) {
        setPinConfigured(true);
        setIdentity({ role: 'parent', memberId: null });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setIdentity]);

  const role: Role | null = identity?.role ?? null;

  return {
    identity,
    role,
    memberId:        identity?.memberId ?? null,
    pinConfigured,
    setVisitor,
    setChild,
    verifyParentPin,
    setupParentPin,
    clearIdentity,
  };
}
