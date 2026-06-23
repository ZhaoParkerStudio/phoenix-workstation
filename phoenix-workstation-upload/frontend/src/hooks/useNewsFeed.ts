import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsItem, WSMessage } from '../types';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${protocol}//${window.location.host}/ws/news`;

export function useNewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (e) => {
      try {
        const msg: WSMessage = JSON.parse(e.data);
        if (msg.type === 'init') {
          setNews(msg.data);
        } else if (msg.type === 'news') {
          setNews(prev => [msg.data, ...prev].slice(0, 100));
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { news, connected };
}