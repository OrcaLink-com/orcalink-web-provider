import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCancelVisit, useMyVisits, useRescheduleVisit } from '../../lib/queries';
import { formatDateTime } from '../../lib/format';
import { VisitManageCard } from '../../components/VisitManageCard';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SegmentedTabs,
  Select,
  Spinner,
  StatusChip,
} from '../../components/ui';
import type { Segment } from '../../components/ui';
import { IconAgenda, IconChat, IconExecution, IconLocation, IconUser } from '../../components/icons';
import type { ProviderVisit, VisitStatus, VisitType } from '../../lib/types';
import { Calendar, VISIT_COLOR } from './Calendar';
import { SchedulePage } from './SchedulePage';
import { ConversationDrawer } from '../conversations/ConversationDrawer';

type Tab = 'calendario' | 'compromissos' | 'disponibilidade';
type Period = 'all' | 'today' | 'upcoming' | 'past';

const STATUS_LABEL: Record<VisitStatus, string> = {
  PENDING: 'Pendente',
  SUGGESTED: 'Aguardando cliente',
  CONFIRMED: 'Confirmada',
  RESCHEDULED: 'Reagendada',
  CANCELED: 'Cancelada',
  COMPLETED: 'Realizada',
};
const TYPE_LABEL: Record<VisitType, string> = { IN_LOCO: 'Visita técnica', EXECUTION: 'Execução' };
const STATUSES: VisitStatus[] = ['SUGGESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELED'];

export function AgendaPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('calendario');
  const visitsQ = useMyVisits();
  const visits = visitsQ.data ?? [];

  const [selected, setSelected] = useState<ProviderVisit | null>(null);
  const [openConv, setOpenConv] = useState<string | null>(null);

  const tabs: Segment<Tab>[] = [
    { value: 'calendario', label: 'Calendário' },
    { value: 'compromissos', label: 'Compromissos', count: visits.filter((v) => v.status !== 'CANCELED').length },
    { value: 'disponibilidade', label: 'Disponibilidade' },
  ];

  function openChat(v: ProviderVisit) {
    setSelected(null);
    if (v.conversationId) setOpenConv(v.conversationId);
  }
  function openQuote(quoteId: string) {
    setSelected(null);
    navigate(`/app/orcamento/${quoteId}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Agenda" subtitle="Seus compromissos, calendário e disponibilidade em um só lugar." />
      <SegmentedTabs segments={tabs} value={tab} onChange={setTab} />

      {tab === 'calendario' &&
        (visitsQ.isLoading ? (
          <Spinner label="Carregando agenda…" />
        ) : (
          <>
            <Calendar visits={visits} onSelect={setSelected} />
            <Legend />
          </>
        ))}

      {tab === 'compromissos' && (
        <AppointmentsList
          visits={visits}
          loading={visitsQ.isLoading}
          onView={setSelected}
          onOpenChat={openChat}
          onQuote={openQuote}
        />
      )}

      {tab === 'disponibilidade' && <SchedulePage />}

      {/* Detalhe do compromisso */}
      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${TYPE_LABEL[selected.type]} · ${selected.clientName}` : ''}
        footer={
          selected && (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => openQuote(selected.quoteId)}>
                Ver orçamento
              </Button>
              {selected.conversationId && (
                <Button size="sm" startContent={<IconChat size={15} />} onClick={() => openChat(selected)}>
                  Abrir conversa
                </Button>
              )}
            </div>
          )
        }
      >
        {selected && <VisitDetail visit={selected} />}
      </Modal>

      <ConversationDrawer conversationId={openConv} isOpen={openConv !== null} onClose={() => setOpenConv(null)} />
    </div>
  );
}

function Legend() {
  const items: VisitStatus[] = ['CONFIRMED', 'SUGGESTED', 'RESCHEDULED', 'COMPLETED', 'CANCELED'];
  return (
    <div className="flex flex-wrap gap-3 px-1 text-xs text-text-muted">
      {items.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${VISIT_COLOR[s].dot}`} /> {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

function VisitDetail({ visit: v }: { visit: ProviderVisit }) {
  const reschedule = useRescheduleVisit(v.quoteId);
  const cancel = useCancelVisit(v.quoteId);
  return (
    <div className="space-y-2 text-sm">
      <Row label="Cliente" value={v.clientName} />
      <Row label="Serviço" value={`${v.quoteCategoryName} · ${TYPE_LABEL[v.type]}`} />
      <Row label="Quando" value={v.scheduledAt ? formatDateTime(v.scheduledAt) : '—'} />
      {v.endsAt && <Row label="Até" value={formatDateTime(v.endsAt)} />}
      <Row label="Endereço / CEP" value={v.zipCode ?? '—'} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-muted">Status da visita</span>
        <span className="font-medium">{STATUS_LABEL[v.status]}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-muted">Etapa do orçamento</span>
        <StatusChip status={v.quoteStatus} size="sm" />
      </div>
      {v.quoteDescription && (
        <div className="rounded-medium bg-content1 p-2 text-xs text-text-muted">{v.quoteDescription}</div>
      )}
      {v.status === 'CONFIRMED' && (
        <div className="-mx-4 -mb-2 mt-2 overflow-hidden">
          <VisitManageCard
            type={v.type}
            scheduledAt={v.scheduledAt}
            onReschedule={async (iso, reason) => {
              await reschedule.mutateAsync({ visitId: v.id, scheduledAt: iso, reason });
            }}
            onCancel={async (reason) => {
              await cancel.mutateAsync({ visitId: v.id, reason });
            }}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/* ───────── Compromissos (lista + filtros) ───────── */
function AppointmentsList({
  visits,
  loading,
  onView,
  onOpenChat,
  onQuote,
}: {
  visits: ProviderVisit[];
  loading?: boolean;
  onView: (v: ProviderVisit) => void;
  onOpenChat: (v: ProviderVisit) => void;
  onQuote: (quoteId: string) => void;
}) {
  const [period, setPeriod] = useState<Period>('upcoming');
  const [status, setStatus] = useState<VisitStatus | ''>('');
  const [category, setCategory] = useState('');
  const [client, setClient] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(visits.map((v) => v.quoteCategoryName))).sort(),
    [visits],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const arr = visits.filter((v) => {
      if (status && v.status !== status) return false;
      if (category && v.quoteCategoryName !== category) return false;
      if (client && !v.clientName.toLowerCase().includes(client.trim().toLowerCase())) return false;
      const t = v.scheduledAt ? new Date(v.scheduledAt).getTime() : null;
      if (period === 'upcoming') return t != null && t >= now;
      if (period === 'past') return t != null && t < now;
      if (period === 'today') return t != null && t >= startOfToday.getTime() && t < startOfToday.getTime() + 86400_000;
      return true;
    });
    arr.sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
    return arr;
  }, [visits, period, status, category, client]);

  if (loading) return <Spinner label="Carregando…" />;

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-2 p-3.5 sm:grid-cols-4">
        <Select
          label="Período"
          options={[
            { value: 'upcoming', label: 'Próximos' },
            { value: 'today', label: 'Hoje' },
            { value: 'past', label: 'Passados' },
            { value: 'all', label: 'Todos' },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />
        <Select
          label="Status"
          options={[{ value: '', label: 'Todos' }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
          value={status}
          onChange={(v) => setStatus(v as VisitStatus | '')}
        />
        <Select
          label="Categoria"
          options={[{ value: '', label: 'Todas' }, ...categories.map((c) => ({ value: c, label: c }))]}
          value={category}
          onChange={setCategory}
        />
        <Input label="Cliente" value={client} onChange={setClient} placeholder="Nome…" />
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={<IconAgenda size={26} />} title="Nenhum compromisso" hint="Ajuste os filtros ou agende visitas nas conversas." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((v) => (
            <li key={v.id}>
              <AppointmentCard
                visit={v}
                onView={() => onView(v)}
                onOpenChat={() => onOpenChat(v)}
                onQuote={() => onQuote(v.quoteId)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AppointmentCard({
  visit: v,
  onView,
  onOpenChat,
  onQuote,
}: {
  visit: ProviderVisit;
  onView: () => void;
  onOpenChat: () => void;
  onQuote: () => void;
}) {
  const c = VISIT_COLOR[v.status];
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button onClick={onView} className="truncate text-left font-semibold hover:text-primary">
              {v.clientName}
            </button>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c.block} ${c.text}`}>
              {STATUS_LABEL[v.status]}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              {v.type === 'EXECUTION' ? <IconExecution size={12} /> : <IconAgenda size={12} />}
              {TYPE_LABEL[v.type]} · {v.quoteCategoryName}
            </span>
            <span className="inline-flex items-center gap-1">
              <IconUser size={12} /> {v.scheduledAt ? formatDateTime(v.scheduledAt) : '—'}
            </span>
            {v.zipCode && (
              <span className="inline-flex items-center gap-1">
                <IconLocation size={12} /> {v.zipCode}
              </span>
            )}
          </p>
          <div className="mt-2">
            <StatusChip status={v.quoteStatus} size="sm" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onQuote}>Ver orçamento</Button>
        {v.conversationId && (
          <Button size="sm" startContent={<IconChat size={15} />} onClick={onOpenChat}>Abrir conversa</Button>
        )}
      </div>
    </Card>
  );
}
