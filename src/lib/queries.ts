import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { CreateProposalInput } from './types';

export const queryKeys = {
  me: ['me'] as const,
  openQuotes: ['provider', 'quotes'] as const,
  myConversations: ['provider', 'conversations'] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
  pricing: (quoteId: string) => ['pricing', quoteId] as const,
  visits: (quoteId: string) => ['visits', quoteId] as const,
  rating: ['rating'] as const,
  serviceArea: ['provider', 'service-area'] as const,
  schedule: ['provider', 'schedule'] as const,
  availableSlots: (date: string) => ['provider', 'available-slots', date] as const,
  scheduleBlocks: ['provider', 'blocks'] as const,
  myVisits: ['provider', 'my-visits'] as const,
  dashboard: ['provider', 'dashboard'] as const,
};

export function useRating() {
  return useQuery({ queryKey: queryKeys.rating, queryFn: api.getRating });
}

/** Métricas do dashboard (Home). */
export function useProviderDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.getDashboard,
    refetchInterval: 60000,
  });
}

/** Todas as visitas do prestador (Painel de Hoje). */
export function useMyVisits() {
  return useQuery({
    queryKey: queryKeys.myVisits,
    queryFn: api.listMyVisits,
    refetchInterval: 30000,
  });
}

export function useServiceArea() {
  return useQuery({ queryKey: queryKeys.serviceArea, queryFn: api.getServiceArea });
}

export function useSetServiceArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { latitude: number; longitude: number; radiusKm: number }) =>
      api.setServiceArea(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.serviceArea });
      void qc.invalidateQueries({ queryKey: queryKeys.openQuotes });
    },
  });
}

export function useSchedule() {
  return useQuery({ queryKey: queryKeys.schedule, queryFn: api.getSchedule });
}

export function useScheduleBlocks() {
  return useQuery({ queryKey: queryKeys.scheduleBlocks, queryFn: api.listScheduleBlocks });
}

export function useCreateScheduleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { startsAt: string; endsAt: string; note?: string }) =>
      api.createScheduleBlock(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.scheduleBlocks });
      // Slots e validações dependem do bloqueio — invalida tudo que reflete.
      void qc.invalidateQueries({ queryKey: ['provider', 'available-slots'] });
    },
  });
}

export function useDeleteScheduleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteScheduleBlock(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.scheduleBlocks });
      void qc.invalidateQueries({ queryKey: ['provider', 'available-slots'] });
    },
  });
}

export function useAvailableSlots(date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.availableSlots(date ?? 'none'),
    queryFn: () => api.getAvailableSlots(date as string),
    enabled: Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date)),
  });
}

export function useSetSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      workingDays: string[];
      workingHourStart: number;
      workingHourEnd: number;
      maxVisitsPerDay: number;
    }) => api.setSchedule(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.schedule });
    },
  });
}

export function useVisits(quoteId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.visits(quoteId ?? 'none'),
    queryFn: () => api.listVisits(quoteId as string),
    enabled: Boolean(quoteId),
    refetchInterval: 30000,
  });
}

export function useRequestVisit(quoteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: 'IN_LOCO' | 'EXECUTION';
      scheduledAt: string;
      endsAt?: string;
    }) => api.requestVisit(quoteId, input.type, input.scheduledAt, input.endsAt),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.visits(quoteId) });
    },
  });
}

export function useConfirmVisit(quoteId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visitId: string) => api.confirmVisit(visitId),
    onSuccess: () => {
      if (quoteId) void qc.invalidateQueries({ queryKey: queryKeys.visits(quoteId) });
      void qc.invalidateQueries({ queryKey: queryKeys.myConversations });
      void qc.invalidateQueries({ queryKey: queryKeys.myVisits });
    },
  });
}

export function useStartExecution(quoteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.startExecution(quoteId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.myConversations });
      void qc.invalidateQueries({ queryKey: queryKeys.visits(quoteId) });
      void qc.invalidateQueries({ queryKey: queryKeys.myVisits });
    },
  });
}

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me });
}

export function useOpenQuotes() {
  return useQuery({
    queryKey: queryKeys.openQuotes,
    queryFn: api.listOpenQuotes,
    refetchInterval: 8000,
  });
}

export function useMyConversations() {
  return useQuery({
    queryKey: queryKeys.myConversations,
    queryFn: api.listMyConversations,
    refetchInterval: 30000,
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId ? queryKeys.messages(conversationId) : ['messages', 'none'],
    queryFn: () => api.getMessages(conversationId as string),
    enabled: Boolean(conversationId),
    refetchInterval: 30000,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.sendMessage(conversationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
    },
  });
}

export function usePricing(quoteId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.pricing(quoteId ?? 'none'),
    queryFn: () => api.getPricing(quoteId as string),
    enabled: Boolean(quoteId) && enabled,
  });
}

export function useCreateProposal(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { quoteId: string } & CreateProposalInput) => {
      const { quoteId, ...rest } = input;
      return api.createProposal(quoteId, rest);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: queryKeys.myConversations });
    },
  });
}

// ───────── Notificações ─────────
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'] as const,
    queryFn: api.listNotifications,
    refetchInterval: 60000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
