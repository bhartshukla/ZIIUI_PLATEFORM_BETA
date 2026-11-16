import WebSocket from 'ws';
import http from 'http';

const CDP_PORT = 9222;
const CDP_HOST = '127.0.0.1';
const ZIIUI_URL = 'http://localhost:5173/ai.html';

async function getWebSocketDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get(`http://${CDP_HOST}:${CDP_PORT}/json/list`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const pageTarget = targets.find(t => t.type === 'page');
          if (!pageTarget) {
            reject(new Error('No page target found'));
            return;
          }
          resolve(pageTarget.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.callbacks = new Map();
    this.callId = 0;
    this.events = [];
    this.ready = new Promise((resolve) => {
      this.ws.once('open', resolve);
    });
    
    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          cb(msg);
        } else if (msg.method) {
          this.events.push(msg);
        }
      } catch (e) {}
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.callId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async waitForEvent(method, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${method}`)), timeout);
      const check = () => {
        const idx = this.events.findIndex(e => e.method === method);
        if (idx !== -1) {
          const event = this.events[idx];
          this.events.splice(idx, 1);
          clearTimeout(timer);
          resolve(event);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
}

async function runTests() {
  const wsUrl = await getWebSocketDebuggerUrl();
  console.log(`Connected to Chrome`);
  
  const client = new CDPClient(wsUrl);
  
  await client.ready;
  
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  
  console.log(`Navigating to ${ZIIUI_URL}...`);
  await client.send('Page.navigate', { url: ZIIUI_URL });
  await client.waitForEvent('Page.loadEventFired', 15000);
  console.log('  Navigated successfully');
  
  const frameTree = await client.send('Page.getFrameTree');
  const previewFrame = findFrameByUrl(frameTree.frameTree, 'preview');
  
  if (!previewFrame) {
    console.log('FAIL: No preview iframe found');
    return;
  }
  
  console.log(`Preview iframe found: ${previewFrame.frame.id}`);
  
  const result = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const iframe = document.querySelector('iframe');
        if (!iframe) return { found: false };
        return {
          found: true,
          sandbox: iframe.getAttribute('sandbox'),
          hasAllowSameOrigin: iframe.sandbox && iframe.sandbox.includes('allow-same-origin')
        };
      })()
    `,
    frameId: previewFrame.frame.id,
    returnByValue: true
  });
  
  if (!result.result.value.found) {
    console.log('FAIL: No preview iframe found in DOM');
    return;
  }
  
  console.log(`Sandbox: ${result.result.value.sandbox}`);
  console.log(`Has allow-same-origin: ${result.result.value.hasAllowSameOrigin}`);
  
  if (result.result.value.hasAllowSameOrigin) {
    console.log('SECURITY ISSUE: Preview iframe has allow-same-origin');
  } else {
    console.log('SECURITY OK: No allow-same-origin');
  }
  
  const result2 = await client.send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          const val = window.parent.localStorage.getItem('test');
          return { success: true, value: val };
        } catch (e) {
          return { success: false, error: e.message };
        }
      })()
    `,
    frameId: previewFrame.frame.id,
    returnByValue: true
  });
  
  if (result2.result.value.success) {
    console.log('SECURITY ISSUE: Preview CAN access parent.localStorage');
  } else {
    console.log(`SECURITY OK: parent.localStorage access blocked: ${result2.result.value.error}`);
  }
  
  console.log('\nBrowser verification complete.');
}

function findFrameByUrl(tree, urlPart) {
  if (tree.frame.url && tree.frame.url.includes(urlPart)) {
    return tree.frame;
  }
  if (tree.childFrames) {
    for (const child of tree.childFrames) {
      const result = findFrameByUrl(child, urlPart);
      if (result) return result;
    }
  }
  return null;
}

runTests().catch(console.error);