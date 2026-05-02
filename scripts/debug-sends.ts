/**
 * Debug script: inspects channel/mix state then tests setChannel with mixes.
 * Run: npx tsx scripts/debug-sends.ts
 */
import { WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { join } from 'path';

const localAppData = process.env.LOCALAPPDATA!;
const wsInfoPath = join(localAppData, 'Packages/Elgato.WaveLink_g54w8ztgkx496/LocalState/ws-info.json');
const port = JSON.parse(readFileSync(wsInfoPath, 'utf-8')).port;
console.log(`Connecting to Wave Link on port ${port}...`);

const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { Origin: 'streamdeck://' } });

let msgId = 0;
const pending = new Map<number, (r: any) => void>();

const send = (method: string, params: any = {}): Promise<any> =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params, id });
    console.log(`\n→ SEND  [${id}] ${method}`);
    console.log('  params:', JSON.stringify(params, null, 2).replace(/\n/g, '\n  '));
    pending.set(id, resolve);
    setTimeout(() => { pending.delete(id); reject(new Error(`Timeout waiting for reply to ${method}`)); }, 5000);
    ws.send(msg);
  });

ws.onmessage = (evt) => {
  const raw = evt.data.toString();
  const msg = JSON.parse(raw);
  if (msg.id !== undefined) {
    const cb = pending.get(msg.id);
    if (cb) {
      console.log(`\n← REPLY [${msg.id}]`);
      if (msg.error) {
        console.error('  ERROR:', JSON.stringify(msg.error, null, 2).replace(/\n/g, '\n  '));
      } else {
        console.log('  result:', JSON.stringify(msg.result, null, 2).replace(/\n/g, '\n  '));
      }
      pending.delete(msg.id);
      cb(msg.error ? null : msg.result);
    }
  } else if (msg.method) {
    // Push notification
    console.log(`\n⚡ PUSH  ${msg.method}`);
    console.log('  params:', JSON.stringify(msg.params, null, 2).replace(/\n/g, '\n  '));
  }
};

ws.onerror = (e) => { console.error('WebSocket error:', e.message); process.exit(1); };

ws.onopen = async () => {
  console.log('Connected!\n');

  // 1. Load channels and mixes
  const [channelRes, mixRes] = await Promise.all([
    send('getChannels'),
    send('getMixes'),
  ]);

  const channels: any[] = channelRes?.channels ?? [];
  const mixes: any[]    = mixRes?.mixes ?? [];

  console.log('\n── MIXES ──────────────────────────────────');
  for (const m of mixes) {
    console.log(`  ${m.name}  id=${m.id}  level=${m.level}  muted=${m.isMuted}`);
  }

  console.log('\n── CHANNELS ────────────────────────────────');
  for (const ch of channels) {
    console.log(`  ${ch.name}  id=${ch.id}  level=${ch.level}  muted=${ch.isMuted}`);
    for (const ms of (ch.mixes ?? [])) {
      const mixName = mixes.find((m: any) => m.id === ms.id)?.name ?? ms.id;
      console.log(`    send → ${mixName}  id=${ms.id}  level=${ms.level}  muted=${ms.isMuted}`);
    }
  }

  // 2. Find the Music channel
  const music = channels.find((c: any) => c.name?.toLowerCase() === 'music');
  if (!music) {
    console.error('\nNo "Music" channel found — check channel names above.');
    ws.close(); process.exit(1);
  }
  console.log(`\nFound Music channel: id=${music.id}, ${music.mixes?.length ?? 0} mix sends`);

  if (!music.mixes?.length) {
    console.error('Music channel has no mixes in its mixes array — send levels may not be supported for this channel.');
    ws.close(); process.exit(1);
  }

  // 3. Subscribe to channelChanged to watch for responses
  console.log('\nSubscribing to notifications...');
  // (no subscription method needed — Wave Link always pushes channelChanged)

  // 4. Test: set the Stream Mix send level on Music to 0.5, wait, then restore
  const streamMixSend = music.mixes.find((ms: any) => {
    const name = mixes.find((m: any) => m.id === ms.id)?.name ?? '';
    return name.toLowerCase().includes('stream');
  });
  const personalMixSend = music.mixes.find((ms: any) => {
    const name = mixes.find((m: any) => m.id === ms.id)?.name ?? '';
    return name.toLowerCase().includes('personal');
  });

  const testSend = streamMixSend ?? personalMixSend ?? music.mixes[0];
  const mixName = mixes.find((m: any) => m.id === testSend.id)?.name ?? testSend.id;
  const originalLevel = testSend.level;
  const testLevel = originalLevel > 0.6 ? 0.3 : 0.8;

  console.log(`\nTest: setting Music → ${mixName} send level from ${(originalLevel * 100).toFixed(0)}% to ${(testLevel * 100).toFixed(0)}%`);

  const reply = await send('setChannel', {
    id: music.id,
    mixes: [{ id: testSend.id, level: testLevel }],
  });

  console.log('\nsetChannel replied. Waiting 2s for channelChanged push...');
  await new Promise(r => setTimeout(r, 2000));

  // 5. Re-read channels to see if state actually changed
  console.log('\nRe-reading channel state...');
  const freshRes = await send('getChannels');
  const freshMusic = (freshRes?.channels ?? []).find((c: any) => c.id === music.id);
  if (freshMusic) {
    const freshSend = freshMusic.mixes?.find((ms: any) => ms.id === testSend.id);
    if (freshSend) {
      const changed = Math.abs(freshSend.level - testLevel) < 0.01;
      console.log(`\nResult: Music → ${mixName} send level is now ${(freshSend.level * 100).toFixed(0)}%`);
      if (changed) {
        console.log('✓ setChannel with mixes WORKS — level changed successfully.');
      } else {
        console.log(`✗ setChannel with mixes FAILED — level is still ${(freshSend.level * 100).toFixed(0)}%, expected ${(testLevel * 100).toFixed(0)}%.`);
        console.log('  This suggests the Wave Link app ignores per-mix sends on setChannel.');
      }
    }
  }

  // 6. Restore original level
  console.log(`\nRestoring Music → ${mixName} to ${(originalLevel * 100).toFixed(0)}%...`);
  await send('setChannel', {
    id: music.id,
    mixes: [{ id: testSend.id, level: originalLevel }],
  });

  await new Promise(r => setTimeout(r, 500));
  console.log('\nDone.');
  ws.close();
  process.exit(0);
};
