import WebSocket from 'ws';
import http from 'http';

const CDP_PORT = 9222;
const ZIIUI_URL = 'http://localhost:5173';

async function getWebSocketDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json/list`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const ziiuiTarget = targets.find(t => t.url && t.url.includes('localhost:5173'));
          if (!ziiuiTarget) {
            reject(new Error('No ZiiUI target found'));
            return;
          }
          resolve(ziiuiTarget.webSocketDebuggerUrl);
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
    
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        cb(msg);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
    
    this.ws.on('open', () => {
      this.wsOpen = true;
    });
    this.ws.on('close', () => {
      this.wsOpen = false;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.callId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async waitForEvent(method, timeout = 5000) {
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
  console.log(`Connected to: ${wsUrl}`);
  
  const client = new CDPClient(wsUrl);
  
  await new Promise(resolve => client.ws.once('open', resolve));
  
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  
  const results = [];
  
  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      results.push({ name, status: 'PASS' });
    } catch (e) {
      console.log(`  FAIL: ${name} - ${e.message}`);
      results.push({ name, status: 'FAIL', error: e.message });
    }
  }
  
  console.log('\n=== Phase 2: Iframe Security Tests ===\n');
  
  await client.send('Page.navigate', { url: ZIIUI_URL });
  await client.waitForEvent('Page.loadEventFired', 10000);
  console.log('  Navigated to ZiiUI homepage');
  
  await test('Parent cannot access parent.localStorage from preview', async () => {
    await client.send('Page.navigate', { url: `${ZIIUI_URL}/ai.html` });
    await client.waitForEvent('Page.loadEventFired', 10000);
    
    const frameTree = await client.send('Page.getFrameTree');
    const previewFrame = findFrameByUrl(frameTree.frameTree, 'preview');
    
    if (!previewFrame) {
      throw new Error('No preview iframe found');
    }
    
    const frameId = previewFrame.frame.id;
    
    const result = await client.send('Runtime.evaluate', {
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
      frameId,
      returnByValue: true
    });
    
    if (result.result.value.success) {
      throw new Error('Preview CAN access parent.localStorage - SECURITY ISSUE');
    }
    console.log('    parent.localStorage access blocked:', result.result.value.error);
  });
  
  console.log('\n=== Phase 3: Preview Lifecycle Tests ===\n');
  
  console.log('\n=== Verification Complete ===');
  console.log(`Results: ${results.filter(r => r.status === 'PASS').length}/${results.length} passed`);
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