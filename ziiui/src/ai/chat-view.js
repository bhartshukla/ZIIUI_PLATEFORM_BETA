/* Renders the AI chat log (messages, loading dots) into a container element. */

/**
 * @param {HTMLElement|null} container
 * @returns {{add:Function, clear:Function, showLoading:Function, hideLoading:Function}}
 */
export function createChatView(container) {
  function scroll() { if (container) container.scrollTop = container.scrollHeight; }

  function add(role, text) {
    if (!container) return null;
    const d = document.createElement('div');
    d.className = 'ai-msg ' + role;
    d.textContent = text;
    container.append(d);
    scroll();
    return d;
  }

  function hideLoading() {
    const l = container && container.querySelector('#aiLoading');
    if (l) l.remove();
  }

  function showLoading() {
    if (!container) return;
    hideLoading();
    const d = document.createElement('div');
    d.className = 'ai-msg ai';
    d.id = 'aiLoading';
    d.innerHTML = '<i class="ri-loader-4-line ai-spin" aria-hidden="true"></i> AI is editing your component…';
    container.append(d);
    scroll();
  }

  function clear() { if (container) container.innerHTML = ''; }

  /** Replace the log with stored history (or `emptyText` when there is none). */
  function render(history, emptyText) {
    clear();
    if (!history || !history.length) { add('ai', emptyText); return; }
    history.forEach((m) => add(m.role === 'user' ? 'user' : 'ai', m.text));
    scroll();
  }

  return { add, clear, render, showLoading, hideLoading };
}
