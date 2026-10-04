import { h } from '../dom.js';
import { loadLesson } from '../content.js';
import { renderMarkdown } from '../markdown.js';

export async function render(root, { module }) {
  root.append(h('p', { class: 'loading' }, 'Loading lesson…'));
  const md = await loadLesson(module.id);
  root.replaceChildren();
  if (md == null) {
    root.append(h('div', { class: 'notice notice-bad' }, 'Could not load this lesson. Check your connection and reload the page.'));
    return;
  }
  const article = renderMarkdown(md);
  const heads = [...article.querySelectorAll('h2')];
  heads.forEach((el, i) => { el.id = `sec-${i}`; });
  // Hash routing owns location.hash, so TOC entries scroll instead of navigating.
  const toc = h('nav', { class: 'toc', 'aria-label': 'On this page' },
    h('p', { class: 'eyebrow' }, 'On this page'),
    heads.map((el) => h('button', { type: 'button', onclick: () => el.scrollIntoView({ behavior: 'smooth' }) }, el.textContent)));
  root.append(
    h('div', { class: 'lesson-layout' }, toc, h('article', { class: 'lesson' }, article)),
    h('div', { class: 'lesson-next' },
      h('p', {}, 'Ready to check your understanding?'),
      module.meta.final
        ? h('a', { class: 'btn primary', href: '#/exam' }, 'Take the final exam →')
        : h('a', { class: 'btn primary', href: `#/m/${module.id}/quiz` }, 'Take the quiz →'),
      h('a', { class: 'btn', href: `#/m/${module.id}/lab` }, 'Go to the labs')),
  );
}
