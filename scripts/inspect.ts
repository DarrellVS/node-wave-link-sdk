import { WebSocket } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const localAppData = process.env.LOCALAPPDATA!;
const wsInfoPath = join(localAppData, 'Packages/Elgato.WaveLink_g54w8ztgkx496/LocalState/ws-info.json');
const port = JSON.parse(readFileSync(wsInfoPath, 'utf-8')).port;

const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { Origin: 'streamdeck://' } });

let id = 0;
const pending = new Map<number, (r: any) => void>();

const send = (method: string, params: any = {}): Promise<any> =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ jsonrpc: '2.0', method, params, id: i }));
  });

ws.onmessage = (evt) => {
  const msg = JSON.parse(evt.data.toString());
  if (msg.id !== undefined) {
    const cb = pending.get(msg.id);
    if (cb) { pending.delete(msg.id); cb(msg.result); }
  }
};

ws.onopen = async () => {
  const outputs = await send('getOutputDevices');
  const channels = await send('getChannels');
  const mixes = await send('getMixes');

  console.log('=== getOutputDevices ===');
  console.log(JSON.stringify(outputs, null, 2));

  console.log('\n=== getMixes ===');
  console.log(JSON.stringify(mixes, null, 2));

  console.log('\n=== getChannels[0] ===');
  console.log(JSON.stringify(channels.channels?.[0], null, 2));

  ws.close();
  process.exit(0);
};

ws.onerror = (e) => { console.error(e); process.exit(1); };
