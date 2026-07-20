import { useCallback, useEffect, useState } from 'react';
import type { DeviceRole, FamilySummary } from '../types';

type PilotFamily = FamilySummary & { deviceCount: number; disabledAt: string | null };

async function pilotRequest(path: string, key: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Pilot-Key': key,
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Opération impossible');
  return data;
}

export function PilotAdmin() {
  const [key, setKey] = useState(() => window.sessionStorage.getItem('tribu.pilotKey') ?? '');
  const [families, setFamilies] = useState<PilotFamily[]>([]);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [importLegacy, setImportLegacy] = useState(true);

  const loadFamilies = useCallback(async () => {
    if (!key) return;
    setBusy(true);
    setError('');
    try {
      const data = await pilotRequest('/api/pilot/families', key);
      setFamilies(data.families ?? []);
      window.sessionStorage.setItem('tribu.pilotKey', key);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Accès refusé');
    } finally {
      setBusy(false);
    }
  }, [key]);

  useEffect(() => {
    void fetch('/api/pilot/status')
      .then(response => response.json())
      .then(status => setLegacyAvailable(Boolean(status.legacyStateAvailable)))
      .catch(() => undefined);
    if (key) void loadFamilies();
  }, []); // Chargement initial uniquement : le bouton valide les changements de clé.

  const createFamily = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await pilotRequest('/api/pilot/families', key, {
        method: 'POST',
        body: JSON.stringify({ name, pin, importLegacy: legacyAvailable && importLegacy }),
      });
      setName('');
      setPin('');
      await loadFamilies();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création impossible');
      setBusy(false);
    }
  };

  const createInvitation = async (family: PilotFamily, role: DeviceRole) => {
    setBusy(true);
    setError('');
    try {
      const data = await pilotRequest(`/api/pilot/families/${family.id}/invitations`, key, {
        method: 'POST',
        body: JSON.stringify({
          role,
          label: role === 'adult' ? `Téléphone adulte — ${family.name}` : `Écran familial — ${family.name}`,
        }),
      });
      setInviteLink(`${window.location.origin}${data.invitation.path}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invitation impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-display sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Pilote privé</p>
            <h1 className="text-3xl font-bold text-slate-900">Administration La Tribu</h1>
          </div>
          <a href="/" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            Retour au planning
          </a>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-semibold text-slate-700" htmlFor="pilot-key">Clé d’administration du pilote</label>
          <div className="mt-2 flex gap-2">
            <input
              id="pilot-key"
              type="password"
              value={key}
              onChange={event => setKey(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 outline-none focus:border-primary"
              placeholder="PILOT_ADMIN_KEY"
            />
            <button onClick={() => void loadFamilies()} disabled={!key || busy} className="rounded-xl bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
              Ouvrir
            </button>
          </div>
          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </section>

        {families.length > 0 || (!error && key) ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
            <form onSubmit={createFamily} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Créer une famille</h2>
              <label className="mt-4 block text-sm font-semibold" htmlFor="family-name">Nom de la famille</label>
              <input id="family-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 outline-none focus:border-primary" />
              <label className="mt-4 block text-sm font-semibold" htmlFor="family-pin">PIN adulte initial</label>
              <input id="family-pin" type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-center tracking-[0.4em] outline-none focus:border-primary" placeholder="4 à 6 chiffres" />
              {legacyAvailable && (
                <label className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <input type="checkbox" checked={importLegacy} onChange={event => setImportLegacy(event.target.checked)} className="mt-0.5" />
                  <span>Importer le planning mono-famille actuellement présent sur ce serveur.</span>
                </label>
              )}
              <button disabled={busy || !name.trim() || pin.length < 4} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">Créer l’espace</button>
            </form>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Familles du pilote</h2>
              <div className="mt-4 space-y-3">
                {families.length === 0 && <p className="text-sm text-slate-500">Aucune famille créée.</p>}
                {families.map(family => (
                  <article key={family.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{family.name}</h3>
                        <p className="text-xs text-slate-400">{family.deviceCount} appareil(s) actif(s)</p>
                      </div>
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">Active</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void createInvitation(family, 'adult')} disabled={busy} className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary">Inviter un adulte</button>
                      <button type="button" onClick={() => void createInvitation(family, 'display')} disabled={busy} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Appairer un écran</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {inviteLink && (
          <div className="fixed inset-x-4 bottom-4 mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-white p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary">link</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Invitation créée — valable 24 heures et une seule fois</p>
                <p className="mt-1 break-all text-xs text-slate-500">{inviteLink}</p>
                <button onClick={() => void navigator.clipboard.writeText(inviteLink)} className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Copier le lien</button>
              </div>
              <button onClick={() => setInviteLink('')} aria-label="Fermer" className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
