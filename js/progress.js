import { store } from './store.js';
import { awardBadges, touchStreak, dayKey, levelFor, BADGE_LABELS } from './state.js';
import { MODULES, modulesFor } from './content.js';
import { toast } from './ui.js';

export const BADGE_ICONS = { mastered: '🏆', perfect: '🎯', nohints: '🧠', polyglot: '🌐' };

export function badgeLabel(id) {
  const [kind, modId] = id.split(':');
  const m = MODULES.find((x) => x.id === modId);
  return `${BADGE_LABELS[kind] ?? kind}: ${m ? m.title : modId}`;
}

// Apply an XP-returning state change, then streak, badges and celebration toasts.
export function gain(fn) {
  const before = store.get();
  const { state, xpGained } = fn(touchStreak(before, dayKey()));
  const { state: next, newBadges } = awardBadges(state, modulesFor(state.settings.lang));
  store.set(next);
  if (xpGained) toast(`+${xpGained} XP`, 'xp');
  const lv = levelFor(next.xp);
  if (lv.level > levelFor(before.xp).level) toast(`Level up! Level ${lv.level}: ${lv.title}`, 'level');
  for (const b of newBadges) toast(`${BADGE_ICONS[b.split(':')[0]] ?? '🏅'} Badge earned: ${badgeLabel(b)}`, 'badge');
  return xpGained;
}
