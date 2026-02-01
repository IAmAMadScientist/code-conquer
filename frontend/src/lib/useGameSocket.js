import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

export function useGameSocket(sessionId, onUpdate) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running via Vite proxy, we use window.location.host.
    // Ideally this matches API_BASE but API_BASE is relative '/api'.
    // We assume the WS endpoint is at /ws relative to the root.
    const brokerURL = `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        // Subscribe to the session topic
        client.subscribe(`/topic/match/${sessionId}`, (message) => {
          if (message.body) {
            try {
              // We just treat any message as a signal to refresh.
              // We could parse JSON here if we sent data.
              onUpdate();
            } catch (e) {
              // ignore
            }
          }
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [sessionId, onUpdate]);
}
