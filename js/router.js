export function parseRoute(hash) {
  let parts;
  try {
    parts = (hash || '').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { name: 'notfound', params: {} };
  }
  if (parts.length === 0) return { name: 'home', params: {} };
  if (parts[0] === 'm' && parts[1]) {
    const tab = ['lesson', 'quiz', 'lab'].includes(parts[2]) ? parts[2] : 'lesson';
    return { name: 'module', params: { id: parts[1], tab, exId: tab === 'lab' ? parts[3] ?? null : null } };
  }
  if (parts.length === 1 && ['review', 'exam', 'settings'].includes(parts[0])) return { name: parts[0], params: {} };
  return { name: 'notfound', params: {} };
}

export function startRouter(onRoute, win = window) {
  const fire = () => onRoute(parseRoute(win.location.hash));
  win.addEventListener('hashchange', fire);
  fire();
}
