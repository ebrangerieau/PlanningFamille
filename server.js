import express from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'state.json');
const PORT      = process.env.PORT ?? 3051;
const IS_PROD   = process.env.NODE_ENV === 'production';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

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

const app = express();
app.use(express.json({ limit: '1mb' }));

// ── API ──────────────────────────────────────────────────────────────────────

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

// ── Fichiers statiques (production uniquement) ────────────────────────────────
if (IS_PROD) {
  const distDir = join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] Démarré sur le port ${PORT} (${IS_PROD ? 'production' : 'développement'})`);
});
