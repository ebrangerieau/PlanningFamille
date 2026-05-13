/**
 * Serveur MCP pour PlanningFamille "La Tribu"
 *
 * Fonctionne en mode local (fichier) ou distant (API HTTP).
 * Mode distant recommandé si l'app tourne sur un serveur (ex: planning.bandtrack.fr).
 *
 * Config Claude Desktop (%APPDATA%\Claude\claude_desktop_config.json) :
 * {
 *   "mcpServers": {
 *     "planning-famille": {
 *       "command": "node",
 *       "args": ["C:\\chemin\\vers\\PlanningFamille\\mcp-server.js"],
 *       "env": { "PLANNING_URL": "https://planning.bandtrack.fr" }
 *     }
 *   }
 * }
 *
 * Sans PLANNING_URL → lit/écrit data/state.json localement (dev).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname    = dirname(fileURLToPath(import.meta.url));
const DATA_DIR     = join(__dirname, 'data');
const DATA_FILE    = join(DATA_DIR, 'state.json');
const PLANNING_URL = process.env.PLANNING_URL?.replace(/\/$/, '') ?? null;

// ── Constantes du planning ─────────────────────────────────────────────────

const DAYS = [
  { id: 'mon', label: 'Lundi'    },
  { id: 'tue', label: 'Mardi'    },
  { id: 'wed', label: 'Mercredi' },
  { id: 'thu', label: 'Jeudi'    },
  { id: 'fri', label: 'Vendredi' },
  { id: 'sat', label: 'Samedi'   },
  { id: 'sun', label: 'Dimanche' },
];

const CHORES = [
  { id: 'c1', name: 'Mettre la table'                   },
  { id: 'c2', name: 'Débarrasser la table'              },
  { id: 'c3', name: 'Débarrasser le lave-vaisselle'     },
  { id: 'c6', name: "Passer l'aspirateur après repas"   },
  { id: 'c4', name: 'Faire chauffer le repas'           },
  { id: 'c5', name: 'Nettoyer le plan de travail'       },
];

const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const TODAY_ID  = DAYS[TODAY_IDX]?.id ?? 'mon';

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadState() {
  if (PLANNING_URL) {
    const res = await fetch(`${PLANNING_URL}/api/state`);
    if (!res.ok) throw new Error(`GET /api/state → ${res.status}`);
    return res.json();
  }
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveState(state) {
  if (PLANNING_URL) {
    const res = await fetch(`${PLANNING_URL}/api/state`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(state),
    });
    if (!res.ok) throw new Error(`POST /api/state → ${res.status}`);
    return;
  }
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function choreName(id) {
  return CHORES.find(c => c.id === id)?.name ?? id;
}

function dayLabel(id) {
  return DAYS.find(d => d.id === id)?.label ?? id;
}

function memberName(members, id) {
  return members?.find(m => m.id === id)?.name ?? id;
}

function computeScores(state) {
  const { members = [], assignments = {}, completed = {} } = state;
  const scores = Object.fromEntries(members.map(m => [m.id, 0]));
  for (const [key, memberId] of Object.entries(assignments)) {
    const dayId = key.split('-').slice(1).join('-');
    const dayIdx = DAYS.findIndex(d => d.id === dayId);
    if (dayIdx <= TODAY_IDX && completed[key]) {
      scores[memberId] = (scores[memberId] ?? 0) + 1;
    }
  }
  return scores;
}

// ── Serveur MCP ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'planning-famille',
  version: '1.0.0',
});

// ── Outil 1 : Résumé de la semaine ─────────────────────────────────────────

server.tool(
  'get_week_summary',
  'Retourne un résumé lisible du planning familial de la semaine en cours : tâches assignées, tâches effectuées, scores de chaque membre.',
  {},
  async () => {
    const state   = await loadState();
    const { members = [], assignments = {}, completed = {} } = state;
    const scores  = computeScores(state);

    const lines = [
      `Planning familial — semaine en cours (aujourd'hui : ${dayLabel(TODAY_ID)})`,
      '',
      '── Scores ──',
      ...members.map(m => `  ${m.name} : ${scores[m.id] ?? 0} point(s)`),
      '',
      '── Tâches ──',
    ];

    for (const chore of CHORES) {
      lines.push(`\n${chore.name} :`);
      for (const day of DAYS) {
        const key      = `${chore.id}-${day.id}`;
        const assignId = assignments[key];
        const done     = completed[key];
        if (assignId) {
          const name = memberName(members, assignId);
          const status = done ? '✅' : '⬜';
          lines.push(`  ${day.label} : ${name} ${status}`);
        } else {
          lines.push(`  ${day.label} : —`);
        }
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ── Outil 2 : État brut ────────────────────────────────────────────────────

server.tool(
  'get_state',
  'Retourne l\'état JSON complet du planning : membres, assignations, tâches effectuées, et historique des semaines passées.',
  {},
  async () => {
    const state = await loadState();
    return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
  }
);

// ── Outil 3 : Assigner une tâche ──────────────────────────────────────────

server.tool(
  'assign_task',
  'Assigne une tâche à un membre de la famille pour un jour donné. Utiliser get_week_summary pour connaître les IDs disponibles.',
  {
    choreId:  z.string().describe('ID de la tâche (c1=Mettre la table, c2=Débarrasser la table, c3=Débarrasser le lave-vaisselle, c6=Aspirateur, c4=Chauffer repas, c5=Plan de travail)'),
    dayId:    z.string().describe('ID du jour : mon, tue, wed, thu, fri, sat, sun'),
    memberId: z.string().describe('ID du membre (utiliser get_state pour voir les IDs des membres)'),
  },
  async ({ choreId, dayId, memberId }) => {
    const state = await loadState();
    state.assignments = state.assignments ?? {};

    const key = `${choreId}-${dayId}`;
    state.assignments[key] = memberId;

    await saveState(state);

    const name  = memberName(state.members, memberId);
    const chore = choreName(choreId);
    const day   = dayLabel(dayId);

    return {
      content: [{
        type: 'text',
        text: `✅ ${name} assigné·e à "${chore}" le ${day}.`,
      }],
    };
  }
);

// ── Outil 4 : Marquer comme fait / non fait ───────────────────────────────

server.tool(
  'set_task_completed',
  'Marque une tâche comme effectuée ou non effectuée pour un jour donné.',
  {
    choreId:   z.string().describe('ID de la tâche (c1 à c6)'),
    dayId:     z.string().describe('ID du jour : mon, tue, wed, thu, fri, sat, sun'),
    completed: z.boolean().describe('true = effectuée, false = non effectuée'),
  },
  async ({ choreId, dayId, completed }) => {
    const state = await loadState();
    state.completed = state.completed ?? {};

    const key = `${choreId}-${dayId}`;
    if (completed) {
      state.completed[key] = true;
    } else {
      delete state.completed[key];
    }

    await saveState(state);

    const chore  = choreName(choreId);
    const day    = dayLabel(dayId);
    const status = completed ? 'marquée comme effectuée ✅' : 'marquée comme non effectuée ⬜';

    return {
      content: [{
        type: 'text',
        text: `"${chore}" le ${day} : ${status}.`,
      }],
    };
  }
);

// ── Outil 5 : Historique ──────────────────────────────────────────────────

server.tool(
  'get_history',
  'Retourne l\'historique des semaines passées avec les scores de chaque membre par semaine.',
  {},
  async () => {
    const state   = await loadState();
    const history = state.history ?? [];
    const members = state.members ?? [];

    if (history.length === 0) {
      return { content: [{ type: 'text', text: 'Aucun historique disponible pour le moment.' }] };
    }

    const lines = ['Historique des semaines passées :', ''];

    for (const week of history) {
      lines.push(`Semaine ${week.week} :`);
      const weekScores = {};
      for (const [key, memberId] of Object.entries(week.assignments ?? {})) {
        if (week.completed?.[key]) {
          weekScores[memberId] = (weekScores[memberId] ?? 0) + 1;
        }
      }
      for (const m of members) {
        lines.push(`  ${m.name} : ${weekScores[m.id] ?? 0} pt(s)`);
      }
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ── Démarrage ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
