/* Entry point for context.html — inspect, export and import saved AI sessions. */
import '../styles/context.css';
import { AI_STATE_KEY, AI_ACTIVE_KEY, AI_SCHEMA_VERSION } from '../ai/config.js';
import { safeGet, safeSet, safeRemove } from '../lib/storage.js';

(function(){
  const $ = id => document.getElementById(id);

  let state = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
  let activeId = null;
  let activeTab = 'overview';

  function toast(msg){
    const t = $('toast'); if(!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>t.classList.remove('show'), 2200);
  }
  function fmtTime(ts){ if(!ts) return '—'; try { return new Date(ts).toLocaleString(); } catch(_) { return String(ts); } }
  function fmtAgo(ts){
    if(!ts) return '—';
    const s = Math.max(0, Math.floor((Date.now()-ts)/1000));
    if(s<60) return s+'s ago';
    if(s<3600) return Math.floor(s/60)+'m ago';
    if(s<86400) return Math.floor(s/3600)+'h ago';
    return Math.floor(s/86400)+'d ago';
  }
  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function isPlainObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }

  function normalizeComponent(key, value){
    const chatHistory = Array.isArray(value.chatHistory) ? value.chatHistory : [];
    const codeVersions = Array.isArray(value.codeVersions) ? value.codeVersions : [];
    const lastUpdated = Number(value.lastUpdated);
    const revision = Number(value.revision);
    return {
      ...value,
      componentId: typeof value.componentId === 'string' ? value.componentId : key,
      componentName: typeof value.componentName === 'string' ? value.componentName : key,
      category: typeof value.category === 'string' ? value.category : '',
      originalCode: typeof value.originalCode === 'string' ? value.originalCode : '',
      currentCode: typeof value.currentCode === 'string' ? value.currentCode : '',
      chatHistory: chatHistory.filter(m => isPlainObject(m) && typeof m.text === 'string' &&
        ['user','assistant','system'].includes(m.role)),
      codeVersions: codeVersions.filter(v => isPlainObject(v) && typeof v.code === 'string'),
      activeVersionId: typeof value.activeVersionId === 'string' ? value.activeVersionId : null,
      lastUpdated: Number.isFinite(lastUpdated) ? lastUpdated : 0,
      revision: Number.isFinite(revision) ? revision : 0
    };
  }

  function load(){
    const raw = safeGet(AI_STATE_KEY);
    if(!raw){ state = { schemaVersion: AI_SCHEMA_VERSION, components: {} }; activeId = null; return false; }
    try {
      const p = JSON.parse(raw);
      if(!isPlainObject(p)) throw new Error('shape');
      if(!isPlainObject(p.components)) throw new Error('components must be an object');
      Object.keys(p.components).forEach(k=>{
        const c = p.components[k];
        if(!isPlainObject(c)){ delete p.components[k]; return; }
        p.components[k] = normalizeComponent(k, c);
      });
      state = { schemaVersion: p.schemaVersion||AI_SCHEMA_VERSION, components: p.components };
      activeId = safeGet(AI_ACTIVE_KEY) || null;
      return true;
    } catch(_) {
      state = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
      activeId = null;
      toast('Saved AI state could not be read. Import a valid backup or clear the damaged data.');
      return false;
    }
  }
  function save(){
    const ok = safeSet(AI_STATE_KEY, JSON.stringify(state));
    if(!ok){ toast('Save failed: local storage is unavailable.'); return false; }
    return true;
  }
  function compIds(){ return Object.keys(state.components); }

  function renderMeta(){
    const ids = compIds();
    const totalMsgs = ids.reduce((a,k)=>a+(state.components[k].chatHistory||[]).length,0);
    const totalVers = ids.reduce((a,k)=>a+(state.components[k].codeVersions||[]).length,0);
    $('schemaBadge').textContent = 'schema v'+state.schemaVersion;
    const raw = safeGet(AI_STATE_KEY);
    $('metaLine').textContent = ids.length + ' component' + (ids.length===1?'':'s')
      + ' · ' + totalMsgs + ' message' + (totalMsgs===1?'':'s')
      + ' · ' + totalVers + ' version' + (totalVers===1?'':'s')
      + ' · ' + (raw ? Math.round(raw.length/1024)+' KB' : '0 KB');
    $('emptyNotice').hidden = ids.length > 0;
    $('layout').hidden = ids.length === 0;
  }
  function renderList(){
    const ul = $('compList'); ul.innerHTML = '';
    const ids = compIds().sort((a,b)=>{
      const la = state.components[a].lastUpdated||0;
      const lb = state.components[b].lastUpdated||0;
      return lb-la;
    });
    ids.forEach(id=>{
      const c = state.components[id];
      const li = document.createElement('li');
      if(id === activeId) li.classList.add('active');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-current', String(id === activeId));
      const msgs = (c.chatHistory||[]).length;
      const vers = (c.codeVersions||[]).length;
      button.innerHTML =
        '<div style="min-width:0;flex:1">'+
          '<div class="name">'+esc(c.componentName||id)+'</div>'+
          '<div class="cat">'+esc(c.category||'')+' · '+fmtAgo(c.lastUpdated)+'</div>'+
        '</div>'+
        '<div class="counts">'+
          '<span title="Messages">'+msgs+'</span>'+
          '<span title="Versions">'+vers+'</span>'+
        '</div>';
      button.addEventListener('click', ()=>{ activeId = id; safeSet(AI_ACTIVE_KEY, id); renderList(); renderDetail(); });
      li.append(button);
      ul.appendChild(li);
    });
  }
  function renderStats(c){
    const msgs = c.chatHistory||[], vers = c.codeVersions||[];
    const userMsgs = msgs.filter(m=>m.role==='user').length;
    const aiMsgs = msgs.filter(m=>m.role==='assistant').length;
    const origLen = (c.originalCode||'').length;
    const curLen = (c.currentCode||'').length;
    const activeVers = c.activeVersionId ? vers.find(v=>v.id===c.activeVersionId) : null;
    const stats = [
      {label:'Component ID', value: c.componentId||'—'},
      {label:'Name', value: c.componentName||'—'},
      {label:'Category', value: c.category||'—'},
      {label:'Messages', value: msgs.length + ' (U:'+userMsgs+' / A:'+aiMsgs+')'},
      {label:'AI Versions', value: vers.length},
      {label:'Active Version', value: activeVers ? ('#'+(vers.indexOf(activeVers)+1)) : '—'},
      {label:'Original Size', value: origLen.toLocaleString()+' chars'},
      {label:'Current Size', value: curLen.toLocaleString()+' chars'},
      {label:'Last Updated', value: fmtTime(c.lastUpdated)},
    ];
    const grid = $('statsGrid'); grid.innerHTML = '';
    stats.forEach(s=>{
      const div = document.createElement('div');
      div.className = 'stat';
      div.innerHTML = '<div class="label">'+esc(s.label)+'</div><div class="value">'+esc(s.value)+'</div>';
      grid.appendChild(div);
    });
    $('overviewEmpty').hidden = msgs.length>0 || vers.length>0;
  }
  function renderChat(c){
    const wrap = $('chatMsgs'); wrap.innerHTML = '';
    const msgs = c.chatHistory||[];
    if(!msgs.length){ $('chatEmpty').hidden = false; return; }
    $('chatEmpty').hidden = true;
    msgs.forEach(m=>{
      const d = document.createElement('div');
      d.className = 'msg ' + (m.role==='user' ? 'user' : 'assistant');
      d.innerHTML = esc(m.text) + '<span class="ts">'+esc(fmtTime(m.timestamp))+'</span>';
      wrap.appendChild(d);
    });
  }
  function renderVersions(c){
    const wrap = $('versionsList'); wrap.innerHTML = '';
    const vers = (c.codeVersions||[]).slice().reverse();
    if(!vers.length){ $('versionsEmpty').hidden = false; return; }
    $('versionsEmpty').hidden = true;
    vers.forEach((v,idx)=>{
      const realIdx = c.codeVersions.length - 1 - idx;
      const div = document.createElement('div');
      div.className = 'version' + (v.id===c.activeVersionId?' active':'');
      div.innerHTML =
        '<div class="vmeta">'+
          '<div class="vprompt">#'+(realIdx+1)+' — '+esc(v.prompt||'(no prompt)')+'</div>'+
          '<div class="vts">'+esc(fmtTime(v.timestamp))+' · '+((v.code||'').length.toLocaleString())+' chars'+
          (v.id===c.activeVersionId?' · <b style="color:var(--acc)">ACTIVE</b>':'')+'</div>'+
        '</div>'+
        '<button class="vbtn" data-act="view" data-i="'+realIdx+'">View</button>'+
        '<button class="vbtn" data-act="restore" data-i="'+realIdx+'">Restore</button>';
      wrap.appendChild(div);
    });
    wrap.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const i = parseInt(b.dataset.i,10);
        const v = c.codeVersions[i]; if(!v) return;
        if(b.dataset.act==='view'){
          activeTab = 'current'; setActiveTab();
          $('currentCode').textContent = v.code||'';
          toast('Showing version #'+(i+1));
        } else if(b.dataset.act==='restore'){
          if(!confirm('Restore version #'+(i+1)+' as the current code?\n\n'+v.prompt)) return;
          c.currentCode = v.code||'';
          c.activeVersionId = v.id;
          c.lastUpdated = Date.now();
          c.revision = (Number(c.revision) || 0) + 1;
          save(); renderDetail(); renderList(); renderMeta();
          toast('Version #'+(i+1)+' restored.');
        }
      });
    });
  }
  function setActiveTab(){
    document.querySelectorAll('.tab').forEach(t=>{
      const selected = t.dataset.tab === activeTab;
      t.classList.toggle('active', selected);
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    ['overview','chat','versions','original','current'].forEach(k=>{
      $('pane-'+k).hidden = (k !== activeTab);
    });
  }
  function renderDetail(){
    const card = $('detailCard');
    const c = activeId ? state.components[activeId] : null;
    if(!c){ card.hidden = true; return; }
    card.hidden = false;
    $('detailHead').innerHTML =
      '<i class="ri-sparkling-2-line"></i>' + esc(c.componentName||activeId) +
      '<span style="margin-left:auto;color:var(--mute);font-weight:500;text-transform:none;letter-spacing:0;font-size:.75rem">' +
      esc(c.category||'') + ' · ' + esc(fmtAgo(c.lastUpdated)) + '</span>';
    renderStats(c); renderChat(c); renderVersions(c);
    $('originalCode').textContent = c.originalCode || '(empty)';
    $('currentCode').textContent = c.currentCode || c.originalCode || '(empty)';
    setActiveTab();
  }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    let objectUrl;
    try { objectUrl = URL.createObjectURL(blob); }
    catch(_) { toast('Export failed: could not create a download.'); return; }
    a.href = objectUrl;
    a.download = 'ziiui-ai-state-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
    toast('Exported.');
  }
  function importJSON(file){
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const p = JSON.parse(String(r.result));
        if(!isPlainObject(p) || !isPlainObject(p.components)) throw new Error('Invalid shape');
        if(!confirm('Replace your current AI state with the imported file?')) return;
        const normalized = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
        Object.keys(p.components).forEach((key)=>{
          const value = p.components[key];
          if(isPlainObject(value)) normalized.components[key] = normalizeComponent(key, value);
        });
        const previousState = state;
        state = normalized;
        if(!save()){ state = previousState; return; }
        safeRemove(AI_ACTIVE_KEY);
        activeId = null;
        renderList(); renderMeta();
        $('detailCard').hidden = true;
        toast('Imported '+Object.keys(normalized.components).length+' components.');
      }catch(err){ toast('Import failed: '+err.message); }
    };
    r.onerror = ()=>toast('Import failed: could not read the selected file.');
    r.onabort = ()=>toast('Import cancelled.');
    try { r.readAsText(file); }
    catch(err) { toast('Import failed: '+err.message); }
  }
  function clearAll(){
    const hasHistory = Object.values(state.components || {}).some((component) =>
      component.chatHistory.length || component.codeVersions.length || component.currentCode
    );
    if(!hasHistory){ toast('There is no saved AI history to clear.'); return; }
    if(!confirm('Delete ALL AI history? Original components are not affected.')) return;
    state = { schemaVersion: AI_SCHEMA_VERSION, components: {} };
    safeRemove(AI_STATE_KEY); safeRemove(AI_ACTIVE_KEY);
    activeId = null;
    renderList(); renderMeta();
    $('detailCard').hidden = true;
    toast('All AI history cleared.');
  }
  function initTheme(){
    const t = safeGet('ziiui-theme');
    if(t==='light'||t==='dark') document.documentElement.setAttribute('data-theme',t);
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
      document.documentElement.setAttribute('data-theme','light');
    updateThemeControl();
  }
  function updateThemeControl(){
    const button = $('themeBtn');
    if(!button) return;
    const icon = button.querySelector('i');
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    if(icon) icon.className = light ? 'ri-moon-line' : 'ri-sun-line';
    button.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  function toggleTheme(){
    const cur = document.documentElement.getAttribute('data-theme')||'dark';
    const next = cur==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme',next);
    if(!safeSet('ziiui-theme', next)) toast('Theme changed, but could not be saved.');
    updateThemeControl();
  }

  $('refreshBtn').addEventListener('click', ()=>{ load(); renderMeta(); renderList(); renderDetail(); toast('Refreshed.'); });
  $('exportBtn').addEventListener('click', exportJSON);
  $('importBtn').addEventListener('click', ()=>$('importFile').click());
  $('importFile').addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0];
    if(f) importJSON(f);
    e.target.value = '';
  });
  $('themeBtn').addEventListener('click', toggleTheme);
  $('clearAllBtn').addEventListener('click', clearAll);
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{ activeTab = t.dataset.tab; setActiveTab(); });
    t.addEventListener('keydown', e=>{
      const tabs = [...document.querySelectorAll('.tab')];
      const current = tabs.indexOf(t);
      let next = current;
      if(e.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if(e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if(e.key === 'Home') next = 0;
      else if(e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      activeTab = tabs[next].dataset.tab;
      setActiveTab();
      tabs[next].focus();
    });
  });
  window.addEventListener('storage', e=>{
    if(e.key === AI_STATE_KEY){
      load(); renderMeta(); renderList(); renderDetail();
      toast('State updated from another tab.');
    }
  });

  initTheme();
  load();
  renderMeta();
  renderList();
  if(activeId && state.components[activeId]) renderDetail();
})();
