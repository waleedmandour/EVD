// ─── WiFi OBD-II Connection Manager ─────────────────────────────────
// Handles real WebSocket connection to WiFi OBD-II adapters (ELM327 WiFi, etc.)
//
// WiFi OBD-II adapters create a WiFi hotspot. The phone connects to this hotspot,
// and the app communicates via WebSocket (ws://) on the adapter's IP:port.
//
// Standard ports: 35000 (ELM327 WiFi), 23 (Telnet mode on some adapters)
//
// IMPORTANT: OBD-II WiFi adapters do NOT support TLS (wss://).
// When this app is served over HTTPS (e.g., from Vercel), browsers block
// mixed content (ws:// from https:// page). This is a browser security limitation.
// Workaround: Access the app via HTTP, or use Chrome flags to allow insecure content
// on localhost/private IPs.

export interface WiFiConnectionCallbacks {
  onData: (data: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onStatusChange: (status: string) => void;
  onConnected: () => void;
}

export interface WiFiConnectionInfo {
  ip: string;
  port: number;
  protocol: 'ws' | 'wss';
  connected: boolean;
}

let ws: WebSocket | null = null;
let callbacks: WiFiConnectionCallbacks | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let messageBuffer: string = '';
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Check if WebSocket API is available in the current context.
 */
export function checkWiFiAvailability(): { available: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { available: false, reason: 'Running in server environment' };
  }

  if (typeof WebSocket === 'undefined') {
    return { available: false, reason: 'WebSocket is not supported in this browser/context.' };
  }

  return { available: true };
}

/**
 * Connect to a WiFi OBD-II adapter via WebSocket.
 *
 * IMPORTANT for HTTPS deployment:
 * - OBD-II WiFi adapters do NOT support TLS, so we must use ws:// (not wss://)
 * - Browsers block ws:// connections from HTTPS pages (mixed content policy)
 * - This is a fundamental limitation of the web platform
 * - If ws:// fails, we provide a clear error message with workarounds
 *
 * IMPORTANT for PWA usage:
 * - The phone must be connected to the adapter's WiFi hotspot FIRST
 * - The adapter typically creates an open network (no password)
 * - Common SSIDs: ELM327, WiFi_OBDII, VLINKER, etc.
 * - Default IP: 192.168.0.10, Default port: 35000
 *
 * When the phone connects to the adapter's WiFi, it loses internet access.
 * This is expected behavior — the app works entirely offline with the adapter.
 */
export function connectWiFi(
  ip: string,
  port: number,
  cb: WiFiConnectionCallbacks
): Promise<WiFiConnectionInfo> {
  return new Promise((resolve, reject) => {
    const avail = checkWiFiAvailability();
    if (!avail.available) {
      reject(new Error(avail.reason));
      return;
    }

    // Disconnect any existing connection
    if (ws) {
      disconnect();
    }

    callbacks = cb;
    cb.onStatusChange(`Connecting to ${ip}:${port}...`);

    // ─── FIX: Always use ws:// protocol ───────────────────────────
    // OBD-II WiFi adapters do NOT support TLS (wss://).
    // We must always use plain WebSocket (ws://).
    // The previous code used wss:// when the page was served over HTTPS,
    // which would always fail because OBD adapters don't support TLS.
    const protocol = 'ws:';
    const url = `${protocol}//${ip}:${port}`;

    // Check for mixed content issue (HTTPS page trying to open ws://)
    const isSecureContext = window.location.protocol === 'https:';
    if (isSecureContext) {
      console.warn(
        '[WiFi OBD] This page is served over HTTPS but OBD adapters require ws:// (non-TLS). ' +
        'Some browsers will block this mixed content connection. ' +
        'If connection fails, try accessing the app via HTTP or use a Bluetooth adapter instead.'
      );
    }

    try {
      ws = new WebSocket(url);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      if (isSecureContext && (errMsg.includes('secure') || errMsg.includes('mixed') || errMsg.includes('insecure'))) {
        reject(new Error(
          'Browser blocked ws:// connection from HTTPS page (mixed content). ' +
          'OBD-II WiFi adapters do not support secure WebSocket (wss://). ' +
          'To use WiFi OBD: 1) Access this app via HTTP instead of HTTPS, or ' +
          '2) Use a Bluetooth BLE adapter instead (recommended).'
        ));
      } else {
        reject(new Error(`Failed to create WebSocket: ${errMsg}`));
      }
      return;
    }

    // Connection timeout — 10 seconds
    const timeout = setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        ws.close();
        reject(new Error(
          `Connection to ${ip}:${port} timed out. Ensure your phone is connected ` +
          `to the adapter's WiFi network (SSID: ELM327, WiFi_OBDII, etc.) and the adapter is powered on.`
        ));
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(timeout);
      cb.onStatusChange('Connected to WiFi adapter! Initializing OBD-II...');

      // Start keep-alive pings to detect disconnection
      startKeepAlive(ip, port);

      cb.onConnected();

      resolve({
        ip,
        port,
        protocol: 'ws',
        connected: true,
      });
    };

    ws.onmessage = (event) => {
      // ELM327 sends responses as text, sometimes with prompt character '>'
      if (typeof event.data === 'string') {
        messageBuffer += event.data;

        // ELM327 responses end with '>' prompt or carriage return
        // Process complete lines
        const lines = messageBuffer.split('\r');
        // Keep the last incomplete part in the buffer
        messageBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && trimmed !== '>' && trimmed.length > 0) {
            cb.onData(trimmed);
          }
        }

        // Also check for '>' in buffer (ELM327 ready prompt)
        if (messageBuffer.includes('>')) {
          const remaining = messageBuffer.replace(/>/g, '');
          if (remaining.trim()) {
            cb.onData(remaining.trim());
          }
          messageBuffer = '';
        }
      }
    };

    ws.onerror = (event) => {
      clearTimeout(timeout);
      if (isSecureContext) {
        cb.onError(
          `WebSocket connection failed. Since this app is loaded over HTTPS, the browser may block ` +
          `insecure ws:// connections to the OBD adapter. Try: 1) Access the app via HTTP, ` +
          `2) Use a Bluetooth BLE adapter instead, or 3) Enable Chrome flag: chrome://flags/#allow-insecure-localhost`
        );
      } else {
        cb.onError(
          `WebSocket error. Ensure you're connected to the adapter's WiFi network (${ip}:${port}). ` +
          `The adapter should be showing a solid LED.`
        );
      }
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      stopKeepAlive();

      const info: WiFiConnectionInfo = { ip, port, protocol: 'ws', connected: false };

      if (event.code === 1006) {
        // Abnormal close — likely WiFi disconnection
        cb.onError(
          `Connection to adapter lost. Your phone may have disconnected from the adapter's WiFi network. ` +
          `Go to WiFi settings and reconnect to the adapter's network, then try again.`
        );
      } else if (event.code !== 1000) {
        cb.onDisconnected();
        // Attempt auto-reconnect once
        if (!reconnectTimer) {
          cb.onStatusChange('Connection lost. Reconnecting...');
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (callbacks) {
              connectWiFi(ip, port, callbacks).catch(() => {
                cb.onError('Auto-reconnect failed. Please check your WiFi connection to the adapter.');
              });
            }
          }, 3000);
        }
      } else {
        cb.onDisconnected();
      }
    };
  });
}

/**
 * Send an OBD-II command to the WiFi adapter.
 */
export function sendCommand(command: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket not connected');
  }

  // ELM327 commands end with carriage return
  const cmd = command.endsWith('\r') ? command : command + '\r';
  ws.send(cmd);
}

/**
 * Send ELM327 initialization commands over WebSocket.
 * Uses adaptive delays — ATZ gets a longer wait.
 */
export async function initializeAdapter(
  ip: string,
  port: number,
  commands: string[],
  onInitResponse: (cmd: string, response: string) => void,
  delayMs: number = 500
): Promise<boolean> {
  for (const cmd of commands) {
    try {
      sendCommand(cmd);

      // ATZ (reset) needs significantly more time
      const waitTime = cmd.toUpperCase().startsWith('ATZ') ? 3000 : delayMs;
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      const response = messageBuffer.trim();
      messageBuffer = '';

      onInitResponse(cmd, response || 'sent');
    } catch (error) {
      onInitResponse(cmd, `error: ${error instanceof Error ? error.message : 'failed'}`);
      return false;
    }
  }
  return true;
}

/**
 * Start a keep-alive ping to detect WiFi disconnection.
 * FIX: Use AT (blank command) instead of ATZ (full reset) for keep-alive.
 * ATZ resets the adapter, losing all protocol configuration — catastrophic during a session.
 * A simple AT command (no operation) just checks if the adapter is responsive.
 */
function startKeepAlive(ip: string, port: number) {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        // Send a harmless AT command — just checks adapter is alive
        // AT by itself returns "OK" without resetting anything
        ws.send('AT\r');
      } catch {
        stopKeepAlive();
        callbacks?.onError('Keep-alive failed. Connection may be lost.');
      }
    }
  }, 30000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

/**
 * Disconnect from the WiFi adapter and clean up.
 */
export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  stopKeepAlive();

  if (ws) {
    try {
      ws.close(1000, 'User disconnect');
    } catch {
      // Already closed
    }
    ws = null;
  }

  messageBuffer = '';
}

export function isWiFiConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
