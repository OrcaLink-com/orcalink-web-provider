import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@heroui/react';
import { useMyConversations, useOpenQuotes } from '../../lib/queries';
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
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('urgencia');
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
              <OpportunityCard quote={q} onView={() => navigate(`/orcamento/${q.id}`)} />
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
          <p className="font-semibold">{q.categoryName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
            <IconUser size={12} /> {q.clientName}
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
        {q.distanceKm != null && (
          <span className="inline-flex items-center gap-1">
            <IconLocation size={12} /> {q.distanceKm.toFixed(1)} km
          </span>
        )}
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

  const activityAt = (c: ConversationSummary) => c.lastMessage?.createdAt ?? '';
  const sorted = useMemo(() => {
    const arr = [...conversations];
    arr.sort((a, b) =>
      sort === 'recent' ? activityAt(b).localeCompare(activityAt(a)) : activityAt(a).localeCompare(activityAt(b)),
    );
    return arr;
  }, [conversations, sort]);

  if (loading) return <Spinner label="Carregando…" />;
  if (conversations.length === 0) {
    return <EmptyState icon={<IconBusiness size={26} />} title="Nada por aqui" hint={empty} />;
  }

  return (
    <div className="space-y-3">
      {variant === 'negotiation' && (
        <div className="flex justify-end">
          <Select
            aria-label="Ordenar"
            options={[
              { value: 'recent', label: 'Atividade recente' },
              { value: 'old', label: 'Mais antigos' },
            ]}
            value={sort}
            onChange={(v) => setSort(v as 'recent' | 'old')}
          />
        </div>
      )}

      <ul className="space-y-3">
        {sorted.map((c) => (
          <li key={c.id}>
            <WorkCard
              conv={c}
              variant={variant}
              onView={() => navigate(`/orcamento/${c.quoteId}`)}
              onOpenChat={() => setOpenConv(c.id)}
            />
          </li>
        ))}
      </ul>

      <ConversationDrawer conversationId={openConv} isOpen={openConv !== null} onClose={() => setOpenConv(null)} />
    </div>
  );
}

/** Indicador de atenção (só na aba Em negociação): o que precisa de ação. */
function attentionBadge(c: ConversationSummary): { label: string; className: string } | null {
  const lm = c.lastMessage;
  // Última mensagem foi do cliente (senderId = contraparte) → precisa responder.
  if (lm && lm.senderId && lm.senderId === c.counterpartId) {
    return { label: 'Cliente respondeu', className: 'bg-amber-500/15 text-amber-300' };
  }
  if (!c.latestProposal) {
    return { label: 'Envie uma proposta', className: 'bg-sky-500/15 text-sky-300' };
  }
  if (c.quoteStatus === 'WAITING_PAYMENT') {
    return { label: 'Aguardando pagamento', className: 'bg-emerald-500/15 text-emerald-300' };
  }
  return { label: 'Aguardando cliente', className: 'bg-content2 text-text-muted' };
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
  variant,
  onView,
  onOpenChat,
}: {
  conv: ConversationSummary;
  variant: WorksVariant;
  onView: () => void;
  onOpenChat: () => void;
}) {
  const badge = variant === 'negotiation' ? attentionBadge(c) : null;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={c.counterpartName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">{c.counterpartName}</span>
            {c.latestProposal && (
              <span className="shrink-0 font-semibold text-primary">{formatBRL(c.latestProposal.amountCents)}</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-text-muted">{c.lastMessage?.body ?? '—'}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {badge ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            ) : (
              <StatusChip status={c.quoteStatus} size="sm" />
            )}
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
