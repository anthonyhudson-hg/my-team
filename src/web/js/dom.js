/** Tiny DOM-builder helper — no VDOM, no diffing, just less boilerplate than raw createElement calls. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  return node;
}

/** Phosphor icon glyph, e.g. icon('house') -> <i class="ph ph-house">. Second arg is an inline style string for one-off sizing/color, matching the source design's own per-icon styling. */
export function icon(name, style = '') {
  return el('i', { class: `ph ph-${name}`, style });
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(node, children) {
  clear(node);
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(child);
  }
  return node;
}
