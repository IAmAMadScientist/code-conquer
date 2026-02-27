import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

/**
 * Custom hook for WebSocket match synchronization.
 * Returns the current connection status.
 */
export function useGameSocket(sessionId, onUpdate) {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const clientRef = useRef(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setStatus('connected');
        client.subscribe(`/topic/match/${sessionId}`, (message) => {
          if (message.body) {
            try {
              onUpdate();
            } catch (e) {
              // ignore
            }
          }
        });
      },
      onWebSocketClose: () => {
        setStatus('connecting');
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
        setStatus('error');
      },
      onWebSocketError: (event) => {
        console.error('WS error', event);
        setStatus('error');
      }
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [sessionId, onUpdate]);

  return status;
}