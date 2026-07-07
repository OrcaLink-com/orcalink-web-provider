import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LuCalendarClock, LuCalendarPlus, LuCircleCheck, LuFilePlus, LuPlay } from 'react-icons/lu';
import { useAuth } from '../../auth/AuthContext';
import { setActiveConversation } from '../../lib/activeChat';
import {
  useAvailableSlots,
  useCancelVisit,
  useConfirmVisit,
  useCreateProposal,
  useRescheduleVisit,
  useMessages,
  useMarkServiceDone,
  useMyConversations,
  usePricing,
  useProfile,
  useRequestVisit,
  useSendMessage,
  useStartExecution,
  useVisits,
} from '../../lib/queries';
import { formatBRL, formatDateTime } from '../../lib/format';
import { usePeerTyping, usePresence, useQuoteRealtime, useTypingSignal } from '../../lib/realtime';
import { ChatConversationView } from '../../components/Chat';
import type { ChatActionHandlers, ChatMessage, ChatParticipant } from '../../components/Chat';
import { messagesToChat, toServiceStatus } from './chatAdapter';
import { computeNextStep } from './nextStep';
import { NextStepBanner } from '../../components/NextStepBanner';
import { NextActionCard } from '../../components/NextActionCard';
import { VisitManageCard } from '../../components/VisitManageCard';

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
  const location = useLocation();
  const highlightMessageId = (location.state as { highlightMessageId?: string } | null)?.highlightMessageId;

  // Marca esta conversa como "aberta" → o toaster não notifica mensagens dela.
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  const convsQ = useMyConversations();
  const messagesQ = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);

  const conversation = convsQ.data?.find((c) => c.id === conversationId);
  useQuoteRealtime(conversation?.quoteId);
  const presence = usePresence(conversation?.counterpartId);
  const peerTyping = usePeerTyping(conversation?.quoteId, conversation?.counterpartId);
  const notifyTyping = useTypingSignal(conversation?.quoteId);

  const isActive = conversation?.status === 'ACTIVE';
  const requiresVisit = conversation?.requiresVisit ?? false;
  const visitsForGate = useVisits(conversation?.quoteId);
  const hasCompletedVisit = !!visitsForGate.data?.some(
    (v) => v.type === 'IN_LOCO' && v.status === 'COMPLETED',
  );
  // Visita técnica em aberto (solicitada/aceita, ainda não confirmada realizada).
  const hasActiveInLoco = !!visitsForGate.data?.some(
    (v) => v.type === 'IN_LOCO' && ['PENDING', 'SUGGESTED', 'RESCHEDULED', 'CONFIRMED'].includes(v.status),
  );
  // Proposta final só libera com visita CONCLUÍDA (confirmada pelo cliente) ou
  // quando não há visita alguma exigida/aberta.
  const canSendFinal = hasCompletedVisit || (!requiresVisit && !hasActiveInLoco);

  const selected = conversation?.latestProposal?.status === 'APPROVED';
  const pricingQ = usePricing(conversation?.quoteId, selected);
  const net = pricingQ.data?.providerNetCents;

  const startExec = useStartExecution(conversation?.quoteId ?? '');
  const markDone = useMarkServiceDone(conversation?.quoteId);
  const reschedule = useRescheduleVisit(conversation?.quoteId);
  const cancelVisit = useCancelVisit(conversation?.quoteId);
  const paid = conversation?.quoteStatus === 'PAID';
  const canStartExecution = conversation?.quoteStatus === 'EXECUTION_SCHEDULED';
  const inProgress = conversation?.quoteStatus === 'IN_PROGRESS';
  const providerMarkedDone = Boolean(conversation?.providerDoneAt);

  const [pane, setPane] = useState<'none' | 'proposal' | 'visit'>('none');

  const myProfile = useProfile();
  const peer: ChatParticipant | null = conversation
    ? {
        id: conversation.counterpartId,
        name: conversation.counterpartName,
        avatarUrl: conversation.counterpartAvatarUrl,
        headline: conversation.quoteTitle,
        role: 'client',
        online: presence.online,
        lastSeenAt: presence.lastSeenAt,
      }
    : null;

  const messages = useMemo<ChatMessage[]>(() => {
    if (!messagesQ.data || !conversation || !peer) return [];
    const me: ChatParticipant = { id: user?.id ?? 'me', name: 'Você', role: 'provider', avatarUrl: myProfile.data?.avatarUrl ?? undefined };
    return messagesToChat(messagesQ.data, { me, peer });
  }, [messagesQ.data, conversation, peer, user?.id, myProfile.data?.avatarUrl]);

  const handlers: ChatActionHandlers = {
    onSendMessage: async (t) => {
      await sendMessage.mutateAsync(t);
    },
    onTyping: notifyTyping,
  };

  if (!peer || !conversation) {
    return <p className="p-6 text-center text-sm text-text-muted">Carregando conversa…</p>;
  }

  const hasPendingVisit = !!visitsForGate.data?.some(
    (v) => v.status === 'SUGGESTED' || v.status === 'RESCHEDULED',
  );
  const hasConfirmedVisit = !!visitsForGate.data?.some(
    (v) => v.type === 'IN_LOCO' && v.status === 'CONFIRMED',
  );
  const nextStep = conversation
    ? computeNextStep({
        quoteStatus: conversation.quoteStatus,
        viewerRole: 'provider',
        requiresVisit,
        latestProposalType: conversation.latestProposal?.type,
        latestProposalStatus: conversation.latestProposal?.status,
        hasCompletedVisit,
        hasPendingVisit,
        hasConfirmedVisit,
      })
    : null;

  const hasBanner = (selected && net !== undefined) || inProgress;
  const headerBanner =
    nextStep || hasBanner ? (
      <>
        {nextStep && <NextStepBanner step={nextStep} />}
        {hasBanner && (
    <div className="space-y-2 border-b border-border bg-content1/60 px-3 py-2">
      {selected && net !== undefined && (
        <div className="flex items-center justify-between rounded-medium bg-status-finished/15 px-3 py-2 text-status-finished">
          <span className="text-sm font-medium">Você foi selecionado · líquido</span>
          <span className="font-bold">{formatBRL(net)}</span>
        </div>
      )}
      {inProgress && !providerMarkedDone && (
        <div className="rounded-medium bg-status-scheduled/15 px-3 py-2 text-center text-sm text-status-scheduled">
          Execução em andamento — aguarde o cliente confirmar a conclusão.
        </div>
      )}
      {inProgress && providerMarkedDone && (
        <div className="rounded-medium bg-status-finished/15 px-3 py-2 text-center text-sm text-status-finished">
          Você marcou como concluído. Aguardando o cliente confirmar — se não confirmar, a Orca Link analisa e libera.
        </div>
      )}
    </div>
        )}
      </>
    ) : undefined;

  // Card de ação premium fixado acima do input (bottom sheet) — próxima ação do prestador.
  let nextAction: ReactNode;
  if (isActive && pane === 'none') {
    if (paid) {
      nextAction = (
        <NextActionCard
          tone="amber"
          icon={<LuCalendarClock size={20} />}
          title="Informe a data de execução"
          description="O pagamento foi confirmado. Combine e agende a data prevista para executar o serviço."
          ctaLabel="Agendar execução"
          onCta={() => setPane('visit')}
        />
      );
    } else if (canStartExecution) {
      nextAction = (
        <NextActionCard
          tone="sky"
          icon={<LuPlay size={20} />}
          title="Inicie o serviço"
          description="Chegou a data combinada? Inicie a execução para o cliente acompanhar."
          ctaLabel="Iniciar serviço"
          onCta={async () => {
            await startExec.mutateAsync();
          }}
          confirm={{
            description: 'Confirme que você vai iniciar a execução do serviço agora.',
            confirmLabel: 'Sim, iniciar',
          }}
        />
      );
    } else if (inProgress && !providerMarkedDone) {
      nextAction = (
        <NextActionCard
          tone="green"
          icon={<LuCircleCheck size={20} />}
          title="Concluiu o serviço?"
          description="Marque como concluído. O cliente confirma para liberar o pagamento; se não confirmar, a Orca Link media."
          ctaLabel="Marcar serviço como concluído"
          onCta={async () => {
            await markDone.mutateAsync();
          }}
          confirm={{
            description: 'Isso informa que, na sua visão, o serviço foi finalizado. O pagamento NÃO é liberado automaticamente — depende da confirmação do cliente ou da análise da Orca Link.',
            confirmLabel: 'Sim, marcar concluído',
          }}
        />
      );
    }
  }

  // Fase de execução (após pagamento): o agendamento trata só de execução.
  const execPhase = paid || canStartExecution || inProgress;
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
          <p className="text-sm font-medium text-primary">
            {execPhase ? 'Agendar execução do serviço' : 'Solicitar visita técnica'}
          </p>
          <button onClick={() => setPane('none')} className="text-xs text-text-muted hover:text-foreground">
            Fechar
          </button>
        </div>
        <VisitsPanel quoteId={conversation.quoteId} mode={execPhase ? 'execution' : 'visit'} />
      </div>
    ) : execPhase ? undefined : (
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

  // Gerenciar (reagendar/cancelar) um agendamento confirmado.
  const manageableVisit = visitsForGate.data?.find(
    (v) =>
      v.status === 'CONFIRMED' &&
      ((v.type === 'IN_LOCO' && !hasCompletedVisit) ||
        (v.type === 'EXECUTION' && conversation.quoteStatus === 'EXECUTION_SCHEDULED')),
  );
  const manageCard =
    manageableVisit && isActive ? (
      <VisitManageCard
        type={manageableVisit.type}
        scheduledAt={manageableVisit.scheduledAt}
        onReschedule={async (iso, reason) => {
          await reschedule.mutateAsync({ visitId: manageableVisit.id, scheduledAt: iso, reason });
        }}
        onCancel={async (reason) => {
          await cancelVisit.mutateAsync({ visitId: manageableVisit.id, reason });
        }}
      />
    ) : null;

  return (
    <ChatConversationView
      peer={peer}
      serviceStatus={toServiceStatus(conversation.quoteStatus)}
      viewer={{ id: user?.id ?? 'me', role: 'provider' }}
      messages={messages}
      handlers={handlers}
      loading={messagesQ.isLoading}
      peerTyping={peerTyping}
      highlightMessageId={highlightMessageId}
      disabled={!isActive}
      autoFocusComposer
      onBack={onBack}
      headerBanner={headerBanner}
      aboveComposer={
        manageCard || nextAction || aboveComposer ? (
          <>
            {manageCard}
            {nextAction}
            {aboveComposer}
          </>
        ) : undefined
      }
    />
  );
}

/* ───────── Agendar visita técnica (negociação) OU execução (após pagamento) ───────── */
function VisitsPanel({ quoteId, mode }: { quoteId: string; mode: 'visit' | 'execution' }) {
  const visitsQ = useVisits(quoteId);
  const request = useRequestVisit(quoteId);
  const confirmVisit = useConfirmVisit(quoteId);
  const type = mode === 'execution' ? 'EXECUTION' : 'IN_LOCO';
  const noun = mode === 'execution' ? 'execução' : 'visita';
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlotISO, setSelectedSlotISO] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const slotsQ = useAvailableSlots(date);

  // Só mostra os agendamentos do MESMO tipo desta fase (não mistura visita técnica na execução).
  const relevantVisits = (visitsQ.data ?? []).filter((v) => v.type === type);

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
      await request.mutateAsync({ type, scheduledAt: selectedSlotISO });
      setSelectedSlotISO('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      {relevantVisits.length > 0 && (
        <ul className="mb-2 space-y-1">
          {relevantVisits.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span>
                {mode === 'execution' ? 'Execução' : 'Visita técnica'} ·{' '}
                {v.scheduledAt ? formatDateTime(v.scheduledAt) : '—'} · <strong>{v.status}</strong>
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
              {mode === 'visit' && v.status === 'CONFIRMED' && (
                <span className="text-[11px] text-text-muted">Aguardando o cliente confirmar a realização</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="space-y-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />

        {slotsQ.isLoading && <p className="text-xs text-text-muted">Carregando horários…</p>}
        {slotsQ.data?.reason === 'OFF_DAY' && (
          <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
            Você não atende nesse dia — escolha outra data ou ajuste sua{' '}
            <a href="/app/agenda" className="underline">disponibilidade</a>.
          </p>
        )}
        {slotsQ.data?.reason === 'DAY_LIMIT_REACHED' && (
          <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
            Limite de agendamentos atingido para esse dia. Escolha outra data.
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

        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={request.isPending || !selectedSlotISO}
          className="w-full rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary disabled:opacity-50"
        >
          {request.isPending ? 'Enviando…' : mode === 'execution' ? 'Agendar execução' : `Sugerir horário da ${noun}`}
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
