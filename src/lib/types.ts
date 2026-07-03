export type Role = 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'SUPER_ADMIN';
export type OtpChannel = 'EMAIL' | 'PHONE';
export type QuoteStatus =
  | 'CREATED'
  | 'WAITING_PROPOSALS'
  | 'IN_NEGOTIATION'
  | 'PROVIDER_SELECTED'
  | 'WAITING_PAYMENT'
  | 'PAID'
  | 'EXECUTION_SCHEDULED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELED';
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'APPROVED' | 'REJECTED' | 'FINISHED';

export interface CreateProposalInput {
  type: 'PRE' | 'FINAL';
  amountCents: number;
  amountMinCents?: number;
  amountMaxCents?: number;
  description: string;
  notes?: string;
  leadTimeDays?: number;
  warrantyDays?: number;
  paymentMethods?: string[];
  requestsVisit?: boolean;
}
export type ProposalType = 'PRE' | 'FINAL';
export type ConversationStatus = 'ACTIVE' | 'BLOCKED' | 'CLOSED';
export type ProviderStatus =
  | 'INVITED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'PROPOSAL'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'VISIT_REQUEST'
  | 'VISIT_CONFIRMED'
  | 'VISIT_RESCHEDULED'
  | 'SYSTEM';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface Me {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  hasPassword: boolean;
  providerStatus: ProviderStatus | null;
}

/** Payload de atualização de dados pessoais + endereço (PATCH /auth/me). */
export interface UpdateMeInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  iconKey: string | null;
}

export interface UploadResult {
  url: string;
  key: string;
}

export interface ProviderSocial {
  instagram?: string;
  facebook?: string;
  website?: string;
  whatsapp?: string;
}

/** Perfil profissional (GET/PUT /provider/me/profile). */
export interface ProviderProfile {
  companyName: string | null;
  bio: string | null;
  coverUrl: string | null;
  categoryIds: string[];
  portfolio: string[];
  social: ProviderSocial;
}

export interface UpdateProviderProfileInput {
  companyName?: string;
  bio?: string;
  coverUrl?: string;
  categoryIds?: string[];
  portfolio?: string[];
  social?: ProviderSocial;
}

export interface DashboardPoint {
  label: string;
  value: number;
}

export interface ProviderDashboard {
  ratingAvg: number;
  ratingCount: number;
  pendingResponse: number;
  inProgress: number;
  finished: number;
  newOpportunitiesToday: number;
  revenueWeekCents: number;
  revenueMonthCents: number;
  proposalsSent: number;
  proposalsApproved: number;
  conversionRatePct: number;
  avgResponseMins: number | null;
  revenueSeries: DashboardPoint[];
  monthlyServices: DashboardPoint[];
}

export interface ProviderQuote {
  id: string;
  categoryName: string;
  clientName: string;
  description: string;
  zipCode: string | null;
  status: QuoteStatus;
  proposalsCount: number;
  budgetMaxCents: number | null;
  requiresVisit: boolean;
  canSendFinalProposal: boolean;
  distanceKm: number | null;
  myConversationId?: string;
  createdAt: string;
}

export interface ProviderQuoteImage {
  id: string;
  url: string;
}

/** Detalhe do orçamento visto pelo prestador (inclui imagens). */
export interface ProviderQuoteDetail extends ProviderQuote {
  images: ProviderQuoteImage[];
}

export interface ProviderFinanceEntry {
  paymentId: string;
  quoteId: string;
  categoryName: string;
  clientName: string;
  netCents: number;
  status: string;
  paidAt: string | null;
  releasedAt: string | null;
}

export interface ProviderFinance {
  availableCents: number;
  blockedCents: number;
  processingCents: number;
  totalReceivedCents: number;
  releasedCount: number;
  blockedCount: number;
  payouts: ProviderFinanceEntry[];
  escrow: ProviderFinanceEntry[];
}

export interface ServiceArea {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
}

export interface Schedule {
  workingDays: string[]; // ex: ['MON','TUE',...]
  workingHourStart: number; // 0..23
  workingHourEnd: number;   // 1..24 (exclusive)
  maxVisitsPerDay: number;
}

export interface AvailableSlot {
  startISO: string;
  endISO: string;
  label: string;     // ex: "09:00"
  available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  reason: 'OFF_DAY' | 'DAY_LIMIT_REACHED' | 'BLOCKED' | null;
  slots: AvailableSlot[];
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
export interface NotificationsInbox {
  items: Notification[];
  unreadCount: number;
}

export interface ScheduleBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  note: string | null;
  createdAt: string;
}

export interface Proposal {
  id: string;
  providerId: string;
  type: ProposalType;
  amountCents: number;
  amountMinCents?: number | null;
  amountMaxCents?: number | null;
  description: string;
  notes?: string | null;
  leadTimeDays?: number | null;
  warrantyDays?: number | null;
  paymentMethods?: string[];
  requestsVisit?: boolean;
  status: ProposalStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  type: MessageType;
  body: string | null;
  senderId: string | null;
  createdAt: string;
  proposal?: Proposal;
}

export interface ConversationSummary {
  id: string;
  quoteId: string;
  status: ConversationStatus;
  quoteStatus: QuoteStatus;
  requiresVisit: boolean;
  counterpartName: string;
  counterpartId: string;
  lastMessage?: Message;
  unreadCount: number;
  latestProposal?: Proposal;
}

// Visão de preço (prestador vê o líquido a receber).
export interface PricingView {
  quoteId: string;
  role: string;
  quoteStatus: QuoteStatus;
  paymentStatus: string | null;
  mode: string;
  providerNetCents?: number;
}

export type VisitType = 'IN_LOCO' | 'EXECUTION';
export type VisitStatus =
  | 'PENDING'
  | 'SUGGESTED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELED'
  | 'COMPLETED';

export interface Visit {
  id: string;
  quoteId: string;
  providerId: string;
  providerName: string;
  type: VisitType;
  status: VisitStatus;
  scheduledAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface ProviderRating {
  ratingAvg: number;
  ratingCount: number;
}

/** Visita do prestador (em qualquer orçamento) com contexto. Doc 13 — Painel de Hoje. */
export interface ProviderVisit extends Visit {
  quoteDescription: string;
  quoteCategoryName: string;
  clientName: string;
}
