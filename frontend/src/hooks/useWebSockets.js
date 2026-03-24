// frontend/src/hooks/useWebSockets.js
import { useEffect, useRef, useState } from 'react';

export function useWebSockets(onEvent) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = () => {
    // Determine WS URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8082'; // Our Ratchet port
    const url = `${protocol}//${host}:${port}`;

    console.log(`🔌 Connecting to WebSocket: ${url}`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('✅ WebSocket Connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 WebSocket Message:', data);
        onEventRef.current?.(data);
      } catch (err) {
        console.error('❌ Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket Disconnected');
      setConnected(false);
      // Attempt reconnect after 5s
      reconnectTimeout.current = setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket Error:', err);
      ws.close();
    };

    socketRef.current = ws;
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (socketRef.current) {
        socketRef.current.onclose = null; // Prevent reconnect on manual close
        socketRef.current.close();
      }
    };
  }, []);

  return { connected };
}
