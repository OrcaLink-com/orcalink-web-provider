import type {
  AuthUser,
  Category,
  ConversationSummary,
  CreateProposalInput,
  Me,
  Message,
  OtpChannel,
  PricingView,
  Proposal,
  ProviderDashboard,
  ProviderFinance,
  ProviderProfile,
  ProviderQuote,
  ProviderQuoteDetail,
  ProviderVisit,
  AvailableSlotsResponse,
  NotificationsInbox,
  ProviderRating,
  Schedule,
  ScheduleBlock,
  ServiceArea,
  TokenResponse,
  UpdateMeInput,
  UpdateProviderProfileInput,
  UploadResult,
  Visit,
  VisitType,
} from './types';
import { reconnectSocket } from './realtime';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const ACCESS_KEY = 'olp_access';
const REFRESH_KEY = 'olp_refresh';
const USER_KEY = 'olp_user';

let onAuthLost: (() => void) | null = null;
export function setAuthLostHandler(fn: (() => void) | null): void {
  onAuthLost = fn;
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

function storeSession(res: TokenResponse): void {
  localStorage.setItem(ACCESS_KEY, res.accessToken);
  localStorage.setItem(REFRESH_KEY, res.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

const getAccess = () => localStorage.getItem(ACCESS_KEY);
const getRefresh = () => localStorage.getItem(REFRESH_KEY);

async function parseError(res: Response): Promise<Error> {
  let message = `Erro ${res.status}`;
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (body?.message) {
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    }
  } catch {
    /* sem corpo JSON */
  }
  return new Error(message);
}

function doFetch(path: string, init: RequestInit, auth: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccess();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

let refreshing: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refreshToken = getRefresh();
  if (!refreshToken) return Promise.resolve(false);
  refreshing = fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const data = (await res.json()) as TokenResponse;
      const user = getStoredUser();
      if (user) storeSession({ ...data, user });
      // Reconecta o socket com o token novo (senão o realtime fica mudo após expirar).
      reconnectSocket();
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  let res = await doFetch(path, init, auth);
  if (res.status === 401 && auth) {
    const ok = await tryRefresh();
    if (ok) {
      res = await doFetch(path, init, true);
    } else {
      clearSession();
      onAuthLost?.();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function jsonBody(data: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

export const api = {
  // Auth
  requestOtp(channel: OtpChannel, destination: string) {
    return request<{ sent: boolean; devCode?: string }>(
      '/auth/otp/request',
      jsonBody({ channel, destination }),
      false,
    );
  },
  async verifyOtp(channel: OtpChannel, destination: string, code: string, name?: string) {
    const res = await request<TokenResponse>(
      '/auth/otp/verify',
      // intent PROVIDER: no 1º acesso o usuário nasce como PRESTADOR (não CLIENT).
      jsonBody({ channel, destination, code, name, intent: 'PROVIDER' }),
      false,
    );
    storeSession(res);
    return res.user;
  },
  async acceptInvite(input: {
    token: string;
    name: string;
    document?: string;
    companyName?: string;
  }) {
    const res = await request<TokenResponse>('/auth/invite/accept', jsonBody(input), false);
    storeSession(res);
    return res.user;
  },
  me() {
    return request<Me>('/auth/me');
  },
  getProfile() {
    return request<Me>('/auth/me');
  },
  updateMe(input: UpdateMeInput) {
    return request<Me>('/auth/me', { ...jsonBody(input), method: 'PATCH' });
  },
  requestPasswordOtp() {
    return request<{ sent: boolean; devCode?: string }>('/auth/password/otp', { method: 'POST' });
  },
  setPassword(input: { newPassword: string; code?: string; currentPassword?: string }) {
    return request<{ ok: boolean }>('/auth/password', { ...jsonBody(input), method: 'PATCH' });
  },
  listCategories() {
    return request<Category[]>('/categories', {}, false);
  },
  sendContact(input: { subject: string; category: string; message: string; name?: string; email?: string }) {
    return request<{ ok: boolean; id: string }>('/contact', jsonBody(input));
  },
  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResult>('/uploads', { method: 'POST', body: form });
  },
  getProviderProfile() {
    return request<ProviderProfile>('/provider/me/profile');
  },
  updateProviderProfile(input: UpdateProviderProfileInput) {
    return request<ProviderProfile>('/provider/me/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  async logout() {
    const refreshToken = getRefresh();
    try {
      if (refreshToken) await request('/auth/logout', jsonBody({ refreshToken }), false);
    } finally {
      clearSession();
    }
  },

  // Prestador
  listOpenQuotes() {
    return request<ProviderQuote[]>('/provider/quotes');
  },
  getQuoteDetail(quoteId: string) {
    return request<ProviderQuoteDetail>(`/provider/quotes/${quoteId}`);
  },
  listMyConversations() {
    return request<ConversationSummary[]>('/provider/conversations');
  },
  /** Métricas do dashboard (Home). */
  getDashboard() {
    return request<ProviderDashboard>('/provider/me/dashboard');
  },
  /** Painel financeiro (recebíveis do próprio prestador). */
  getFinance() {
    return request<ProviderFinance>('/provider/me/finance');
  },
  startConversation(quoteId: string) {
    return request<{ conversationId: string }>(`/provider/quotes/${quoteId}/start`, {
      method: 'POST',
    });
  },
  createProposal(quoteId: string, input: CreateProposalInput) {
    return request<Proposal>(`/provider/quotes/${quoteId}/proposals`, jsonBody(input));
  },
  getMessages(conversationId: string) {
    return request<Message[]>(`/conversations/${conversationId}/messages`);
  },
  sendMessage(conversationId: string, body: string) {
    return request<Message>(`/conversations/${conversationId}/messages`, jsonBody({ body }));
  },
  getPricing(quoteId: string) {
    return request<PricingView>(`/pricing/${quoteId}`);
  },
  // Visitas
  listVisits(quoteId: string) {
    return request<Visit[]>(`/quotes/${quoteId}/visits`);
  },
  /** Todas as visitas do prestador (Painel de Hoje). */
  listMyVisits() {
    return request<ProviderVisit[]>('/provider/me/visits');
  },
  requestVisit(quoteId: string, type: VisitType, scheduledAt: string, endsAt?: string) {
    return request<Visit>(
      `/provider/quotes/${quoteId}/visits`,
      jsonBody({ type, scheduledAt, endsAt }),
    );
  },
  /** Prestador confirma uma visita reagendada pelo cliente (vai-e-volta). */
  confirmVisit(visitId: string) {
    return request<Visit>(`/visits/${visitId}/confirm`, { method: 'POST' });
  },
  /** Prestador confirma que a visita técnica foi realizada (libera a proposta final). */
  completeVisit(visitId: string) {
    return request<Visit>(`/visits/${visitId}/complete`, { method: 'POST' });
  },
  /** Prestador inicia o serviço (EXECUCAO_AGENDADA → IN_PROGRESS). */
  startExecution(quoteId: string) {
    return request<{ status: string }>(
      `/provider/quotes/${quoteId}/start-execution`,
      { method: 'POST' },
    );
  },
  /** Prestador marca o serviço como concluído (não libera pagamento; media a Orca Link). */
  markServiceDone(quoteId: string) {
    return request<{ ok: boolean }>(`/provider/quotes/${quoteId}/mark-done`, { method: 'POST' });
  },
  // Reputação
  getRating() {
    return request<ProviderRating>('/provider/rating');
  },
  /** Geocoding por CEP (CEP → lat/lng) para definir a área sem GPS. */
  geocodeCep(cep: string) {
    return request<{ latitude: number; longitude: number; city?: string; state?: string }>(
      `/geocode/cep?cep=${encodeURIComponent(cep)}`,
    );
  },
  // Área de atendimento (docs/ux/10)
  getServiceArea() {
    return request<ServiceArea>('/provider/me/service-area');
  },
  setServiceArea(input: { latitude: number; longitude: number; radiusKm: number }) {
    return request<ServiceArea>('/provider/me/service-area', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  // Agenda (docs/ux/10)
  getSchedule() {
    return request<Schedule>('/provider/me/schedule');
  },
  setSchedule(input: Schedule) {
    return request<Schedule>('/provider/me/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  getAvailableSlots(date: string) {
    return request<AvailableSlotsResponse>(
      `/provider/me/available-slots?date=${encodeURIComponent(date)}`,
    );
  },
  listScheduleBlocks() {
    return request<ScheduleBlock[]>('/provider/me/blocks');
  },
  createScheduleBlock(input: { startsAt: string; endsAt: string; note?: string }) {
    return request<ScheduleBlock>('/provider/me/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  deleteScheduleBlock(id: string) {
    return request<void>(`/provider/me/blocks/${id}`, { method: 'DELETE' });
  },
  // Notificações
  listNotifications() {
    return request<NotificationsInbox>('/notifications');
  },
  markNotificationRead(id: string) {
    return request<void>(`/notifications/${id}/read`, { method: 'POST' });
  },
  markAllNotificationsRead() {
    return request<void>('/notifications/read-all', { method: 'POST' });
  },
};
