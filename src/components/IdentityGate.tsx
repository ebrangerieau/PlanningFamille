import React, { useState } from 'react';
import type { Member } from '../types';
import { COLOR_MAP } from '../constants';

type Step = 'pick' | 'pin-verify' | 'pin-setup';

interface IdentityGateProps {
  members:         Member[];
  pinConfigured:   boolean | null;
  onChild:         (memberId: string) => void;
  onVisitor:       () => void;
  onVerifyPin:     (pin: string) => Promise<boolean>;
  onSetupPin:      (pin: string) => Promise<boolean>;
}

export function IdentityGate({
  members, pinConfigured, onChild, onVisitor, onVerifyPin, onSetupPin,
}: IdentityGateProps) {
  const [step,      setStep]      = useState<Step>('pick');
  const [pin,       setPin]       = useState('');
  const [pin2,      setPin2]      = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [busy,      setBusy]      = useState(false);

  const resetPinForm = () => { setPin(''); setPin2(''); setError(null); };

  const goParent = () => {
    resetPinForm();
    setStep(pinConfigured ? 'pin-verify' : 'pin-setup');
  };

  const goBack = () => { resetPinForm(); setStep('pick'); };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await onVerifyPin(pin);
    setBusy(false);
    if (!ok) { setError('PIN incorrect'); setPin(''); }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('Le PIN doit faire 4 chiffres'); return;
    }
    if (pin !== pin2) { setError('Les deux PIN ne correspondent pas'); return; }
    setBusy(true);
    const ok = await onSetupPin(pin);
    setBusy(false);
    if (!ok) setError('Impossible d’enregistrer le PIN');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background-light flex items-center justify-center p-4 font-display">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        {step === 'pick' && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Qui es-tu ?</h2>
            <p className="text-sm text-slate-500 mb-5">
              Choisis ton identité pour utiliser le planning.
            </p>

            <div className="space-y-2 mb-4">
              {members.map(m => {
                const c = COLOR_MAP[m.colorKey];
                return (
                  <button
                    key={m.id}
                    onClick={() => onChild(m.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border-2 ${c.border} ${c.cardBg} hover:scale-[1.01] active:scale-100 transition`}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold ${c.bg}`}>
                      {m.initial}
                    </div>
                    <span className={`font-semibold ${c.text}`}>{m.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={goParent}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary text-white font-semibold hover:bg-primary/90 transition"
              >
                <span className="material-symbols-outlined text-lg">shield_person</span>
                Parent
              </button>
              <button
                onClick={onVisitor}
                className="flex-1 rounded-xl px-4 py-3 bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
              >
                Visiteur
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Parent = contrôle total (PIN). Enfant = valide ses propres tâches. Visiteur = lecture seule.
            </p>
          </>
        )}

        {step === 'pin-verify' && (
          <form onSubmit={handleVerify}>
            <button type="button" onClick={goBack} className="text-sm text-slate-500 hover:text-slate-700 mb-3">
              ← Retour
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">PIN parent</h2>
            <p className="text-sm text-slate-500 mb-5">Saisis le code à 4 chiffres.</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
              className="w-full text-center text-2xl tracking-widest rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none px-4 py-3 mb-3"
              placeholder="••••"
            />
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={busy || pin.length !== 4}
              className="w-full rounded-xl px-4 py-3 bg-primary text-white font-semibold disabled:opacity-50 hover:bg-primary/90 transition"
            >
              {busy ? 'Vérification…' : 'Valider'}
            </button>
          </form>
        )}

        {step === 'pin-setup' && (
          <form onSubmit={handleSetup}>
            <button type="button" onClick={goBack} className="text-sm text-slate-500 hover:text-slate-700 mb-3">
              ← Retour
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Définir le PIN parent</h2>
            <p className="text-sm text-slate-500 mb-5">
              Aucun PIN n’est configuré. Choisis un code à 4 chiffres —
              tu devras le retaper pour passer en mode parent.
            </p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
              className="w-full text-center text-2xl tracking-widest rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none px-4 py-3 mb-2"
              placeholder="Nouveau PIN"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin2}
              onChange={e => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
              className="w-full text-center text-2xl tracking-widest rounded-xl border-2 border-slate-200 focus:border-primary focus:outline-none px-4 py-3 mb-3"
              placeholder="Confirmation"
            />
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={busy || pin.length !== 4 || pin2.length !== 4}
              className="w-full rounded-xl px-4 py-3 bg-primary text-white font-semibold disabled:opacity-50 hover:bg-primary/90 transition"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer le PIN'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
