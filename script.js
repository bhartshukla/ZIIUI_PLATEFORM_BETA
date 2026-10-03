/* =============================================================
   ziiui — script.js
   Loads templates.html, then runs the full application.
   Requires being served over http(s) (not file://).
   ============================================================= */
(function () {
  'use strict';

  async function loadTemplates() {
    const res = await fetch('templates.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const tpls = doc.querySelectorAll('script[type="text/plain"][id]');
    if (!tpls.length) throw new Error('No templates found in templates.html');
    tpls.forEach(function (old) {
      if (document.getElementById(old.id)) return;
      const s = document.createElement('script');
      s.type = 'text/plain';
      s.id = old.id;
      s.textContent = old.textContent;
      document.body.appendChild(s);
    });
    return tpls.length;
  }

  function fatal(msg) {
    document.body.insertAdjacentHTML('beforeend',
      '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0c0e12;color:#eceef2;font-family:system-ui,sans-serif;padding:2rem;text-align:center;z-index:99999">' +
      '<div><h1 style="margin:0 0 .8rem;font-size:1.1rem">ziiui could not start</h1>' +
      '<p style="color:#8b92a0;max-width:520px;line-height:1.6;margin:0 auto">' + msg + '</p>' +
      '<p style="color:#8b92a0;font-size:.85rem;margin-top:1rem">Tip: run a local server, e.g. <code style="background:#1a1e26;padding:.15rem .4rem;border-radius:4px">python -m http.server 8000</code>, and open <code>http://localhost:8000/index.html</code></p>' +
      '</div></div>');
  }

  function loadApp() {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = 'app.js';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load app.js')); };
      document.body.appendChild(s);
    });
  }

  window.addEventListener('DOMContentLoaded', async function () {
    try {
      await loadTemplates();
    } catch (err) {
      fatal('Templates could not be loaded (' + (err && err.message) + ').');
      return;
    }
    try {
      await loadApp();
    } catch (err) {
      fatal('Application script could not be loaded (' + (err && err.message) + ').');
    }
  });
})();