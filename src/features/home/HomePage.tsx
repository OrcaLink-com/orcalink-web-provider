import type { ReactNode } from 'react';
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
  Card,
  EmptyState,
  RatingStars,
  SectionHeader,
  Spinner,
  StatCard,
} from '../../components/ui';
import {
  IconAgenda,
  IconChevronRight,
  IconClock,
  IconCompare,
  IconEdit,
  IconExecution,
  IconLocation,
  IconReschedule,
  IconScheduled,
  IconSuccess,
  IconWaiting,
} from '../../components/icons';
import type { ConversationSummary, ProviderVisit } from '../../lib/types';

export function HomePage() {
  const { user } = useAuth();
  const dashQ = useProviderDashboard();
  const convQ = useMyConversations();
  const visitsQ = useMyVisits();

  const d = dashQ.data;
  const conversations = convQ.data ?? [];
  const visits = visitsQ.data ?? [];

  const alerts = buildAlerts(conversations, visits);
  const agenda = buildAgenda(visits);

  if (dashQ.isLoading) return <Spinner label="Carregando seu painel…" />;

  const revenueData = (d?.revenueSeries ?? []).map((p) => ({ label: shortDay(p.label), value: p.value }));
  const servicesData = (d?.monthlyServices ?? []).map((p) => ({ label: shortMonth(p.label), value: p.value }));

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

      {/* Avisos inteligentes */}
      <section>
        <SectionHeader title="Avisos" />
        {alerts.length === 0 ? (
          <EmptyState icon={<IconSuccess size={24} />} title="Tudo em dia" />
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {alerts.map((a) => (
              <li key={a.key}>
                <Link
                  to={a.to}
                  className={`flex items-center gap-3 rounded-large border border-l-4 bg-content1 p-3.5 shadow-card ${toneBorder[a.tone]}`}
                >
                  <span className={toneText[a.tone]}>{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.subtitle && <p className="truncate text-xs text-text-muted">{a.subtitle}</p>}
                  </div>
                  <IconChevronRight size={18} className="shrink-0 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Agenda */}
      <section>
        <SectionHeader title="Agenda" action={<Link to="/app/agenda" className="text-xs font-medium text-primary">Ver agenda</Link>} />
        {agenda.length === 0 ? (
          <EmptyState icon={<IconAgenda size={24} />} title="Nada agendado nos próximos dias" />
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {agenda.map((v) => (
              <li key={v.id}>
                <Card className="flex items-center gap-3 p-3.5">
                  <span className="shrink-0 rounded-medium bg-status-scheduled/20 px-2.5 py-1.5 text-center text-xs font-bold text-status-scheduled">
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
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ───────── avisos ─────────
type Tone = 'attention' | 'info' | 'danger' | 'success';
interface Alert {
  key: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  to: string;
  tone: Tone;
}
const toneBorder: Record<Tone, string> = {
  attention: 'border-border border-l-warning',
  info: 'border-border border-l-primary',
  danger: 'border-border border-l-danger',
  success: 'border-border border-l-success',
};
const toneText: Record<Tone, string> = {
  attention: 'text-warning',
  info: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
};

function buildAlerts(conversations: ConversationSummary[], visits: ProviderVisit[]): Alert[] {
  const sz = 18;
  const out: Alert[] = [];

  for (const c of conversations) {
    const to = `/conversa/${c.id}`;
    const who = c.counterpartName;
    const p = c.latestProposal;
    if (c.status === 'ACTIVE' && !p) {
      out.push({ key: `resp-${c.id}`, icon: <IconEdit size={sz} />, title: `Responda ${who}`, subtitle: 'Aguardando sua estimativa', to, tone: 'attention' });
    } else if (p?.type === 'PRE' && p.status === 'ACCEPTED') {
      out.push({ key: `visit-${c.id}`, icon: <IconLocation size={sz} />, title: `Agende a visita de ${who}`, subtitle: 'Estimativa aceita', to, tone: 'info' });
    } else if (c.quoteStatus === 'PAID') {
      out.push({ key: `exec-${c.id}`, icon: <IconScheduled size={sz} />, title: `Combine a execução com ${who}`, subtitle: 'Pagamento confirmado', to, tone: 'info' });
    } else if (c.quoteStatus === 'EXECUTION_SCHEDULED') {
      out.push({ key: `start-${c.id}`, icon: <IconExecution size={sz} />, title: `Inicie o serviço de ${who}`, subtitle: 'Execução agendada', to, tone: 'success' });
    }
  }

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const todayEnd = todayStart + 86400_000;
  for (const v of visits) {
    if (v.status === 'RESCHEDULED') {
      out.push({ key: `resched-${v.id}`, icon: <IconReschedule size={sz} />, title: `Confirme a nova data com ${v.clientName}`, subtitle: 'Cliente sugeriu outro horário', to: `/conversa/${v.quoteId}`, tone: 'attention' });
    }
    if (v.scheduledAt && v.status !== 'CANCELED') {
      const t = new Date(v.scheduledAt).getTime();
      if (t >= todayStart && t < todayEnd) {
        out.push({ key: `today-${v.id}`, icon: <IconClock size={sz} />, title: `Hoje: ${v.clientName} às ${timeOf(v.scheduledAt)}`, subtitle: v.type === 'EXECUTION' ? 'Execução' : 'Visita técnica', to: `/conversa/${v.quoteId}`, tone: 'attention' });
      }
    }
  }
  return out;
}

function buildAgenda(visits: ProviderVisit[]): ProviderVisit[] {
  const now = Date.now();
  const in7 = now + 7 * 86400_000;
  return visits
    .filter((v) => v.scheduledAt && v.status !== 'CANCELED')
    .filter((v) => {
      const t = new Date(v.scheduledAt!).getTime();
      return t >= now - 86400_000 && t <= in7;
    })
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
    .slice(0, 6);
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
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
