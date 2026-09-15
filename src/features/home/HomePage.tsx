import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useMyConversations, useMyVisits, useProviderDashboard } from '../../lib/queries';
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
  IconEdit,
  IconExecution,
  IconLocation,
  IconReschedule,
  IconScheduled,
  IconSuccess,
} from '../../components/icons';
import { OnboardingChecklist } from '../../components/OnboardingChecklist';
import type { ConversationSummary, ProviderVisit } from '../../lib/types';

/**
 * Home do prestador — organizada por "o que eu faço agora?":
 *   1) Onboarding (some quando o cadastro está completo)
 *   2) Como funciona (só no primeiro acesso, sem histórico)
 *   3) Oportunidades novas · Precisa de você  → ações
 *   4) Próximos compromissos
 *   5) Acompanhando (aguardando o cliente) — mais discreto
 *   6) Seu desempenho (métricas + gráficos) — só quando já há atividade
 * Métricas e gráficos ficam por último e só aparecem com atividade, para não
 * afogar quem está começando em números zerados.
 */
export function HomePage() {
  const { user } = useAuth();
  const dashQ = useProviderDashboard();
  const convQ = useMyConversations();
  const visitsQ = useMyVisits();

  const d = dashQ.data;
  const conversations = convQ.data ?? [];
  const visits = visitsQ.data ?? [];

  const { actions, waiting } = useMemo(() => buildAlerts(conversations, visits), [conversations, visits]);
  const agenda = useMemo(() => buildAgenda(visits), [visits]);

  if (dashQ.isLoading) return <Spinner label="Carregando seu painel…" />;

  const newOpps = d?.newOpportunitiesToday ?? 0;
  const brandNew = conversations.length === 0 && visits.length === 0;
  const showPerformance =
    !!d && (d.revenueMonthCents > 0 || d.finished > 0 || d.inProgress > 0 || conversations.length > 0);

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
        {d && d.ratingCount > 0 && <RatingStars value={d.ratingAvg} count={d.ratingCount} />}
      </header>

      {/* Onboarding: some sozinho quando o cadastro está completo */}
      <OnboardingChecklist />

      {/* Primeiro acesso: explica o fluxo em 4 passos, sem tutorial gigante */}
      {brandNew && <HowItWorks />}

      {/* Oportunidades novas — porta de entrada de trabalho */}
      {newOpps > 0 && (
        <Link
          to="/app/negocios"
          className="flex items-center gap-3 rounded-large border border-primary/40 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <IconLocation size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">
              {newOpps} nova{newOpps > 1 ? 's' : ''} oportunidade{newOpps > 1 ? 's' : ''} na sua região
            </p>
            <p className="text-xs text-text-muted">Responda rápido para aumentar suas chances.</p>
          </div>
          <IconChevronRight size={18} className="shrink-0 text-primary" />
        </Link>
      )}

      {/* Precisa de você — só o que depende de uma ação sua */}
      <section>
        <SectionHeader title="Precisa de você" />
        {actions.length === 0 ? (
          <EmptyState
            icon={<IconSuccess size={24} />}
            title="Tudo em dia"
            hint="Quando um cliente responder ou algo precisar de você, aparece aqui."
          />
        ) : (
          <AlertList items={actions} />
        )}
      </section>

      {/* Próximos compromissos */}
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
        {agenda.length > 0 && (
          <ButtonLink to="/app/agenda" variant="secondary" full className="mt-3">
            Ver agenda completa
          </ButtonLink>
        )}
      </section>

      {/* Acompanhando — aguardando o cliente (informativo, discreto) */}
      {waiting.length > 0 && (
        <section>
          <SectionHeader title="Acompanhando" />
          <AlertList items={waiting} muted />
        </section>
      )}

      {/* Seu desempenho — só quando já há atividade */}
      {showPerformance && d && (
        <section className="space-y-3">
          <SectionHeader title="Seu desempenho" />
          <div className="flex gap-2.5">
            <StatCard value={formatBRL(d.revenueMonthCents)} label="Receita (30d)" icon={<IconSuccess size={16} />} accent />
            <StatCard value={d.inProgress} label="Em andamento" icon={<IconExecution size={16} />} />
            <StatCard value={d.finished} label="Concluídos" icon={<IconSuccess size={16} />} />
          </div>
          {revenueData.some((p) => p.value > 0) && (
            <Card className="p-3">
              <AreaTrend data={revenueData} format={(v) => formatBRL(v)} />
            </Card>
          )}
          {servicesData.some((p) => p.value > 0) && (
            <Card className="p-3">
              <BarTrend data={servicesData} format={(v) => `${v} serviço(s)`} />
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

/* ───────── Como funciona (primeiro acesso) ───────── */
function HowItWorks() {
  const steps = [
    { t: 'Receba oportunidades', d: 'Pedidos de orçamento da sua região aparecem em Trabalhos.' },
    { t: 'Converse e proponha', d: 'Fale com o cliente e envie uma estimativa ou proposta.' },
    { t: 'Visite, se precisar', d: 'Agende uma visita técnica quando o serviço exigir avaliação.' },
    { t: 'Execute e receba', d: 'Combine a execução, conclua o serviço e receba a avaliação.' },
  ];
  return (
    <Card className="p-5">
      <h2 className="text-base font-bold">Como o OrcaLink funciona</h2>
      <p className="mt-0.5 text-sm text-text-muted">Você recebe pedidos, negocia direto com o cliente e fecha o serviço.</p>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{s.t}</p>
              <p className="text-xs text-text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ───────── Lista de avisos ───────── */
function AlertList({ items, muted = false }: { items: Alert[]; muted?: boolean }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-large border border-border bg-content1 shadow-card">
      {items.map((a) => (
        <li key={a.key}>
          <Link to={a.to} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-card-2">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                muted ? 'bg-content2 text-text-muted' : toneChip[a.tone]
              }`}
            >
              {a.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.title}</p>
              {a.subtitle && <p className="truncate text-xs text-text-muted">{a.subtitle}</p>}
            </div>
            {a.meta && <span className="shrink-0 text-xs font-medium text-text-muted">{a.meta}</span>}
            <IconChevronRight size={18} className="shrink-0 text-text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ───────── avisos ─────────
type Tone = 'attention' | 'info' | 'danger' | 'success' | 'message';
interface Alert {
  key: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  to: string;
  tone: Tone;
}
const toneChip: Record<Tone, string> = {
  attention: 'bg-warning/15 text-warning',
  info: 'bg-primary/15 text-primary',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-emerald-500/15 text-emerald-300',
  message: 'bg-sky-500/15 text-sky-300',
};

function convLink(conversationId: string): string {
  return `/app/conversa/${conversationId}`;
}
function visitLink(v: ProviderVisit): string {
  return v.conversationId ? `/app/conversa/${v.conversationId}` : `/app/orcamento/${v.quoteId}`;
}

/**
 * Separa os avisos em "actions" (dependem de uma ação sua → destaque) e "waiting"
 * (aguardando o cliente → só acompanhar). Mensagens não lidas contam como ação.
 */
function buildAlerts(
  conversations: ConversationSummary[],
  visits: ProviderVisit[],
): { actions: Alert[]; waiting: Alert[] } {
  const sz = 18;
  const actions: Alert[] = [];
  const waiting: Alert[] = [];

  for (const c of conversations) {
    const to = convLink(c.id);
    const who = c.counterpartName;
    const p = c.latestProposal;

    if (c.unreadCount > 0) {
      actions.push({ key: `msg-${c.id}`, icon: <IconChat size={sz} />, title: `Nova mensagem de ${who}`, subtitle: `${c.unreadCount} não lida(s)`, to, tone: 'message' });
    }

    if (c.status === 'ACTIVE' && !p) {
      actions.push({ key: `resp-${c.id}`, icon: <IconEdit size={sz} />, title: `Responda ${who}`, subtitle: 'Envie uma estimativa ou proposta', to, tone: 'attention' });
    } else if (p?.status === 'PENDING') {
      waiting.push({ key: `wait-${c.id}`, icon: <IconClock size={sz} />, title: `Aguardando ${who}`, subtitle: p.type === 'PRE' ? 'Estimativa enviada' : 'Proposta final enviada', to, tone: 'info' });
    } else if (p?.type === 'PRE' && p.status === 'ACCEPTED') {
      actions.push({ key: `visit-${c.id}`, icon: <IconLocation size={sz} />, title: `Agende a visita de ${who}`, subtitle: 'Estimativa aceita', to, tone: 'attention' });
    } else if (c.quoteStatus === 'PAID') {
      actions.push({ key: `exec-${c.id}`, icon: <IconScheduled size={sz} />, title: `Agende a execução com ${who}`, subtitle: 'Serviço contratado', to, tone: 'attention' });
    } else if (c.quoteStatus === 'EXECUTION_SCHEDULED') {
      actions.push({ key: `start-${c.id}`, icon: <IconExecution size={sz} />, title: `Inicie o serviço de ${who}`, subtitle: 'Execução agendada', to, tone: 'success' });
    }
  }

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const todayEnd = todayStart + 86400_000;
  for (const v of visits) {
    const to = visitLink(v);
    if (v.status === 'RESCHEDULED') {
      actions.push({ key: `resched-${v.id}`, icon: <IconReschedule size={sz} />, title: `Confirme a nova data com ${v.clientName}`, subtitle: 'Cliente sugeriu outro horário', to, tone: 'attention' });
    }
    if (v.scheduledAt && v.status !== 'CANCELED') {
      const t = new Date(v.scheduledAt).getTime();
      if (t >= todayStart && t < todayEnd) {
        actions.push({ key: `today-${v.id}`, icon: <IconClock size={sz} />, title: `Hoje: ${v.clientName}`, subtitle: v.type === 'EXECUTION' ? 'Execução' : 'Visita técnica', meta: timeOf(v.scheduledAt), to, tone: 'attention' });
      }
    }
  }

  return { actions, waiting };
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
