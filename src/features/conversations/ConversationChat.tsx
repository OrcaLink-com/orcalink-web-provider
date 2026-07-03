import { useMemo, useState } from 'react';
import { LuCalendarPlus, LuFilePlus } from 'react-icons/lu';
import { useAuth } from '../../auth/AuthContext';
import {
  useAvailableSlots,
  useConfirmVisit,
  useCreateProposal,
  useMessages,
  useMyConversations,
  usePricing,
  useRequestVisit,
  useSendMessage,
  useStartExecution,
  useVisits,
} from '../../lib/queries';
import { formatBRL, formatDateTime } from '../../lib/format';
import { useQuoteRealtime } from '../../lib/realtime';
import { ChatConversationView } from '../../components/Chat';
import type { ChatActionHandlers, ChatMessage, ChatParticipant } from '../../components/Chat';
import { messagesToChat, toServiceStatus } from './chatAdapter';

interface ConversationChatProps {
  conversationId: string;
  /** Botão "voltar" do cabeçalho (fecha o drawer ou volta de página). */
  onBack: () => void;
}

/**
 * Conteúdo da conversa do PRESTADOR usando o módulo de chat premium. É
 * **embutível** (sem altura própria): quem monta (página ou Drawer) fornece a
 * altura. O prestador CRIA propostas/visitas, então esses formulários vivem no
 * slot `aboveComposer` do `ChatConversationView`.
 */
export function ConversationChat({ conversationId, onBack }: ConversationChatProps) {
  const { user } = useAuth();

  const convsQ = useMyConversations();
  const messagesQ = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);

  const conversation = convsQ.data?.find((c) => c.id === conversationId);
  useQuoteRealtime(conversation?.quoteId);

  const isActive = conversation?.status === 'ACTIVE';
  const requiresVisit = conversation?.requiresVisit ?? false;
  const visitsForGate = useVisits(conversation?.quoteId);
  const hasCompletedVisit = !!visitsForGate.data?.some(
    (v) => v.type === 'IN_LOCO' && v.status === 'COMPLETED',
  );
  const canSendFinal = !requiresVisit || hasCompletedVisit;

  const selected = conversation?.latestProposal?.status === 'APPROVED';
  const pricingQ = usePricing(conversation?.quoteId, selected);
  const net = pricingQ.data?.providerNetCents;

  const startExec = useStartExecution(conversation?.quoteId ?? '');
  const paid = conversation?.quoteStatus === 'PAID';
  const canStartExecution = conversation?.quoteStatus === 'EXECUTION_SCHEDULED';
  const inProgress = conversation?.quoteStatus === 'IN_PROGRESS';

  const [pane, setPane] = useState<'none' | 'proposal' | 'visit'>('none');

  const peer: ChatParticipant | null = conversation
    ? { id: conversation.counterpartId, name: conversation.counterpartName, role: 'client', online: true }
    : null;

  const messages = useMemo<ChatMessage[]>(() => {
    if (!messagesQ.data || !conversation || !peer) return [];
    const me: ChatParticipant = { id: user?.id ?? 'me', name: 'Você', role: 'provider' };
    return messagesToChat(messagesQ.data, { me, peer });
  }, [messagesQ.data, conversation, peer, user?.id]);

  const handlers: ChatActionHandlers = {
    onSendMessage: async (t) => {
      await sendMessage.mutateAsync(t);
    },
  };

  if (!peer || !conversation) {
    return <p className="p-6 text-center text-sm text-text-muted">Carregando conversa…</p>;
  }

  const hasBanner = (selected && net !== undefined) || paid || canStartExecution || inProgress;
  const headerBanner = hasBanner ? (
    <div className="space-y-2 border-b border-border bg-content1/60 px-3 py-2">
      {selected && net !== undefined && (
        <div className="flex items-center justify-between rounded-medium bg-status-finished/15 px-3 py-2 text-status-finished">
          <span className="text-sm font-medium">Você foi selecionado · líquido</span>
          <span className="font-bold">{formatBRL(net)}</span>
        </div>
      )}
      {paid && (
        <div className="rounded-medium bg-status-finished/15 px-3 py-2 text-sm text-status-finished">
          💰 <strong>Pagamento recebido!</strong> O valor fica em custódia. Combine e agende a{' '}
          <strong>data de execução</strong> com o cliente (em “Solicitar visita” → Execução).
        </div>
      )}
      {canStartExecution && (
        <button
          onClick={() => startExec.mutate()}
          disabled={startExec.isPending}
          className="w-full rounded-medium bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {startExec.isPending ? 'Iniciando…' : '▶ Iniciar serviço'}
        </button>
      )}
      {inProgress && (
        <div className="rounded-medium bg-status-scheduled/15 px-3 py-2 text-center text-sm text-status-scheduled">
          Execução em andamento — aguarde o cliente confirmar a conclusão.
        </div>
      )}
    </div>
  ) : undefined;

  const aboveComposer = isActive ? (
    pane === 'proposal' ? (
      <ProposalForm
        conversationId={conversationId}
        quoteId={conversation.quoteId}
        canSendFinal={canSendFinal}
        requiresVisit={requiresVisit}
        onClose={() => setPane('none')}
      />
    ) : pane === 'visit' ? (
      <div className="border-t border-border bg-content1 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Agendar visita / execução</p>
          <button onClick={() => setPane('none')} className="text-xs text-text-muted hover:text-foreground">
            Fechar
          </button>
        </div>
        <VisitsPanel quoteId={conversation.quoteId} />
      </div>
    ) : (
      <div className="flex gap-2 border-t border-border bg-content1 px-2.5 pt-2">
        <button
          onClick={() => setPane('visit')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-medium border border-border py-2 text-sm font-medium hover:bg-card-2"
        >
          <LuCalendarPlus size={16} /> Solicitar visita
        </button>
        <button
          onClick={() => setPane('proposal')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-medium border border-primary py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <LuFilePlus size={16} /> {canSendFinal ? 'Enviar proposta' : 'Enviar estimativa'}
        </button>
      </div>
    )
  ) : undefined;

  return (
    <ChatConversationView
      peer={peer}
      serviceStatus={toServiceStatus(conversation.quoteStatus)}
      viewer={{ id: user?.id ?? 'me', role: 'provider' }}
      messages={messages}
      handlers={handlers}
      loading={messagesQ.isLoading}
      disabled={!isActive}
      onBack={onBack}
      headerBanner={headerBanner}
      aboveComposer={aboveComposer}
    />
  );
}

/* ───────── Agendar visita/execução (slots livres) ───────── */
function VisitsPanel({ quoteId }: { quoteId: string }) {
  const visitsQ = useVisits(quoteId);
  const request = useRequestVisit(quoteId);
  const confirmVisit = useConfirmVisit(quoteId);
  const [type, setType] = useState<'IN_LOCO' | 'EXECUTION'>('IN_LOCO');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlotISO, setSelectedSlotISO] = useState<string>('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const slotsQ = useAvailableSlots(date);

  function onDateChange(v: string) {
    setDate(v);
    setSelectedSlotISO('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedSlotISO) {
      setError('Escolha um horário livre.');
      return;
    }
    try {
      await request.mutateAsync({
        type,
        scheduledAt: selectedSlotISO,
        endsAt: type === 'EXECUTION' && endsAt ? new Date(endsAt).toISOString() : undefined,
      });
      setSelectedSlotISO('');
      setEndsAt('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      {visitsQ.data && visitsQ.data.length > 0 && (
        <ul className="mb-2 space-y-1">
          {visitsQ.data.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span>
                {v.type === 'IN_LOCO' ? 'Visita técnica' : 'Execução'} ·{' '}
                {v.scheduledAt ? formatDateTime(v.scheduledAt) : '—'}
                {v.endsAt ? ` → ${formatDateTime(v.endsAt)}` : ''} · <strong>{v.status}</strong>
                {v.status === 'RESCHEDULED' && ' (cliente sugeriu nova data)'}
              </span>
              {v.status === 'RESCHEDULED' && (
                <button
                  type="button"
                  onClick={() => confirmVisit.mutate(v.id)}
                  disabled={confirmVisit.isPending}
                  className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Aceitar nova data
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'IN_LOCO' | 'EXECUTION')}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="IN_LOCO">Visita técnica</option>
            <option value="EXECUTION">Execução</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>

        {slotsQ.isLoading && <p className="text-xs text-text-muted">Carregando horários…</p>}
        {slotsQ.data?.reason === 'OFF_DAY' && (
          <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
            Você não atende nesse dia — escolha outra data ou ajuste sua{' '}
            <a href="/agenda" className="underline">disponibilidade</a>.
          </p>
        )}
        {slotsQ.data?.reason === 'DAY_LIMIT_REACHED' && (
          <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
            Limite de visitas atingido para esse dia. Escolha outra data.
          </p>
        )}
        {slotsQ.data && slotsQ.data.slots.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {slotsQ.data.slots.map((s) => (
              <button
                type="button"
                key={s.startISO}
                onClick={() => s.available && setSelectedSlotISO(s.startISO)}
                disabled={!s.available}
                className={`rounded-md border px-2 py-1 text-xs ${
                  selectedSlotISO === s.startISO
                    ? 'border-primary bg-card font-medium text-primary'
                    : s.available
                      ? 'border-border'
                      : 'border-border text-text-muted opacity-50 line-through'
                }`}
                title={s.available ? `Usar ${s.label}` : 'Horário ocupado'}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {type === 'EXECUTION' && selectedSlotISO && (
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            title="Previsão de conclusão"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={request.isPending || !selectedSlotISO}
          className="w-full rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary disabled:opacity-50"
        >
          {request.isPending ? 'Enviando…' : 'Sugerir horário'}
        </button>
      </form>
    </div>
  );
}

/* ───────── Enviar proposta/estimativa ───────── */
function ProposalForm({
  conversationId,
  quoteId,
  canSendFinal,
  requiresVisit,
  onClose,
}: {
  conversationId: string;
  quoteId: string;
  canSendFinal: boolean;
  requiresVisit: boolean;
  onClose: () => void;
}) {
  const createProposal = useCreateProposal(conversationId);
  const [proposalType, setProposalType] = useState<'PRE' | 'FINAL'>(canSendFinal ? 'FINAL' : 'PRE');
  const [amount, setAmount] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [desc, setDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [leadDays, setLeadDays] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('');
  const [acceptsPix, setAcceptsPix] = useState(true);
  const [acceptsCard, setAcceptsCard] = useState(false);
  const [requestsVisit, setRequestsVisit] = useState(!canSendFinal);
  const [error, setError] = useState<string | null>(null);

  function parseCents(v: string): number | null {
    const n = parseFloat(v.replace(',', '.'));
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.round(n * 100);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseCents(amount);
    if (cents === null) {
      setError('Informe um valor válido (mín. R$ 1,00).');
      return;
    }
    const isPre = proposalType === 'PRE';
    const minC = isPre ? parseCents(amountMin) : null;
    const maxC = isPre ? parseCents(amountMax) : null;
    if (isPre && minC !== null && maxC !== null && minC > maxC) {
      setError('A faixa está invertida: mínimo > máximo.');
      return;
    }
    const lead = leadDays ? Math.max(0, parseInt(leadDays, 10)) : undefined;
    const warranty = !isPre && warrantyDays ? Math.max(0, parseInt(warrantyDays, 10)) : undefined;
    const methods = !isPre
      ? [acceptsPix ? 'PIX' : null, acceptsCard ? 'CARD' : null].filter((x): x is string => !!x)
      : undefined;
    try {
      await createProposal.mutateAsync({
        quoteId,
        type: proposalType,
        amountCents: cents,
        amountMinCents: minC ?? undefined,
        amountMaxCents: maxC ?? undefined,
        description: desc.trim(),
        notes: notes.trim() || undefined,
        leadTimeDays: lead,
        warrantyDays: warranty,
        paymentMethods: methods,
        requestsVisit: isPre ? requestsVisit : undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const input = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-t border-border bg-content1 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary">Enviar proposta</p>
        <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-foreground">
          Fechar
        </button>
      </div>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setProposalType('PRE')}
          className={`flex-1 rounded-md border px-3 py-1.5 ${proposalType === 'PRE' ? 'border-primary bg-card font-medium text-primary' : 'border-border'}`}
        >
          Estimativa
        </button>
        <button
          type="button"
          onClick={() => canSendFinal && setProposalType('FINAL')}
          disabled={!canSendFinal}
          title={canSendFinal ? undefined : 'Disponível após a visita técnica'}
          className={`flex-1 rounded-md border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 ${proposalType === 'FINAL' ? 'border-primary bg-card font-medium text-primary' : 'border-border'}`}
        >
          Proposta final
        </button>
      </div>

      {requiresVisit && !canSendFinal && (
        <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
          ⓘ Este orçamento pede visita técnica antes da proposta final. Agende e realize a visita para liberar.
        </p>
      )}

      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={proposalType === 'PRE' ? 'Valor estimado (R$)' : 'Valor final (R$)'}
        className={input}
      />
      {proposalType === 'PRE' && (
        <>
          <div className="flex gap-2">
            <input inputMode="decimal" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Mínimo (opcional)" className={`${input} w-1/2`} />
            <input inputMode="decimal" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Máximo (opcional)" className={`${input} w-1/2`} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requestsVisit} onChange={(e) => setRequestsVisit(e.target.checked)} disabled={requiresVisit} />
            Preciso de visita técnica
          </label>
        </>
      )}
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        placeholder={proposalType === 'PRE' ? 'Descrição (o que será feito)' : 'Descrição detalhada (serviços, materiais)'}
        className={input}
      />
      <div className="flex gap-2">
        <input inputMode="numeric" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} placeholder={proposalType === 'PRE' ? 'Prazo aprox. (dias)' : 'Prazo (dias)'} className={`${input} w-1/2`} />
        {proposalType === 'FINAL' && (
          <input inputMode="numeric" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} placeholder="Garantia (dias)" className={`${input} w-1/2`} />
        )}
      </div>
      {proposalType === 'FINAL' && (
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={acceptsPix} onChange={(e) => setAcceptsPix(e.target.checked)} /> PIX
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={acceptsCard} onChange={(e) => setAcceptsCard(e.target.checked)} /> Cartão
          </label>
        </div>
      )}
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observações (opcional)" className={input} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button type="submit" disabled={createProposal.isPending} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {createProposal.isPending ? 'Enviando…' : proposalType === 'PRE' ? 'Enviar estimativa' : 'Enviar proposta final'}
      </button>
    </form>
  );
}
