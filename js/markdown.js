// Renders author-written (trusted) Markdown: syntax highlighting, C++/Python compare panes, callouts.
const CALLOUTS = { 'Note:': 'note', 'Tip:': 'note', 'Pitfall:': 'pitfall', 'C++ vs Python:': 'compare', 'Under the hood:': 'deep' };

export function renderMarkdown(md, { className = 'prose' } = {}) {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = window.marked.parse(md ?? '', { gfm: true });
  for (const code of el.querySelectorAll('pre code')) {
    const lang = /language-(\w+)/.exec(code.className)?.[1];
    if (lang === 'cpp' || lang === 'python') code.parentElement.dataset.lang = lang;
    if (window.hljs && lang && window.hljs.getLanguage(lang)) window.hljs.highlightElement(code);
  }
  pairCompareBlocks(el);
  for (const bq of el.querySelectorAll('blockquote')) {
    const strong = bq.querySelector('p:first-child > strong:first-child');
    const kind = strong && CALLOUTS[strong.textContent.trim()];
    if (kind) bq.classList.add('callout', `callout-${kind}`);
  }
  for (const a of el.querySelectorAll('a[href^="http"]')) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return el;
}

// Adjacent ```cpp + ```python blocks (either order) become one side-by-side widget.
export function pairCompareBlocks(root) {
  for (const pre of [...root.querySelectorAll('pre[data-lang]')]) {
    if (pre.parentElement?.classList.contains('pane')) continue;
    const next = pre.nextElementSibling;
    if (!next || next.tagName !== 'PRE' || !next.dataset.lang || next.dataset.lang === pre.dataset.lang) continue;
    const wrap = document.createElement('div');
    wrap.className = 'compare';
    pre.before(wrap);
    for (const p of [pre, next]) {
      const pane = document.createElement('div');
      pane.className = `pane pane-${p.dataset.lang}`;
      const label = document.createElement('div');
      label.className = 'pane-label';
      label.textContent = p.dataset.lang === 'cpp' ? 'C++' : 'Python';
      pane.append(label, p);
      wrap.append(pane);
    }
  }
}

export function codeBlock(code, lang) {
  const pre = document.createElement('pre');
  const el = document.createElement('code');
  el.className = `language-${lang}`;
  el.textContent = code;
  pre.append(el);
  if (window.hljs?.getLanguage(lang)) window.hljs.highlightElement(el);
  return pre;
}

export const renderInline = (md) => window.marked.parseInline(md ?? '');
