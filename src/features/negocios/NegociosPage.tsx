import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@heroui/react';
import { useMyConversations, useOpenQuotes, useProviderProfile } from '../../lib/queries';
import { formatBRL, formatDateTime } from '../../lib/format';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  SegmentedTabs,
  Select,
  Spinner,
  StatusChip,
} from '../../components/ui';
import type { Segment } from '../../components/ui';
import { IconBusiness, IconChat, IconClock, IconLocation, IconSearch, IconUser } from '../../components/icons';
import { ConversationDrawer } from '../conversations/ConversationDrawer';
import { computeUrgency, URGENCY_VAR } from './urgency';
import type { ConversationSummary, ProviderQuote, QuoteStatus } from '../../lib/types';

type Tab = 'oportunidades' | 'negociacao' | 'execucao' | 'finalizados';
type Sort = 'urgencia' | 'distancia' | 'data' | 'valor';

/** Grupos de status do orçamento por etapa do ciclo de trabalho. */
const NEGOTIATING_Q: QuoteStatus[] = ['WAITING_PROPOSALS', 'IN_NEGOTIATION', 'PROVIDER_SELECTED', 'WAITING_PAYMENT'];
const EXECUTING_Q: QuoteStatus[] = ['PAID', 'EXECUTION_SCHEDULED', 'IN_PROGRESS'];
const FINISHED_Q: QuoteStatus[] = ['FINISHED', 'CANCELED'];

export function NegociosPage() {
  const [tab, setTab] = useState<Tab>('oportunidades');

  const quotesQ = useOpenQuotes();
  const convsQ = useMyConversations();

  const newCount = (quotesQ.data ?? []).filter((q) => !q.myConversationId).length;
  const convs = convsQ.data ?? [];
  const negCount = convs.filter((c) => NEGOTIATING_Q.includes(c.quoteStatus)).length;
  const execCount = convs.filter((c) => EXECUTING_Q.includes(c.quoteStatus)).length;
  const doneCount = convs.filter((c) => FINISHED_Q.includes(c.quoteStatus)).length;

  const tabs: Segment<Tab>[] = [
    { value: 'oportunidades', label: 'Oportunidades', count: newCount },
    { value: 'negociacao', label: 'Em negociação', count: negCount },
    { value: 'execucao', label: 'Em execução', count: execCount },
    { value: 'finalizados', label: 'Finalizados', count: doneCount },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Trabalhos" subtitle="Acompanhe cada etapa: oportunidades, negociação, execução e concluídos." />
      <SegmentedTabs segments={tabs} value={tab} onChange={setTab} />

      {tab === 'oportunidades' && <OpportunitiesTab />}
      {tab === 'negociacao' && (
        <WorksList
          variant="negotiation"
          loading={convsQ.isLoading}
          conversations={convs.filter((c) => NEGOTIATING_Q.includes(c.quoteStatus))}
          empty="Nenhuma negociação em aberto. Responda uma oportunidade para começar."
        />
      )}
      {tab === 'execucao' && (
        <WorksList
          variant="execution"
          loading={convsQ.isLoading}
          conversations={convs.filter((c) => EXECUTING_Q.includes(c.quoteStatus))}
          empty="Nenhum trabalho em execução. Quando um cliente pagar, ele aparece aqui."
        />
      )}
      {tab === 'finalizados' && (
        <WorksList
          variant="finished"
          loading={convsQ.isLoading}
          conversations={convs.filter((c) => FINISHED_Q.includes(c.quoteStatus))}
          empty="Nenhum serviço concluído ainda."
        />
      )}
    </div>
  );
}

// ───────── Oportunidades: só orçamentos NOVOS (sem interação do prestador) ─────────
function OpportunitiesTab() {
  const { data: quotes, isLoading, isError, error } = useOpenQuotes();
  const profileQ = useProviderProfile();
  const navigate = useNavigate();
  const noCategories = profileQ.data && profileQ.data.categoryIds.length === 0;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('data'); // padrão: mais recentes
  const [maxDistance, setMaxDistance] = useState(50);
  const [maxPrice, setMaxPrice] = useState(0); // 0 = sem limite

  const list = useMemo(() => (quotes ?? []).filter((q) => !q.myConversationId), [quotes]);
  const categories = useMemo(() => Array.from(new Set(list.map((q) => q.categoryName))).sort(), [list]);
  const priceCap = useMemo(() => Math.max(0, ...list.map((q) => (q.budgetMaxCents ?? 0) / 100)), [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = list.filter((it) => {
      if (category && it.categoryName !== category) return false;
      if (it.distanceKm != null && it.distanceKm > maxDistance) return false;
      if (maxPrice > 0 && it.budgetMaxCents != null && it.budgetMaxCents / 100 > maxPrice) return false;
      if (q) {
        const hay = `${it.clientName} ${it.categoryName} ${it.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (sort) {
        case 'distancia':
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        case 'valor':
          return (b.budgetMaxCents ?? 0) - (a.budgetMaxCents ?? 0);
        case 'data':
          return b.createdAt.localeCompare(a.createdAt);
        default:
          return computeUrgency(a.createdAt).daysLeft - computeUrgency(b.createdAt).daysLeft;
      }
    });
    return arr;
  }, [list, search, category, sort, maxDistance, maxPrice]);

  if (isLoading) return <Spinner label="Carregando oportunidades…" />;
  if (isError) return <p className="text-danger">{(error as Error).message}</p>;

  if (noCategories) {
    return (
      <EmptyState
        icon={<IconBusiness size={26} />}
        title="Escolha suas categorias"
        hint="Só mostramos oportunidades das categorias que você atende. Configure as categorias no seu perfil para começar a receber trabalhos relevantes."
        action={
          <Button size="sm" onClick={() => navigate('/app/perfil')}>
            Configurar perfil
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3.5">
        <Input
          placeholder="Buscar por cliente, categoria…"
          value={search}
          onChange={setSearch}
          startContent={<IconSearch size={16} className="text-text-muted" />}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Categoria"
            placeholder="Todas"
            options={[{ value: '', label: 'Todas' }, ...categories.map((c) => ({ value: c, label: c }))]}
            value={category}
            onChange={setCategory}
          />
          <Select
            label="Ordenar por"
            options={[
              { value: 'urgencia', label: 'Urgência' },
              { value: 'distancia', label: 'Distância' },
              { value: 'data', label: 'Mais recentes' },
              { value: 'valor', label: 'Maior valor' },
            ]}
            value={sort}
            onChange={(v) => setSort(v as Sort)}
          />
        </div>
        <Slider
          label="Distância máxima"
          size="sm"
          minValue={1}
          maxValue={50}
          value={maxDistance}
          onChange={(v) => setMaxDistance(Array.isArray(v) ? v[0] : v)}
          getValue={(v) => `${v} km`}
          className="px-1"
        />
        {priceCap > 0 && (
          <Slider
            label="Orçamento do cliente até"
            size="sm"
            minValue={0}
            maxValue={Math.ceil(priceCap)}
            step={50}
            value={maxPrice}
            onChange={(v) => setMaxPrice(Array.isArray(v) ? v[0] : v)}
            getValue={(v) => (Number(v) === 0 ? 'Qualquer' : `R$ ${v}`)}
            className="px-1"
          />
        )}
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconLocation size={26} />}
          title="Nenhuma oportunidade nova"
          hint="Ajuste os filtros ou sua área de atendimento. Trabalhos já iniciados ficam nas outras abas."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((q) => (
            <li key={q.id}>
              <OpportunityCard quote={q} onView={() => navigate(`/app/orcamento/${q.id}`)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpportunityCard({ quote: q, onView }: { quote: ProviderQuote; onView: () => void }) {
  const u = computeUrgency(q.createdAt);
  return (
    <Card className="p-4">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{q.title ?? q.categoryName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
            <IconUser size={12} /> {q.clientName} · {q.categoryName}
          </p>
        </div>
        {u.urgent ? (
          <StatusChip label={u.label} varName={URGENCY_VAR[u.tone]} size="sm" />
        ) : (
          <span className="shrink-0 text-[11px] text-text-muted">{u.label}</span>
        )}
      </div>

      <p className="line-clamp-2 text-sm text-text-muted">{q.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        {(q.neighborhood || q.city) && (
          <span className="inline-flex items-center gap-1">
            <IconLocation size={12} /> {[q.neighborhood, q.city].filter(Boolean).join(', ')}
          </span>
        )}
        {q.distanceKm != null && <span>{q.distanceKm.toFixed(1)} km</span>}
        <span>{formatDateTime(q.createdAt)}</span>
        {q.budgetMaxCents != null && (
          <span className="font-medium text-primary">até {formatBRL(q.budgetMaxCents)}</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {q.requiresVisit ? (
          <StatusChip label="Pede visita" varName="--color-status-waiting" size="sm" />
        ) : (
          <span />
        )}
        <Button size="sm" onClick={onView}>
          Visualizar orçamento
        </Button>
      </div>
    </Card>
  );
}

// ───────── Lista de trabalhos (negociação / execução / finalizados) ─────────
type WorksVariant = 'negotiation' | 'execution' | 'finished';

function WorksList({
  variant,
  conversations,
  loading,
  empty,
}: {
  variant: WorksVariant;
  conversations: ConversationSummary[];
  loading?: boolean;
  empty: string;
}) {
  const navigate = useNavigate();
  const [openConv, setOpenConv] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'old'>('recent');
  const [onlyAction, setOnlyAction] = useState(false);

  const activityAt = (c: ConversationSummary) => c.lastMessage?.createdAt ?? '';
  const sorted = useMemo(() => {
    const arr = [...conversations];
    arr.sort((a, b) =>
      sort === 'recent' ? activityAt(b).localeCompare(activityAt(a)) : activityAt(a).localeCompare(activityAt(b)),
    );
    return arr;
  }, [conversations, sort]);

  // "Precisam de você": itens onde é a vez do prestador agir (workHint tone = action).
  const actionCount = useMemo(
    () => conversations.filter((c) => workHint(c).tone === 'action').length,
    [conversations],
  );
  const visible = onlyAction ? sorted.filter((c) => workHint(c).tone === 'action') : sorted;

  if (loading) return <Spinner label="Carregando…" />;
  if (conversations.length === 0) {
    return <EmptyState icon={<IconBusiness size={26} />} title="Nada por aqui" hint={empty} />;
  }

  return (
    <div className="space-y-3">
      {(actionCount > 0 || variant === 'negotiation') && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {variant !== 'finished' && actionCount > 0 ? (
            <button
              type="button"
              onClick={() => setOnlyAction((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                onlyAction
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-content1 text-text-muted hover:text-foreground'
              }`}
              aria-pressed={onlyAction}
            >
              <IconClock size={13} /> Precisam de você
              <span className={`rounded-full px-1.5 ${onlyAction ? 'bg-primary/25 text-primary' : 'bg-content2 text-foreground'}`}>
                {actionCount}
              </span>
            </button>
          ) : (
            <span />
          )}
          {variant === 'negotiation' && (
            <Select
              aria-label="Ordenar"
              options={[
                { value: 'recent', label: 'Atividade recente' },
                { value: 'old', label: 'Mais antigos' },
              ]}
              value={sort}
              onChange={(v) => setSort(v as 'recent' | 'old')}
            />
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconBusiness size={26} />}
          title="Tudo em dia"
          hint="Nada aguardando a sua ação agora. Toque em “Precisam de você” de novo para ver todos."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <li key={c.id}>
              <WorkCard
                conv={c}
                onView={() => navigate(`/app/orcamento/${c.quoteId}`)}
                onOpenChat={() => setOpenConv(c.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <ConversationDrawer conversationId={openConv} isOpen={openConv !== null} onClose={() => setOpenConv(null)} />
    </div>
  );
}

/**
 * Próximo passo do prestador, derivado do estado — visível na lista sem abrir a conversa.
 * `action` = é a vez dele (destaque); `waiting` = aguardando o cliente; `done` = encerrado.
 */
type WorkHint = { label: string; tone: 'action' | 'waiting' | 'done' };
const HINT_CLASS: Record<WorkHint['tone'], string> = {
  action: 'bg-primary/15 text-primary',
  waiting: 'bg-content2 text-text-muted',
  done: 'bg-emerald-500/15 text-emerald-300',
};

function workHint(c: ConversationSummary): WorkHint {
  const lm = c.lastMessage;
  const clientReplied = Boolean(lm?.senderId && lm.senderId === c.counterpartId);
  switch (c.quoteStatus) {
    case 'WAITING_PROPOSALS':
    case 'IN_NEGOTIATION':
      if (!c.latestProposal) return { label: 'Sua vez: envie uma proposta', tone: 'action' };
      if (c.latestProposal.status === 'PENDING')
        return clientReplied
          ? { label: 'Cliente respondeu — veja', tone: 'action' }
          : { label: 'Aguardando o cliente decidir', tone: 'waiting' };
      return clientReplied
        ? { label: 'Cliente respondeu — responda', tone: 'action' }
        : { label: 'Em negociação', tone: 'waiting' };
    case 'PROVIDER_SELECTED':
    case 'WAITING_PAYMENT':
      return { label: 'Aguardando pagamento do cliente', tone: 'waiting' };
    case 'PAID':
      return { label: 'Sua vez: agende a execução', tone: 'action' };
    case 'EXECUTION_SCHEDULED':
      return { label: 'Sua vez: inicie o serviço na data', tone: 'action' };
    case 'IN_PROGRESS':
      return c.providerDoneAt
        ? { label: 'Aguardando o cliente confirmar a conclusão', tone: 'waiting' }
        : { label: 'Sua vez: marque como concluído', tone: 'action' };
    case 'FINISHED':
      if (c.externalPayment && !c.externalPaymentConfirmedAt)
        return { label: 'Sua vez: confirme o recebimento', tone: 'action' };
      return { label: 'Concluído', tone: 'done' };
    case 'CANCELED':
      return { label: 'Cancelado', tone: 'done' };
    default:
      return { label: 'Aguardando', tone: 'waiting' };
  }
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function WorkCard({
  conv: c,
  onView,
  onOpenChat,
}: {
  conv: ConversationSummary;
  onView: () => void;
  onOpenChat: () => void;
}) {
  const hint = workHint(c);
  const unread = c.unreadCount ?? 0;
  return (
    <Card className={`p-4 ${unread > 0 ? 'border-primary/40 bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar name={c.counterpartName} src={c.counterpartAvatarUrl} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">{c.quoteTitle ?? c.counterpartName}</span>
            {c.latestProposal && (
              <span className="shrink-0 font-semibold text-primary">{formatBRL(c.latestProposal.amountCents)}</span>
            )}
          </div>
          {c.quoteTitle && <p className="truncate text-xs text-text-muted">{c.counterpartName}</p>}
          <p className={`mt-0.5 truncate text-sm ${unread > 0 ? 'font-medium text-foreground' : 'text-text-muted'}`}>
            {c.lastMessage?.body ?? '—'}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {unread > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <IconChat size={11} /> {unread} nova{unread > 1 ? 's' : ''} mensage{unread > 1 ? 'ns' : 'm'}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${HINT_CLASS[hint.tone]}`}>
              {hint.label}
            </span>
            <StatusChip status={c.quoteStatus} size="sm" />
            {c.lastMessage && (
              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                <IconClock size={11} /> {relative(c.lastMessage.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onView}>
          Ver orçamento
        </Button>
        <Button size="sm" onClick={onOpenChat} startContent={<IconChat size={15} />}>
          Abrir conversa
        </Button>
      </div>
    </Card>
  );
}
