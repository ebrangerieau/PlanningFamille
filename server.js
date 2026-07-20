import express from 'express';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const FAMILIES_DIR = join(DATA_DIR, 'families');
const CATALOG_FILE = join(DATA_DIR, 'catalog.json');
const LEGACY_STATE_FILE = join(DATA_DIR, 'state.json');
const PORT = Number(process.env.PORT ?? 3051);
const IS_PROD = process.env.NODE_ENV === 'production';
const PILOT_ADMIN_KEY = process.env.PILOT_ADMIN_KEY ?? '';
const SESSION_COOKIE = 'tribu_session';
const SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const ADMIN_UNLOCK_MS = 15 * 60 * 1000;
const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const SCRYPT_KEY_LEN = 64;

mkdirSync(FAMILIES_DIR, { recursive: true });

const DEFAULT_MEMBERS = [
  { id: 'm1', name: 'Adulte 1', initial: 'A', colorKey: 'blue' },
  { id: 'm2', name: 'Adulte 2', initial: 'A', colorKey: 'purple' },
  { id: 'm3', name: 'Enfant 1', initial: 'E', colorKey: 'pink' },
  { id: 'm4', name: 'Enfant 2', initial: 'E', colorKey: 'orange' },
];

const DEFAULT_CHORES = [
  { id: 'c1', name: 'Mettre la table', icon: 'restaurant', iconColor: 'text-orange-400' },
  { id: 'c2', name: 'Débarrasser la table', icon: 'cleaning_services', iconColor: 'text-green-400' },
  { id: 'c3', name: 'Débarrasser le lave-vaisselle', icon: 'flatware', iconColor: 'text-blue-400' },
  { id: 'c4', name: 'Faire chauffer le repas', icon: 'microwave', iconColor: 'text-red-400' },
  { id: 'c5', name: 'Nettoyer le plan de travail', icon: 'countertops', iconColor: 'text-cyan-400' },
  { id: 'c6', name: "Passer l'aspirateur après repas", icon: 'vacuum', iconColor: 'text-purple-400' },
];

function nowIso() {
  return new Date().toISOString();
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch (error) {
    console.error(`[server] Fichier JSON illisible : ${file}`, error);
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf-8');
  renameSync(temporary, file);
}

function loadCatalog() {
  const catalog = readJson(CATALOG_FILE, null);
  if (!catalog || catalog.version !== 1) {
    return { version: 1, families: [], invitations: [], sessions: [] };
  }
  return {
    version: 1,
    families: Array.isArray(catalog.families) ? catalog.families : [],
    invitations: Array.isArray(catalog.invitations) ? catalog.invitations : [],
    sessions: Array.isArray(catalog.sessions) ? catalog.sessions : [],
  };
}

function saveCatalog(catalog) {
  writeJsonAtomic(CATALOG_FILE, catalog);
}

function familyStateFile(familyId) {
  return join(FAMILIES_DIR, `${familyId}.json`);
}

function createDefaultState() {
  return {
    revision: 0,
    members: structuredClone(DEFAULT_MEMBERS),
    chores: structuredClone(DEFAULT_CHORES),
    assignments: {},
    completed: {},
    currentWeek: '',
    history: [],
    rewardPeriod: 'semaine',
    rewardDescription: 'Soirée Cinéma + Pizza 🍕',
    isLocked: false,
    updatedAt: nowIso(),
  };
}

function loadFamilyState(familyId) {
  return readJson(familyStateFile(familyId), createDefaultState());
}

function saveFamilyState(familyId, state) {
  const next = {
    ...state,
    revision: Number.isInteger(state.revision) ? state.revision + 1 : 1,
    updatedAt: nowIso(),
  };
  writeJsonAtomic(familyStateFile(familyId), next);
  return next;
}

function hashSecret(secret) {
  return createHash('sha256').update(secret).digest('hex');
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, SCRYPT_KEY_LEN).toString('hex');
  return { salt, hash };
}

function verifyPinHash(pin, record) {
  if (!record?.salt || !record?.hash) return false;
  const expected = Buffer.from(record.hash, 'hex');
  const actual = scryptSync(pin, record.salt, SCRYPT_KEY_LEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

function cleanText(value, maxLength = 80) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `famille-${randomBytes(3).toString('hex')}`;
}

function parseCookies(req) {
  const result = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function setSessionCookie(req, res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

function clearSessionCookie(req, res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'lax',
    path: '/',
  });
}

function publicFamily(family) {
  return { id: family.id, name: family.name, slug: family.slug, createdAt: family.createdAt };
}

function publicDevice(session) {
  return {
    id: session.id,
    role: session.role,
    label: session.label,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    revokedAt: session.revokedAt ?? null,
  };
}

function requestSession(req, catalog) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashSecret(token);
  const session = catalog.sessions.find(item => item.tokenHash === tokenHash && !item.revokedAt);
  if (!session) return null;
  if (Date.now() - new Date(session.lastSeenAt || session.createdAt).getTime() > SESSION_MAX_AGE_MS) {
    session.revokedAt = nowIso();
    saveCatalog(catalog);
    return null;
  }
  return session;
}

function requireSession(req, res, next) {
  const catalog = loadCatalog();
  const session = requestSession(req, catalog);
  if (!session) {
    clearSessionCookie(req, res);
    return res.status(401).json({ ok: false, error: 'Appareil non appairé' });
  }
  const family = catalog.families.find(item => item.id === session.familyId && !item.disabledAt);
  if (!family) return res.status(403).json({ ok: false, error: 'Famille indisponible' });
  session.lastSeenAt = nowIso();
  saveCatalog(catalog);
  req.catalog = catalog;
  req.deviceSession = session;
  req.family = family;
  next();
}

function requireAdult(req, res, next) {
  if (req.deviceSession?.role !== 'adult') {
    return res.status(403).json({ ok: false, error: 'Appareil adulte requis' });
  }
  next();
}

function requireAdminUnlock(req, res, next) {
  if (!req.deviceSession?.adminUntil || req.deviceSession.adminUntil < Date.now()) {
    return res.status(403).json({ ok: false, error: 'Code PIN requis', code: 'PIN_REQUIRED' });
  }
  next();
}

function requirePilotAdmin(req, res, next) {
  const key = String(req.headers['x-pilot-key'] ?? '');
  if (!PILOT_ADMIN_KEY || !key || !secureEqual(key, PILOT_ADMIN_KEY)) {
    return res.status(401).json({ ok: false, error: 'Clé pilote invalide' });
  }
  next();
}

function invitationPayload(catalog, familyId, role, label, expiresHours = 24) {
  const token = randomBytes(32).toString('base64url');
  const invitation = {
    id: randomUUID(),
    familyId,
    tokenHash: hashSecret(token),
    role,
    label: cleanText(label, 60) || (role === 'adult' ? 'Téléphone adulte' : 'Écran familial'),
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + Math.min(Math.max(expiresHours, 1), 168) * 60 * 60 * 1000).toISOString(),
    usedAt: null,
  };
  catalog.invitations.push(invitation);
  return { invitation, token };
}

function cleanRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => key.length <= 100 && (typeof value === 'string' || typeof value === 'boolean'))
      .slice(0, 1000),
  );
}

function sanitizePlanningState(body, current) {
  const next = { ...current };
  next.assignments = cleanRecord(body.assignments);
  next.completed = cleanRecord(body.completed);
  next.currentWeek = cleanText(body.currentWeek, 16);
  next.history = Array.isArray(body.history) ? body.history.slice(-60) : current.history;
  next.rewardPeriod = body.rewardPeriod === 'mois' ? 'mois' : 'semaine';
  next.rewardDescription = cleanText(body.rewardDescription, 200);
  next.isLocked = Boolean(body.isLocked);
  return next;
}

function sanitizeMembers(input) {
  if (!Array.isArray(input)) return null;
  const colors = new Set(['blue', 'purple', 'pink', 'orange']);
  const members = input.slice(0, 12).map((member, index) => {
    const name = cleanText(member?.name, 40) || `Membre ${index + 1}`;
    return {
      id: cleanText(member?.id, 64) || randomUUID(),
      name,
      initial: name[0].toUpperCase(),
      colorKey: colors.has(member?.colorKey) ? member.colorKey : [...colors][index % colors.size],
    };
  });
  return members.length ? members : null;
}

function sanitizeChores(input) {
  if (!Array.isArray(input)) return null;
  return input.slice(0, 30).map((chore, index) => ({
    id: cleanText(chore?.id, 64) || randomUUID(),
    name: cleanText(chore?.name, 80) || `Tâche ${index + 1}`,
    icon: cleanText(chore?.icon, 40) || 'task_alt',
    iconColor: cleanText(chore?.iconColor, 40) || 'text-slate-400',
  }));
}

const pinFailures = new Map();

function pinFailureKey(req) {
  return `${req.family?.id ?? 'unknown'}:${req.ip}`;
}

function checkRateLimit(key) {
  const entry = pinFailures.get(key);
  if (!entry) return { blocked: false };
  if (entry.until > Date.now()) return { blocked: true, retryMs: entry.until - Date.now() };
  if (entry.until) pinFailures.delete(key);
  return { blocked: false };
}

function registerFailure(key) {
  const entry = pinFailures.get(key) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) {
    entry.count = 0;
    entry.until = Date.now() + LOCKOUT_MS;
  }
  pinFailures.set(key, entry);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.headers.host) {
      return res.status(403).json({ ok: false, error: 'Origine refusée' });
    }
  } catch {
    return res.status(403).json({ ok: false, error: 'Origine invalide' });
  }
  next();
});

app.get('/api/health', (_req, res) => {
  const catalog = loadCatalog();
  res.json({ ok: true, families: catalog.families.filter(f => !f.disabledAt).length });
});

app.get('/api/pilot/status', (_req, res) => {
  res.json({ enabled: Boolean(PILOT_ADMIN_KEY), legacyStateAvailable: existsSync(LEGACY_STATE_FILE) });
});

app.get('/api/pilot/families', requirePilotAdmin, (_req, res) => {
  const catalog = loadCatalog();
  res.json({
    families: catalog.families.map(family => ({
      ...publicFamily(family),
      disabledAt: family.disabledAt ?? null,
      deviceCount: catalog.sessions.filter(s => s.familyId === family.id && !s.revokedAt).length,
    })),
  });
});

app.post('/api/pilot/families', requirePilotAdmin, (req, res) => {
  const name = cleanText(req.body?.name, 80);
  const pin = req.body?.pin;
  if (!name || !isValidPin(pin)) {
    return res.status(400).json({ ok: false, error: 'Nom et PIN de 4 à 6 chiffres requis' });
  }
  const catalog = loadCatalog();
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (catalog.families.some(family => family.slug === slug)) slug = `${baseSlug}-${suffix++}`;
  const family = {
    id: randomUUID(),
    name,
    slug,
    pin: hashPin(pin),
    createdAt: nowIso(),
    disabledAt: null,
  };
  catalog.families.push(family);
  saveCatalog(catalog);

  let initialState = createDefaultState();
  if (req.body?.importLegacy && existsSync(LEGACY_STATE_FILE)) {
    initialState = { ...initialState, ...readJson(LEGACY_STATE_FILE, {}) };
  }
  writeJsonAtomic(familyStateFile(family.id), initialState);
  res.status(201).json({ ok: true, family: publicFamily(family) });
});

app.post('/api/pilot/families/:familyId/invitations', requirePilotAdmin, (req, res) => {
  const catalog = loadCatalog();
  const family = catalog.families.find(item => item.id === req.params.familyId && !item.disabledAt);
  if (!family) return res.status(404).json({ ok: false, error: 'Famille introuvable' });
  const role = req.body?.role === 'display' ? 'display' : 'adult';
  const { invitation, token } = invitationPayload(
    catalog,
    family.id,
    role,
    req.body?.label,
    Number(req.body?.expiresHours ?? 24),
  );
  saveCatalog(catalog);
  res.status(201).json({
    ok: true,
    invitation: {
      id: invitation.id,
      role,
      label: invitation.label,
      expiresAt: invitation.expiresAt,
      path: `/?invite=${encodeURIComponent(token)}`,
    },
  });
});

app.patch('/api/pilot/families/:familyId', requirePilotAdmin, (req, res) => {
  const catalog = loadCatalog();
  const family = catalog.families.find(item => item.id === req.params.familyId);
  if (!family) return res.status(404).json({ ok: false, error: 'Famille introuvable' });
  if (typeof req.body?.disabled === 'boolean') {
    family.disabledAt = req.body.disabled ? nowIso() : null;
    if (req.body.disabled) {
      for (const session of catalog.sessions.filter(item => item.familyId === family.id && !item.revokedAt)) {
        session.revokedAt = nowIso();
      }
    }
  }
  saveCatalog(catalog);
  res.json({ ok: true, family: { ...publicFamily(family), disabledAt: family.disabledAt } });
});

app.post('/api/pair', (req, res) => {
  const token = cleanText(req.body?.token, 200);
  if (!token) return res.status(400).json({ ok: false, error: 'Invitation manquante' });
  const catalog = loadCatalog();
  const invitation = catalog.invitations.find(item => item.tokenHash === hashSecret(token));
  if (!invitation || invitation.usedAt || new Date(invitation.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ ok: false, error: 'Invitation invalide, expirée ou déjà utilisée' });
  }
  const family = catalog.families.find(item => item.id === invitation.familyId && !item.disabledAt);
  if (!family) return res.status(404).json({ ok: false, error: 'Famille indisponible' });
  const sessionToken = randomBytes(32).toString('base64url');
  const session = {
    id: randomUUID(),
    familyId: family.id,
    tokenHash: hashSecret(sessionToken),
    role: invitation.role,
    label: cleanText(req.body?.label, 60) || invitation.label,
    createdAt: nowIso(),
    lastSeenAt: nowIso(),
    adminUntil: 0,
    revokedAt: null,
  };
  invitation.usedAt = nowIso();
  catalog.sessions.push(session);
  saveCatalog(catalog);
  setSessionCookie(req, res, sessionToken);
  res.json({ ok: true, family: publicFamily(family), device: publicDevice(session) });
});

app.get('/api/session', (req, res) => {
  const catalog = loadCatalog();
  const session = requestSession(req, catalog);
  if (!session) {
    clearSessionCookie(req, res);
    return res.json({ paired: false });
  }
  const family = catalog.families.find(item => item.id === session.familyId && !item.disabledAt);
  if (!family) {
    clearSessionCookie(req, res);
    return res.json({ paired: false });
  }
  res.json({
    paired: true,
    family: publicFamily(family),
    device: publicDevice(session),
    adminUnlocked: session.adminUntil > Date.now(),
  });
});

app.post('/api/session/unpair', requireSession, (req, res) => {
  req.deviceSession.revokedAt = nowIso();
  saveCatalog(req.catalog);
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.get('/api/state', requireSession, (req, res) => {
  res.json(loadFamilyState(req.family.id));
});

app.post('/api/state', requireSession, (req, res) => {
  const current = loadFamilyState(req.family.id);
  if (req.deviceSession.role === 'adult') {
    const next = sanitizePlanningState(req.body ?? {}, current);
    return res.json({ ok: true, state: saveFamilyState(req.family.id, next) });
  }
  const incoming = cleanRecord(req.body?.completed);
  const completed = { ...current.completed };
  for (const [key, value] of Object.entries(incoming)) {
    if (current.assignments[key] && typeof value === 'boolean') completed[key] = value;
  }
  const next = saveFamilyState(req.family.id, { ...current, completed });
  res.json({ ok: true, state: next });
});

app.get('/api/auth/status', requireSession, (req, res) => {
  res.json({
    configured: Boolean(req.family.pin),
    unlocked: req.deviceSession.adminUntil > Date.now(),
    role: req.deviceSession.role,
  });
});

app.post('/api/auth/verify', requireSession, requireAdult, (req, res) => {
  const key = pinFailureKey(req);
  const gate = checkRateLimit(key);
  if (gate.blocked) {
    return res.status(429).json({ ok: false, error: 'Trop d’essais', retryMs: gate.retryMs });
  }
  const pin = req.body?.pin;
  if (!isValidPin(pin) || !verifyPinHash(pin, req.family.pin)) {
    registerFailure(key);
    return res.status(401).json({ ok: false, error: 'PIN incorrect' });
  }
  pinFailures.delete(key);
  req.deviceSession.adminUntil = Date.now() + ADMIN_UNLOCK_MS;
  saveCatalog(req.catalog);
  res.json({ ok: true, unlockedUntil: req.deviceSession.adminUntil });
});

app.post('/api/auth/lock', requireSession, requireAdult, (req, res) => {
  req.deviceSession.adminUntil = 0;
  saveCatalog(req.catalog);
  res.json({ ok: true });
});

app.get('/api/settings', requireSession, requireAdult, requireAdminUnlock, (req, res) => {
  const state = loadFamilyState(req.family.id);
  res.json({
    family: publicFamily(req.family),
    members: state.members,
    chores: state.chores,
    devices: req.catalog.sessions
      .filter(item => item.familyId === req.family.id && !item.revokedAt)
      .map(publicDevice),
  });
});

app.put('/api/settings', requireSession, requireAdult, requireAdminUnlock, (req, res) => {
  const state = loadFamilyState(req.family.id);
  const members = sanitizeMembers(req.body?.members);
  const chores = sanitizeChores(req.body?.chores);
  if (!members || !chores?.length) {
    return res.status(400).json({ ok: false, error: 'Au moins un membre et une tâche sont requis' });
  }
  const allowedMembers = new Set(members.map(member => member.id));
  const allowedChores = new Set(chores.map(chore => chore.id));
  const assignments = Object.fromEntries(
    Object.entries(state.assignments).filter(([key, memberId]) => {
      const choreId = key.slice(0, key.lastIndexOf('-'));
      return allowedChores.has(choreId) && allowedMembers.has(memberId);
    }),
  );
  const completed = Object.fromEntries(Object.entries(state.completed).filter(([key]) => assignments[key]));
  const next = saveFamilyState(req.family.id, { ...state, members, chores, assignments, completed });
  const familyName = cleanText(req.body?.familyName, 80);
  if (familyName) req.family.name = familyName;
  saveCatalog(req.catalog);
  res.json({ ok: true, state: next, family: publicFamily(req.family) });
});

app.post('/api/settings/pin', requireSession, requireAdult, requireAdminUnlock, (req, res) => {
  const pin = req.body?.pin;
  if (!isValidPin(pin)) {
    return res.status(400).json({ ok: false, error: 'PIN de 4 à 6 chiffres requis' });
  }
  req.family.pin = hashPin(pin);
  req.deviceSession.adminUntil = 0;
  saveCatalog(req.catalog);
  res.json({ ok: true });
});

app.post('/api/invitations', requireSession, requireAdult, requireAdminUnlock, (req, res) => {
  const role = req.body?.role === 'display' ? 'display' : 'adult';
  const { invitation, token } = invitationPayload(
    req.catalog,
    req.family.id,
    role,
    req.body?.label,
    Number(req.body?.expiresHours ?? 24),
  );
  saveCatalog(req.catalog);
  res.status(201).json({
    ok: true,
    invitation: {
      id: invitation.id,
      role,
      label: invitation.label,
      expiresAt: invitation.expiresAt,
      path: `/?invite=${encodeURIComponent(token)}`,
    },
  });
});

app.delete('/api/devices/:deviceId', requireSession, requireAdult, requireAdminUnlock, (req, res) => {
  const target = req.catalog.sessions.find(
    item => item.id === req.params.deviceId && item.familyId === req.family.id && !item.revokedAt,
  );
  if (!target) return res.status(404).json({ ok: false, error: 'Appareil introuvable' });
  target.revokedAt = nowIso();
  saveCatalog(req.catalog);
  if (target.id === req.deviceSession.id) clearSessionCookie(req, res);
  res.json({ ok: true });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Route API introuvable' });
});

if (IS_PROD) {
  const distDir = join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] Démarré sur le port ${PORT} (${IS_PROD ? 'production' : 'développement'})`);
  if (!PILOT_ADMIN_KEY) {
    console.warn('[server] PILOT_ADMIN_KEY absent : administration pilote désactivée.');
  }
});
