import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  useMyConversations,
  useMyVisits,
  useProviderDashboard,
} from '../../lib/queries';
import { formatBRL } from '../../lib/format';
import {
  AreaTrend,
  BarTrend,
  ButtonLink,
  Card,
  EmptyState,
  RatingStars,
  SectionHeader,
  Spinner,
  StatCard,
  StatusChip,
} from '../../components/ui';
import {
  IconAgenda,
  IconChat,
  IconChevronRight,
  IconClock,
  IconCompare,
  IconEdit,
  IconExecution,
  IconLocation,
  IconPayment,
  IconReschedule,
  IconScheduled,
  IconSuccess,
  IconWaiting,
} from '../../components/icons';
import type { ConversationSummary, ProviderDashboard, ProviderVisit } from '../../lib/types';

export function HomePage() {
  const { user } = useAuth();
  const dashQ = useProviderDashboard();
  const convQ = useMyConversations();
  const visitsQ = useMyVisits();

  const d = dashQ.data;
  const conversations = convQ.data ?? [];
  const visits = visitsQ.data ?? [];

  const alerts = useMemo(() => buildAlerts(conversations, visits, d), [conversations, visits, d]);
  const agenda = useMemo(() => buildAgenda(visits), [visits]);
  const [filter, setFilter] = useState<'all' | AlertCategory>('all');

  if (dashQ.isLoading) return <Spinner label="Carregando seu painel…" />;

  const revenueData = (d?.revenueSeries ?? []).map((p) => ({ label: shortDay(p.label), value: p.value }));
  const servicesData = (d?.monthlyServices ?? []).map((p) => ({ label: shortMonth(p.label), value: p.value }));

  const shownAlerts = filter === 'all' ? alerts : alerts.filter((a) => a.category === filter);
  const countBy = (cat: AlertCategory) => alerts.filter((a) => a.category === cat).length;

  return (
    <div className="space-y-7">
      {/* Saudação */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-text-muted">{greeting()},</p>
          <h1 className="text-2xl font-bold leading-tight">{firstName(user?.name)}</h1>
        </div>
        {d && <RatingStars value={d.ratingAvg} count={d.ratingCount} />}
      </header>

      {/* Métricas principais */}
      {d && (
        <>
          <div className="flex gap-2.5">
            <StatCard value={formatBRL(d.revenueMonthCents)} label="Receita (30d)" icon={<IconSuccess size={16} />} accent />
            <StatCard value={formatBRL(d.revenueWeekCents)} label="Receita (7d)" icon={<IconClock size={16} />} />
          </div>
          <div className="flex gap-2.5">
            <StatCard value={`${d.conversionRatePct}%`} label="Conversão" icon={<IconCompare size={16} />} />
            <StatCard
              value={d.avgResponseMins != null ? fmtMins(d.avgResponseMins) : '—'}
              label="Resp. média"
              icon={<IconClock size={16} />}
            />
            <StatCard value={d.newOpportunitiesToday} label="Novas hoje" icon={<IconLocation size={16} />} />
          </div>
          <div className="flex gap-2.5">
            <StatCard value={d.pendingResponse} label="Pendentes" icon={<IconWaiting size={16} />} />
            <StatCard value={d.inProgress} label="Em andamento" icon={<IconExecution size={16} />} />
            <StatCard value={d.finished} label="Concluídos" icon={<IconSuccess size={16} />} />
          </div>
        </>
      )}

      {/* Avisos — painel de trabalho */}
      <section>
        <SectionHeader title="Avisos" />
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ['all', 'Todas', alerts.length],
              ['action', 'Ações pendentes', countBy('action')],
              ['agenda', 'Agenda', countBy('agenda')],
              ['finance', 'Financeiro', countBy('finance')],
              ['messages', 'Mensagens', countBy('messages')],
              ['system', 'Sistema', countBy('system')],
            ] as [typeof filter, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-text-muted hover:bg-card-2'
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          ))}
        </div>

        {shownAlerts.length === 0 ? (
          <EmptyState icon={<IconSuccess size={24} />} title={filter === 'all' ? 'Tudo em dia' : 'Nada nesta categoria'} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-large border border-border bg-content1 shadow-card">
            {shownAlerts.map((a) => (
              <li key={a.key}>
                <Link to={a.to} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-card-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneChip[a.tone]}`}>
                    {a.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    {a.subtitle && <p className="truncate text-xs text-text-muted">{a.subtitle}</p>}
                  </div>
                  {a.meta && <span className="shrink-0 text-xs text-text-muted">{a.meta}</span>}
                  <IconChevronRight size={18} className="shrink-0 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mini-agenda — próximos 5 dias */}
      <section>
        <SectionHeader title="Próximos compromissos" />
        {agenda.length === 0 ? (
          <EmptyState icon={<IconAgenda size={24} />} title="Nada agendado nos próximos 5 dias" />
        ) : (
          <ul className="space-y-2.5">
            {agenda.map((v) => {
              const chip = visitStatusChip(v.status);
              return (
                <li key={v.id}>
                  <Card to={visitLink(v)} className="flex items-center gap-3 p-3.5">
                    <span className="shrink-0 rounded-medium bg-primary/15 px-2.5 py-1.5 text-center text-xs font-bold text-primary">
                      {dayLabel(v.scheduledAt)}
                      <br />
                      {timeOf(v.scheduledAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{v.clientName}</p>
                      <p className="truncate text-xs text-text-muted">
                        {v.type === 'EXECUTION' ? 'Execução' : 'Visita técnica'} · {v.quoteCategoryName}
                      </p>
                    </div>
                    <StatusChip label={chip.label} varName={chip.varName} size="sm" />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        <ButtonLink to="/app/agenda" variant="secondary" full className="mt-3">
          Ver agenda completa
        </ButtonLink>
      </section>

      {/* Gráficos */}
      {d && (
        <section className="space-y-3">
          <SectionHeader title="Receita · últimos 30 dias" />
          <Card className="p-3">
            <AreaTrend data={revenueData} format={(v) => formatBRL(v)} />
          </Card>
          <SectionHeader title="Serviços concluídos · por mês" />
          <Card className="p-3">
            <BarTrend data={servicesData} format={(v) => `${v} serviço(s)`} />
          </Card>
        </section>
      )}
    </div>
  );
}

// ───────── avisos ─────────
type Tone = 'attention' | 'info' | 'danger' | 'success' | 'finance' | 'message';
type AlertCategory = 'action' | 'agenda' | 'finance' | 'messages' | 'system';
interface Alert {
  key: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  to: string;
  tone: Tone;
  category: AlertCategory;
}
const toneChip: Record<Tone, string> = {
  attention: 'bg-warning/15 text-warning',
  info: 'bg-primary/15 text-primary',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-emerald-500/15 text-emerald-300',
  finance: 'bg-emerald-500/15 text-emerald-300',
  message: 'bg-sky-500/15 text-sky-300',
};

function convLink(conversationId: string): string {
  return `/app/conversa/${conversationId}`;
}
function visitLink(v: ProviderVisit): string {
  return v.conversationId ? `/app/conversa/${v.conversationId}` : `/app/orcamento/${v.quoteId}`;
}

function buildAlerts(
  conversations: ConversationSummary[],
  visits: ProviderVisit[],
  dash?: ProviderDashboard,
): Alert[] {
  const sz = 18;
  const out: Alert[] = [];

  for (const c of conversations) {
    const to = convLink(c.id);
    const who = c.counterpartName;
    const p = c.latestProposal;

    // Mensagens não lidas.
    if (c.unreadCount > 0) {
      out.push({ key: `msg-${c.id}`, icon: <IconChat size={sz} />, title: `Nova mensagem de ${who}`, subtitle: `${c.unreadCount} não lida(s)`, to, tone: 'message', category: 'messages' });
    }

    // Ação / acompanhamento por estado.
    if (c.status === 'ACTIVE' && !p) {
      out.push({ key: `resp-${c.id}`, icon: <IconEdit size={sz} />, title: `Responda ${who}`, subtitle: 'Aguardando sua estimativa', to, tone: 'attention', category: 'action' });
    } else if (p?.status === 'PENDING') {
      out.push({ key: `wait-${c.id}`, icon: <IconWaiting size={sz} />, title: `Aguardando resposta de ${who}`, subtitle: p.type === 'PRE' ? 'Estimativa enviada' : 'Proposta final enviada', to, tone: 'info', category: 'action' });
    } else if (p?.type === 'PRE' && p.status === 'ACCEPTED') {
      out.push({ key: `visit-${c.id}`, icon: <IconLocation size={sz} />, title: `Agende a visita de ${who}`, subtitle: 'Estimativa aceita', to, tone: 'info', category: 'agenda' });
    } else if (c.quoteStatus === 'PAID') {
      out.push({ key: `exec-${c.id}`, icon: <IconScheduled size={sz} />, title: `Combine a execução com ${who}`, subtitle: 'Pagamento confirmado', to, tone: 'info', category: 'agenda' });
    } else if (c.quoteStatus === 'EXECUTION_SCHEDULED') {
      out.push({ key: `start-${c.id}`, icon: <IconExecution size={sz} />, title: `Inicie o serviço de ${who}`, subtitle: 'Execução agendada', to, tone: 'success', category: 'agenda' });
    }
  }

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const todayEnd = todayStart + 86400_000;
  for (const v of visits) {
    const to = visitLink(v);
    if (v.status === 'RESCHEDULED') {
      out.push({ key: `resched-${v.id}`, icon: <IconReschedule size={sz} />, title: `Confirme a nova data com ${v.clientName}`, subtitle: 'Cliente sugeriu outro horário', to, tone: 'attention', category: 'agenda' });
    }
    if (v.scheduledAt && v.status !== 'CANCELED') {
      const t = new Date(v.scheduledAt).getTime();
      if (t >= todayStart && t < todayEnd) {
        out.push({ key: `today-${v.id}`, icon: <IconClock size={sz} />, title: `Hoje: ${v.clientName}`, subtitle: v.type === 'EXECUTION' ? 'Execução' : 'Visita técnica', meta: timeOf(v.scheduledAt), to, tone: 'attention', category: 'agenda' });
      }
    }
  }

  // Financeiro: repasses recebidos na semana.
  if (dash && dash.revenueWeekCents > 0) {
    out.push({ key: 'finance-week', icon: <IconPayment size={sz} />, title: 'Repasses recebidos', subtitle: `${formatBRL(dash.revenueWeekCents)} nos últimos 7 dias`, to: '/app/financeiro', tone: 'finance', category: 'finance' });
  }

  return out;
}

// ───────── agenda (próximos 5 dias) ─────────
function buildAgenda(visits: ProviderVisit[]): ProviderVisit[] {
  const start = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const end = start + 5 * 86400_000;
  return visits
    .filter((v) => v.scheduledAt && v.status !== 'CANCELED' && v.status !== 'COMPLETED')
    .filter((v) => {
      const t = new Date(v.scheduledAt!).getTime();
      return t >= start && t <= end;
    })
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
}

function visitStatusChip(status: ProviderVisit['status']): { label: string; varName: string } {
  switch (status) {
    case 'CONFIRMED':
      return { label: 'Confirmada', varName: '--color-status-finished' };
    case 'PENDING':
    case 'SUGGESTED':
      return { label: 'Aguardando cliente', varName: '--color-status-waiting' };
    case 'RESCHEDULED':
      return { label: 'Reagendar', varName: '--color-status-waiting' };
    case 'COMPLETED':
      return { label: 'Realizada', varName: '--color-status-finished' };
    default:
      return { label: status, varName: '--color-text-muted' };
  }
}

// ───────── helpers de formatação ─────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
function firstName(name?: string): string {
  return (name ?? 'Profissional').split(' ')[0];
}
function fmtMins(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${m}` : `${h}h`;
}
function shortDay(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function shortMonth(iso: string): string {
  const [, m] = iso.split('-');
  return MONTHS[Number(m) - 1] ?? iso;
}
function timeOf(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function dayLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  const tomorrow = new Date(today.getTime() + 86400_000);
  if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
