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
import { IconBusiness, IconChat, IconLocation, IconSearch, IconUser } from '../../components/icons';
import { ConversationDrawer } from '../conversations/ConversationDrawer';
import { computeUrgency, URGENCY_VAR } from './urgency';
import type { ProviderQuote } from '../../lib/types';

type Tab = 'oportunidades' | 'andamento';
type Sort = 'urgencia' | 'distancia' | 'data' | 'valor';

export function NegociosPage() {
  const [tab, setTab] = useState<Tab>('oportunidades');
  const tabs: Segment<Tab>[] = [
    { value: 'oportunidades', label: 'Oportunidades' },
    { value: 'andamento', label: 'Em andamento' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Trabalhos" subtitle="Novas oportunidades e os trabalhos em andamento." />
      <SegmentedTabs segments={tabs} value={tab} onChange={setTab} />
      {tab === 'oportunidades' ? <OpportunitiesTab /> : <WorksTab />}
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

  // Novos = orçamentos onde o prestador ainda não abriu conversa.
  const list = useMemo(() => (quotes ?? []).filter((q) => !q.myConversationId), [quotes]);
  const categories = useMemo(
    () => Array.from(new Set(list.map((q) => q.categoryName))).sort(),
    [list],
  );
  const priceCap = useMemo(
    () => Math.max(0, ...list.map((q) => (q.budgetMaxCents ?? 0) / 100)),
    [list],
  );

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
        default: // urgencia: menos dias restantes primeiro
          return computeUrgency(a.createdAt).daysLeft - computeUrgency(b.createdAt).daysLeft;
      }
    });
    return arr;
  }, [list, search, category, sort, maxDistance, maxPrice]);

  if (isLoading) return <Spinner label="Carregando oportunidades…" />;
  if (isError) return <p className="text-danger">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      {/* Filtros */}
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
          hint="Ajuste os filtros ou sua área de atendimento. Trabalhos já iniciados ficam em “Em andamento”."
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

// ───────── Em andamento: conversas/trabalhos já iniciados ─────────
function WorksTab() {
  const { data, isLoading, isError, error } = useMyConversations();
  const navigate = useNavigate();
  const [openConv, setOpenConv] = useState<string | null>(null);

  if (isLoading) return <Spinner label="Carregando…" />;
  if (isError) return <p className="text-danger">{(error as Error).message}</p>;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<IconBusiness size={26} />}
        title="Nenhum trabalho em andamento"
        hint="Abra uma oportunidade e envie sua proposta para começar."
      />
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={c.counterpartName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{c.counterpartName}</span>
                    {c.latestProposal && (
                      <span className="shrink-0 font-semibold text-primary">
                        {formatBRL(c.latestProposal.amountCents)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-text-muted">{c.lastMessage?.body ?? '—'}</span>
                    {c.status !== 'ACTIVE' && (
                      <StatusChip label="Encerrada" varName="--color-status-canceled" size="sm" />
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => navigate(`/orcamento/${c.quoteId}`)}>
                  Ver orçamento
                </Button>
                <Button size="sm" onClick={() => setOpenConv(c.id)} startContent={<IconChat size={15} />}>
                  Abrir conversa
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <ConversationDrawer
        conversationId={openConv}
        isOpen={openConv !== null}
        onClose={() => setOpenConv(null)}
      />
    </>
  );
}
