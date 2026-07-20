import { useMemo, useState } from 'react';

interface PairingGateProps {
  onPair: (token: string, label: string) => Promise<void>;
}

export function PairingGate({ onPair }: PairingGateProps) {
  const invitationToken = useMemo(
    () => new URLSearchParams(window.location.search).get('invite') ?? '',
    [],
  );
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handlePair = async () => {
    if (!invitationToken || busy) return;
    setBusy(true);
    setError('');
    try {
      await onPair(invitationToken, label);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Appairage impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4 font-display">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary text-white">
          <span className="material-symbols-outlined text-3xl">family_history</span>
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">Bienvenue dans La Tribu</h1>

        {invitationToken ? (
          <>
            <p className="mt-2 text-center text-sm text-slate-500">
              Cette invitation va associer cet appareil à votre espace familial.
            </p>
            <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="device-label">
              Nom de l’appareil <span className="font-normal text-slate-400">(facultatif)</span>
            </label>
            <input
              id="device-label"
              value={label}
              onChange={event => setLabel(event.target.value)}
              maxLength={60}
              placeholder="Ex. Tablette de la cuisine"
              className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-primary"
            />
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="button"
              onClick={handlePair}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? 'Appairage en cours…' : 'Associer cet appareil'}
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              L’invitation est personnelle, temporaire et utilisable une seule fois.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-center text-sm leading-6 text-slate-500">
              Cet appareil n’est pas encore associé à une famille. Demandez à un adulte le QR code ou le lien d’invitation.
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
              Une fois appairé, cet appareil ouvrira directement le planning sans mot de passe.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
