import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      auth: (cb) => cb({ token: localStorage.getItem('olp_access') ?? '' }),
      transports: ['websocket'],
    });
  }
  return socket;
}

/** Tempo real por orçamento (visão do prestador). */
export function useQuoteRealtime(quoteId: string | undefined): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!quoteId) return;
    const s = getSocket();
    const join = () => s.emit('quote:join', { quoteId });
    if (s.connected) join();
    s.on('connect', join);

    const onChanged = (payload: { quoteId: string }) => {
      if (payload.quoteId !== quoteId) return;
      void qc.invalidateQueries({ queryKey: ['conversations'] }); // mensagens
      void qc.invalidateQueries({ queryKey: ['provider', 'conversations'] });
      void qc.invalidateQueries({ queryKey: ['visits', quoteId] });
      void qc.invalidateQueries({ queryKey: ['pricing', quoteId] });
    };
    s.on('quote:changed', onChanged);

    return () => {
      s.emit('quote:leave', { quoteId });
      s.off('connect', join);
      s.off('quote:changed', onChanged);
    };
  }, [quoteId, qc]);
}

export function useNotificationsRealtime(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    const onNew = () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      // Uma notificação (ex.: pagamento confirmado, proposta aceita) sinaliza que
      // o pipeline mudou → atualiza Home (dashboard), lista de trabalhos e visitas
      // mesmo que o prestador não esteja dentro daquele orçamento.
      void qc.invalidateQueries({ queryKey: ['provider', 'dashboard'] });
      void qc.invalidateQueries({ queryKey: ['provider', 'conversations'] });
      void qc.invalidateQueries({ queryKey: ['provider', 'quotes'] });
      void qc.invalidateQueries({ queryKey: ['provider', 'my-visits'] });
    };
    s.on('notification:new', onNew);
    return () => {
      s.off('notification:new', onNew);
    };
  }, [qc]);
}
