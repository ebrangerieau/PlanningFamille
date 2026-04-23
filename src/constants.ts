import type { Member, Chore, Day } from './types';

export const COLOR_KEYS: Array<Member['colorKey']> = ['blue', 'purple', 'pink', 'orange'];

export const DEFAULT_MEMBERS: Member[] = [
  { id: 'tom',    name: 'Tom',    initial: 'T', colorKey: 'blue'   },
  { id: 'jules',  name: 'Jules',  initial: 'J', colorKey: 'purple' },
  { id: 'karine', name: 'Karine', initial: 'K', colorKey: 'pink'   },
  { id: 'eric',   name: 'Eric',   initial: 'E', colorKey: 'orange' },
];

export const CHORES: Chore[] = [
  { id: 'c1', name: 'Mettre la table',                    icon: 'restaurant',        iconColor: 'text-orange-400' },
  { id: 'c2', name: 'Débarrasser la table',               icon: 'cleaning_services', iconColor: 'text-green-400'  },
  { id: 'c3', name: 'Débarrasser le lave-vaisselle',      icon: 'flatware',          iconColor: 'text-blue-400'   },
  { id: 'c6', name: "Passer l'aspirateur après repas",    icon: 'vacuum',            iconColor: 'text-purple-400' },
  { id: 'c4', name: 'Faire chauffer le repas',            icon: 'microwave',         iconColor: 'text-red-400'    },
  { id: 'c5', name: 'Nettoyer le plan de travail',        icon: 'countertops',       iconColor: 'text-cyan-400'   },
];

export const DAYS: Day[] = [
  { id: 'mon', short: 'Lun' }, { id: 'tue', short: 'Mar' }, { id: 'wed', short: 'Mer' },
  { id: 'thu', short: 'Jeu' }, { id: 'fri', short: 'Ven' }, { id: 'sat', short: 'Sam' },
  { id: 'sun', short: 'Dim' },
];

// 0 = Lun … 6 = Dim
export const TODAY_INDEX = (new Date().getDay() + 6) % 7;

export const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500',   lightBg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   cardBg: 'bg-blue-50'   },
  purple: { bg: 'bg-purple-500', lightBg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', cardBg: 'bg-purple-50' },
  pink:   { bg: 'bg-pink-500',   lightBg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   cardBg: 'bg-pink-50'   },
  orange: { bg: 'bg-orange-500', lightBg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', cardBg: 'bg-orange-50' },
};

export const RANK_EMOJI = ['🥇', '🥈', '🥉'];
