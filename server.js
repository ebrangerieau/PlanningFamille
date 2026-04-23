import express from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const DATA_DIR     = join(__dirname, 'data');
const DATA_FILE    = join(DATA_DIR, 'state.json');
const SECRETS_FILE = join(DATA_DIR, 'secrets.json');
const PORT         = process.env.PORT ?? 3051;
const IS_PROD      = process.env.NODE_ENV === 'production';

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── State ────────────────────────────────────────────────────────────────────

function loadState() {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    console.warn('[server] Fichier state.json illisible, état réinitialisé.');
    return {};
  }
}

function saveState(state) {
  writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ── Secrets (PIN parent) ─────────────────────────────────────────────────────

const SCRYPT_KEY_LEN = 64;

function loadSecrets() {
  if (!existsSync(SECRETS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(SECRETS_FILE, 'utf-8'));
  } catch {
    console.warn('[server] Fichier secrets.json illisible.');
    return {};
  }
}

function saveSecrets(secrets) {
  writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), 'utf-8');
}

function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, SCRYPT_KEY_LEN).toString('hex');
  return { salt, hash };
}

function verifyPinHash(pin, record) {
  if (!record?.salt || !record?.hash) return false;
  const expected = Buffer.from(record.hash, 'hex');
  const actual   = scryptSync(pin, record.salt, SCRYPT_KEY_LEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

// ── Rate limit (par IP, en mémoire) ──────────────────────────────────────────

const MAX_FAILURES     = 5;
const LOCKOUT_MS       = 5 * 60 * 1000;
const failures         = new Map(); // ip -> { count, until }

function checkRateLimit(ip) {
  const entry = failures.get(ip);
  if (!entry) return { blocked: false };
  if (entry.until > Date.now()) {
    return { blocked: true, retryMs: entry.until - Date.now() };
  }
  if (entry.until !== 0) failures.delete(ip);
  return { blocked: false };
}

function registerFailure(ip) {
  const entry = failures.get(ip) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) {
    entry.until = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  failures.set(ip, entry);
}

function registerSuccess(ip) {
  failures.delete(ip);
}

// ── App ──────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '1mb' }));

// ── API state ────────────────────────────────────────────────────────────────

app.get('/api/state', (_req, res) => {
  res.json(loadState());
});

app.post('/api/state', (req, res) => {
  try {
    saveState(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('[server] Erreur lors de la sauvegarde :', err);
    res.status(500).json({ ok: false, error: 'Sauvegarde impossible' });
  }
});

// ── API auth (anti-triche parent) ────────────────────────────────────────────

app.get('/api/auth/status', (_req, res) => {
  const secrets = loadSecrets();
  res.json({ configured: Boolean(secrets.parentPin) });
});

app.post('/api/auth/setup', (req, res) => {
  const secrets = loadSecrets();
  if (secrets.parentPin) {
    return res.status(409).json({ ok: false, error: 'PIN déjà configuré' });
  }
  const { pin } = req.body ?? {};
  if (!isValidPin(pin)) {
    return res.status(400).json({ ok: false, error: 'PIN invalide (4 chiffres requis)' });
  }
  secrets.parentPin = hashPin(pin);
  saveSecrets(secrets);
  res.json({ ok: true });
});

app.post('/api/auth/verify', (req, res) => {
  const ip    = req.ip;
  const gate  = checkRateLimit(ip);
  if (gate.blocked) {
    return res.status(429).json({ ok: false, error: 'Trop d’essais', retryMs: gate.retryMs });
  }
  const secrets = loadSecrets();
  if (!secrets.parentPin) {
    return res.status(409).json({ ok: false, error: 'Aucun PIN configuré' });
  }
  const { pin } = req.body ?? {};
  if (!isValidPin(pin) || !verifyPinHash(pin, secrets.parentPin)) {
    registerFailure(ip);
    return res.status(401).json({ ok: false });
  }
  registerSuccess(ip);
  res.json({ ok: true });
});

app.post('/api/auth/change', (req, res) => {
  const ip   = req.ip;
  const gate = checkRateLimit(ip);
  if (gate.blocked) {
    return res.status(429).json({ ok: false, error: 'Trop d’essais', retryMs: gate.retryMs });
  }
  const secrets = loadSecrets();
  if (!secrets.parentPin) {
    return res.status(409).json({ ok: false, error: 'Aucun PIN configuré' });
  }
  const { oldPin, newPin } = req.body ?? {};
  if (!isValidPin(newPin)) {
    return res.status(400).json({ ok: false, error: 'Nouveau PIN invalide' });
  }
  if (!isValidPin(oldPin) || !verifyPinHash(oldPin, secrets.parentPin)) {
    registerFailure(ip);
    return res.status(401).json({ ok: false });
  }
  registerSuccess(ip);
  secrets.parentPin = hashPin(newPin);
  saveSecrets(secrets);
  res.json({ ok: true });
});

// ── Fichiers statiques (production uniquement) ────────────────────────────────

if (IS_PROD) {
  const distDir = join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] Démarré sur le port ${PORT} (${IS_PROD ? 'production' : 'développement'})`);
});
