import { WebSocket } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { TypedEventEmitter } from '../Helpers/EventEmitterHelpers';

type PendingRequest = {
  resolve: (data: unknown) => void;
  reject: (err: unknown) => void;
};

type NotificationHandler = (params: unknown) => void;

export abstract class BaseWaveLinkController extends TypedEventEmitter<{
  open: () => void;
  close: () => void;
}> {
  private ws: WebSocket | undefined;
  private lastId = 0;
  private pending = new Map<number, PendingRequest>();
  private notifications = new Map<string, NotificationHandler>();
  private isConnecting = false;
  private currentPort = 0;
  private intentionalDisconnect = false;

  // --- Port discovery ---

  private static getWsInfoPath(): string | null {
    if (process.platform === 'win32') {
      const localAppData =
        process.env.LOCALAPPDATA ??
        (process.env.APPDATA ? join(process.env.APPDATA, '../Local') : null);
      if (localAppData) {
        return join(
          localAppData,
          'Packages/Elgato.WaveLink_g54w8ztgkx496/LocalState/ws-info.json'
        );
      }
    }
    // macOS path unknown; fall back to port scanning
    return null;
  }

  private static readPortFromFile(): number | null {
    try {
      const p = BaseWaveLinkController.getWsInfoPath();
      if (!p || !existsSync(p)) return null;
      const data = JSON.parse(readFileSync(p, 'utf-8'));
      if (typeof data.port === 'number' && data.port > 0) return data.port;
    } catch {
      // ignore
    }
    return null;
  }

  // --- Connection ---

  public connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    const portFromFile = BaseWaveLinkController.readPortFromFile();
    if (portFromFile) {
      this.currentPort = portFromFile;
    } else {
      this.currentPort = 1884;
    }
    this.tryConnect();
  }

  public disconnect() {
    this.intentionalDisconnect = true;
    this.ws?.close();
  }

  private tryConnect() {
    const url = `ws://127.0.0.1:${this.currentPort}`;
    const ws = new WebSocket(url, { headers: { Origin: 'streamdeck://' } });
    this.ws = ws;

    ws.onopen = () => {
      this.isConnecting = false;
      this.onConnect();
    };

    ws.onmessage = (evt) => {
      this.resolveMessage(evt.data.toString());
    };

    ws.onerror = () => {
      // handled by onclose
    };

    ws.onclose = () => {
      // Guard against stale close events from a replaced websocket.
      // This can happen when ignorePortAndReconnect() replaces this.ws
      // before the old socket's close event fires.
      if (this.ws !== ws) return;

      this.ws = undefined;
      this.pending.forEach((p) => p.reject(new Error('WebSocket closed')));
      this.pending.clear();
      this.onDisconnect();
      this.emit('close');
      // Don't reconnect if the caller explicitly called disconnect()
      if (!this.intentionalDisconnect) {
        setTimeout(() => {
          this.isConnecting = false;
          this.connect();
        }, 1000);
      }
      this.intentionalDisconnect = false;
    };
  }

  private nextPort() {
    this.currentPort = this.currentPort >= 1893 ? 1884 : this.currentPort + 1;
  }

  // Called by subclass to skip this port and try the next one.
  // Used when a port responds but getApplicationInfo returns a non-EWL appID.
  protected ignorePortAndReconnect() {
    this.ws?.close();
    this.nextPort();
    this.tryConnect();
  }

  // --- JSON-RPC send ---

  public send<T = unknown>(method: string, params: unknown = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      const id = ++this.lastId;
      this.pending.set(id, {
        resolve: resolve as (d: unknown) => void,
        reject,
      });
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', method, params, id }));
    });
  }

  // --- JSON-RPC notification registration ---

  public onNotification(method: string, handler: NotificationHandler) {
    this.notifications.set(method, handler);
  }

  // --- Message routing ---

  private resolveMessage(raw: string) {
    let msg: {
      id?: number;
      result?: unknown;
      error?: unknown;
      method?: string;
      params?: unknown;
    };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.id !== undefined) {
      // RPC response
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) {
          pending.reject(msg.error);
        } else {
          pending.resolve(msg.result);
        }
      }
    } else if (msg.method) {
      // Push notification
      const handler = this.notifications.get(msg.method);
      if (handler) handler(msg.params);
    }
  }

  // --- Hooks for subclass ---

  protected abstract onConnect(): void;
  protected abstract onDisconnect(): void;
}
