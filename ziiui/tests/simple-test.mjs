import WebSocket from 'ws';
import http from 'http';

const CDP_PORT = 9222;
const CDP_HOST = '127.0.0.1';

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

async function main() {
  const wsUrl = await getWebSocketDebuggerUrl();
  console.log(`Connected to: ${wsUrl}`);
  
  const ws = new WebSocket(wsUrl);
  
  await new Promise((resolve) => {
    ws.once('open', resolve);
  });
  
  const callId = 0;
  const callbacks = new Map();
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  });
  
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++callId;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  
  await send('Page.enable');
  await client.send('Runtime.enable');
  
  console.log('Navigating to AI page...');
  await client.send('Page.navigate', { url: ZIIUI_URL });
  
  console.log('Done');
}

main().catch(console.error);