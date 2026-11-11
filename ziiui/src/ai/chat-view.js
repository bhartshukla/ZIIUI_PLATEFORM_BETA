/* Renders the AI chat log (messages, loading dots) into a container element. */

/**
 * @param {HTMLElement|null} container
 * @returns {{add:Function, clear:Function, showLoading:Function, hideLoading:Function}}
 */
export function createChatView(container) {
  function scroll() {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function add(role, text) {
    if (!container) {return null;}
    const d = document.createElement('div');
    d.className = `ai-msg ${role}`;

    if (role === 'ai' || role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'ai-msg-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.innerHTML = `<svg class="ai-sparkle-svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
        <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" fill="#2196FF"/>
        <path d="M19 2C19 3.7 17.7 5 16 5C17.7 5 19 6.3 19 8C19 6.3 20.3 5 22 5C20.3 5 19 3.7 19 2Z" fill="#FFFFFF" opacity="0.9"/>
      </svg>`;

      const body = document.createElement('div');
      body.className = 'ai-msg-body';
      body.textContent = text;

      d.append(avatar, body);
    } else {
      d.textContent = text;
    }

    container.append(d);
    scroll();
    return d;
  }

  function hideLoading() {
    const l = container && container.querySelector('#aiLoading');
    if (l) {l.remove();}
  }

  function showLoading() {
    if (!container) {return;}
    hideLoading();
    const d = document.createElement('div');
    d.className = 'ai-msg ai ai-loading-card';
    d.id = 'aiLoading';
    d.innerHTML = `
      <div class="ai-loading-content">
        <div class="ai-loading-spinner-wrap" aria-hidden="true">
          <svg class="ai-sparkle-svg ai-spin-pulse" viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" fill="#2196FF"/>
            <path d="M19 2C19 3.7 17.7 5 16 5C17.7 5 19 6.3 19 8C19 6.3 20.3 5 22 5C20.3 5 19 3.7 19 2Z" fill="#FFFFFF" opacity="0.9"/>
          </svg>
        </div>
        <div class="ai-loading-text-wrap">
          <strong class="ai-loading-title">Generating your personalized component...</strong>
          <span class="ai-loading-subtitle">Applying design system and interactive behaviors</span>
        </div>
      </div>
      <div class="ai-loading-bar-track">
        <div class="ai-loading-bar-indicator"></div>
      </div>
    `;
    container.append(d);
    scroll();
  }

  function clear() {
    if (container) {container.innerHTML = '';}
  }

  /** Replace the log with stored history (or emptyText when there is none). */
  function render(history, emptyText) {
    clear();
    if (!history || !history.length) {
      add('ai', emptyText);
      return;
    }
    history.forEach((m) => add(m.role === 'user' ? 'user' : 'ai', m.text));
    scroll();
  }

  return { add, clear, render, showLoading, hideLoading };
}
