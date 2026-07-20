import { useEffect, useState } from 'react';
import type { Chore, DeviceRole, DeviceSummary, Member } from '../types';
import { COLOR_KEYS } from '../constants';

interface SettingsPanelProps {
  open: boolean;
  adminUnlocked: boolean;
  currentDeviceId?: string;
  onClose: () => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
}

type SettingsData = {
  family: { name: string };
  members: Member[];
  chores: Chore[];
  devices: DeviceSummary[];
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Opération impossible');
  return data;
}

export function SettingsPanel({ open, adminUnlocked, currentDeviceId, onClose, onVerifyPin }: SettingsPanelProps) {
  const [pin, setPin] = useState('');
  const [data, setData] = useState<SettingsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setData(await api('/api/settings'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chargement impossible');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open && adminUnlocked) void load();
    if (!open) {
      setPin('');
      setError('');
      setInviteLink('');
    }
  }, [open, adminUnlocked]);

  if (!open) return null;

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onVerifyPin(pin);
      setPin('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'PIN incorrect');
    } finally {
      setBusy(false);
    }
  };

  const updateMember = (id: string, name: string) => {
    setData(current => current ? {
      ...current,
      members: current.members.map(member => member.id === id
        ? { ...member, name, initial: name.trim()[0]?.toUpperCase() || '?' }
        : member),
    } : current);
  };

  const addMember = () => {
    setData(current => current ? {
      ...current,
      members: [...current.members, {
        id: `m_${crypto.randomUUID()}`,
        name: 'Nouveau membre',
        initial: 'N',
        colorKey: COLOR_KEYS[current.members.length % COLOR_KEYS.length],
      }],
    } : current);
  };

  const addChore = () => {
    setData(current => current ? {
      ...current,
      chores: [...current.chores, {
        id: `c_${crypto.randomUUID()}`,
        name: 'Nouvelle tâche',
        icon: 'task_alt',
        iconColor: 'text-slate-400',
      }],
    } : current);
  };

  const save = async () => {
    if (!data) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          familyName: data.family.name,
          members: data.members,
          chores: data.chores,
        }),
      });
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Enregistrement impossible');
      setBusy(false);
    }
  };

  const createInvitation = async (role: DeviceRole) => {
    setBusy(true);
    setError('');
    try {
      const result = await api('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setInviteLink(`${window.location.origin}${result.invitation.path}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invitation impossible');
    } finally {
      setBusy(false);
    }
  };

  const revokeDevice = async (device: DeviceSummary) => {
    if (!window.confirm(`Révoquer « ${device.label} » ?`)) return;
    setBusy(true);
    try {
      await api(`/api/devices/${device.id}`, { method: 'DELETE' });
      if (device.id === currentDeviceId) window.location.reload();
      else await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Révocation impossible');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3" role="dialog" aria-modal="true">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Espace adulte</p>
            <h2 className="text-xl font-bold">Paramètres de la famille</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Fermer"><span className="material-symbols-outlined">close</span></button>
        </header>

        {!adminUnlocked ? (
          <form onSubmit={unlock} className="mx-auto w-full max-w-sm p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><span className="material-symbols-outlined text-3xl">lock</span></div>
            <h3 className="mt-4 text-lg font-bold">Code PIN adulte</h3>
            <p className="mt-1 text-sm text-slate-500">Il protège les membres, les tâches, les invitations et les appareils.</p>
            <input autoFocus type="password" inputMode="numeric" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-5 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-primary" placeholder="••••" />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button disabled={busy || pin.length < 4} className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Vérification…' : 'Déverrouiller 15 minutes'}</button>
          </form>
        ) : !data ? (
          <div className="p-10 text-center text-slate-500">{busy ? 'Chargement…' : error || 'Paramètres indisponibles'}</div>
        ) : (
          <div className="overflow-y-auto p-5 sm:p-6">
            {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <section>
              <h3 className="font-bold text-slate-900">Nom de l’espace</h3>
              <input value={data.family.name} onChange={event => setData(current => current ? { ...current, family: { ...current.family, name: event.target.value } } : current)} maxLength={80} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 outline-none focus:border-primary" />
            </section>

            <section className="mt-7">
              <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Participants</h3><button onClick={addMember} disabled={data.members.length >= 12} className="text-sm font-bold text-primary disabled:opacity-40">+ Ajouter</button></div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {data.members.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                    <select value={member.colorKey} onChange={event => setData(current => current ? { ...current, members: current.members.map(item => item.id === member.id ? { ...item, colorKey: event.target.value as Member['colorKey'] } : item) } : current)} className="rounded-lg bg-slate-50 p-2 text-xs">
                      {COLOR_KEYS.map(color => <option key={color} value={color}>{color}</option>)}
                    </select>
                    <input value={member.name} onChange={event => updateMember(member.id, event.target.value)} maxLength={40} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                    <button onClick={() => setData(current => current ? { ...current, members: current.members.filter(item => item.id !== member.id) } : current)} disabled={data.members.length <= 1} className="p-1 text-red-400 disabled:opacity-30" aria-label={`Supprimer ${member.name}`}><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-7">
              <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">Tâches personnalisées</h3><button onClick={addChore} disabled={data.chores.length >= 30} className="text-sm font-bold text-primary disabled:opacity-40">+ Ajouter</button></div>
              <div className="mt-2 space-y-2">
                {data.chores.map(chore => (
                  <div key={chore.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                    <span className="material-symbols-outlined text-slate-400">{chore.icon || 'task_alt'}</span>
                    <input value={chore.name} onChange={event => setData(current => current ? { ...current, chores: current.chores.map(item => item.id === chore.id ? { ...item, name: event.target.value } : item) } : current)} maxLength={80} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                    <button onClick={() => setData(current => current ? { ...current, chores: current.chores.filter(item => item.id !== chore.id) } : current)} disabled={data.chores.length <= 1} className="p-1 text-red-400 disabled:opacity-30" aria-label={`Supprimer ${chore.name}`}><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-7">
              <h3 className="font-bold text-slate-900">Appairer un appareil</h3>
              <p className="mt-1 text-sm text-slate-500">Le lien expire après 24 heures et ne fonctionne qu’une fois.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void createInvitation('adult')} disabled={busy} className="rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary">Inviter un téléphone adulte</button>
                <button onClick={() => void createInvitation('display')} disabled={busy} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">Appairer un écran familial</button>
              </div>
              {inviteLink && <div className="mt-3 rounded-xl bg-green-50 p-3"><p className="break-all text-xs text-green-800">{inviteLink}</p><button onClick={() => void navigator.clipboard.writeText(inviteLink)} className="mt-2 text-xs font-bold text-green-800 underline">Copier le lien</button></div>}
            </section>

            <section className="mt-7">
              <h3 className="font-bold text-slate-900">Appareils autorisés</h3>
              <div className="mt-2 space-y-2">
                {data.devices.map(device => (
                  <div key={device.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="material-symbols-outlined text-slate-400">{device.role === 'adult' ? 'smartphone' : 'tablet'}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{device.label}{device.id === currentDeviceId ? ' (cet appareil)' : ''}</p><p className="text-xs text-slate-400">{device.role === 'adult' ? 'Adulte' : 'Écran familial'}</p></div>
                    <button onClick={() => void revokeDevice(device)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Révoquer</button>
                  </div>
                ))}
              </div>
            </section>

            <div className="sticky bottom-0 mt-7 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4">
              <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold text-slate-700">Annuler</button>
              <button onClick={() => void save()} disabled={busy} className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
