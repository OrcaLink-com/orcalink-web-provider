import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { LuArrowLeft, LuSend } from 'react-icons/lu';
import { formatBRL, formatDateTime } from '../../lib/format';
import { useQuoteRealtime } from '../../lib/realtime';
import type { Message } from '../../lib/types';

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  if (message.type === 'SYSTEM') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-md bg-content1 px-3 py-1 text-center text-[11px] text-text-muted">
          {message.body}
        </span>
      </div>
    );
  }
  if (message.type === 'PROPOSAL' && message.proposal) {
    const p = message.proposal;
    const isPre = p.type === 'PRE';
    const hasRange =
      isPre && p.amountMinCents != null && p.amountMaxCents != null && p.amountMinCents !== p.amountMaxCents;
    return (
      <div className="my-2 rounded-lg border border-brand bg-card p-3">
        <p className="text-xs font-medium uppercase text-brand">
          {isPre ? 'Sua estimativa' : 'Sua proposta final'} · {p.status}
        </p>
        <p className="text-lg font-bold">
          {hasRange
            ? `${formatBRL(p.amountMinCents!)} – ${formatBRL(p.amountMaxCents!)}`
            : formatBRL(p.amountCents)}
        </p>
        <p className="text-sm text-text-muted">{p.description}</p>
        <ul className="mt-1 space-y-0.5 text-xs text-text-muted">
          {p.leadTimeDays != null && <li>⏱ {p.leadTimeDays} dia(s)</li>}
          {!isPre && p.warrantyDays != null && <li>🛡 Garantia {p.warrantyDays} d</li>}
          {!isPre && p.paymentMethods && p.paymentMethods.length > 0 && (
            <li>💳 {p.paymentMethods.join(', ')}</li>
          )}
          {isPre && p.requestsVisit && <li>🏷 Solicitou visita</li>}
          {p.notes && <li>📝 {p.notes}</li>}
        </ul>
      </div>
    );
  }
  if (message.type === 'PROPOSAL_ACCEPTED') {
    return (
      <div className="my-2 rounded-md bg-status-finished px-3 py-2 text-center text-sm text-white">
        {message.body}
      </div>
    );
  }
  if (message.type === 'PROPOSAL_REJECTED') {
    return <div className="my-2 text-center text-xs text-danger">{message.body}</div>;
  }
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className={`my-0.5 flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] px-3 py-2 text-sm shadow-sm ${
          mine
            ? 'rounded-2xl rounded-br-sm bg-primary text-white'
            : 'rounded-2xl rounded-bl-sm bg-content2 text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <span
          className={`mt-0.5 block text-right text-[10px] ${
            mine ? 'text-white/70' : 'text-text-muted'
          }`}
        >
          {time}
        </span>
      </div>
    </div>
  );
}

function VisitsPanel({ quoteId }: { quoteId: string }) {
  const visitsQ = useVisits(quoteId);
  const request = useRequestVisit(quoteId);
  const confirmVisit = useConfirmVisit(quoteId);
  const [type, setType] = useState<'IN_LOCO' | 'EXECUTION'>('IN_LOCO');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlotISO, setSelectedSlotISO] = useState<string>('');
  const [endsAt, setEndsAt] = useState(''); // só para EXECUTION (datetime-local)
  const [error, setError] = useState<string | null>(null);

  // Slots livres do dia escolhido — só consulta enquanto a data for válida.
  const slotsQ = useAvailableSlots(date);

  // Ao trocar a data, limpa o slot selecionado.
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
    <div className="mb-2 rounded-lg border border-border p-3">
      <p className="mb-2 text-sm font-medium">
        {type === 'EXECUTION' ? 'Agendar execução' : 'Agendar visita técnica'}
      </p>
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
                  className="rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
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
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          >
            <option value="IN_LOCO">Visita técnica</option>
            <option value="EXECUTION">Execução</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          />
        </div>

        {/* Picker de slots livres do dia (docs/ux/10) */}
        {slotsQ.isLoading && <p className="text-xs text-text-muted">Carregando horários…</p>}
        {slotsQ.data?.reason === 'OFF_DAY' && (
          <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
            Você não atende nesse dia da semana — escolha outra data ou ajuste sua{' '}
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
                    ? 'border-brand bg-card font-medium text-brand'
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
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
            placeholder="Previsão de conclusão"
          />
        )}

        <button
          type="submit"
          disabled={request.isPending || !selectedSlotISO}
          className="w-full rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand disabled:opacity-50"
        >
          {request.isPending ? 'Enviando…' : 'Sugerir horário'}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ConversationPage() {
  const { conversationId = '' } = useParams();
  const { user } = useAuth();
  const convsQ = useMyConversations();
  const messagesQ = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const createProposal = useCreateProposal(conversationId);

  const [text, setText] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [proposalType, setProposalType] = useState<'PRE' | 'FINAL'>('FINAL');
  const [amount, setAmount] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [desc, setDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [leadDays, setLeadDays] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('');
  const [acceptsPix, setAcceptsPix] = useState(true);
  const [acceptsCard, setAcceptsCard] = useState(false);
  const [requestsVisit, setRequestsVisit] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const conversation = convsQ.data?.find((c) => c.id === conversationId);
  useQuoteRealtime(conversation?.quoteId);
  const isActive = conversation?.status === 'ACTIVE';
  // Gating da proposta final (docs/ux/11): se o orçamento exige visita, a final só libera
  // após uma visita técnica REALIZADA deste prestador.
  const requiresVisit = conversation?.requiresVisit ?? false;
  const visitsForGate = useVisits(conversation?.quoteId);
  const hasCompletedVisit = !!visitsForGate.data?.some(
    (v) => v.type === 'IN_LOCO' && v.status === 'COMPLETED',
  );
  const canSendFinal = !requiresVisit || hasCompletedVisit;
  // Quando a proposta foi aceita, mostramos o líquido a receber (visão do prestador).
  const selected = conversation?.latestProposal?.status === 'APPROVED';
  const pricingQ = usePricing(conversation?.quoteId, selected);
  const net = pricingQ.data?.providerNetCents;

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await sendMessage.mutateAsync(text.trim());
    setText('');
  }

  function parseCents(v: string): number | null {
    const n = parseFloat(v.replace(',', '.'));
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.round(n * 100);
  }

  async function onPropose(e: React.FormEvent) {
    e.preventDefault();
    setProposalError(null);
    const cents = parseCents(amount);
    if (cents === null) {
      setProposalError('Informe um valor válido (mín. R$ 1,00).');
      return;
    }
    if (!conversation) return;
    const isPre = proposalType === 'PRE';
    const minC = isPre ? parseCents(amountMin) : null;
    const maxC = isPre ? parseCents(amountMax) : null;
    if (isPre && minC !== null && maxC !== null && minC > maxC) {
      setProposalError('A faixa está invertida: mínimo > máximo.');
      return;
    }
    const lead = leadDays ? Math.max(0, parseInt(leadDays, 10)) : undefined;
    const warranty =
      !isPre && warrantyDays ? Math.max(0, parseInt(warrantyDays, 10)) : undefined;
    const methods = !isPre
      ? [acceptsPix ? 'PIX' : null, acceptsCard ? 'CARD' : null].filter(
          (x): x is string => !!x,
        )
      : undefined;
    try {
      await createProposal.mutateAsync({
        quoteId: conversation.quoteId,
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
      setShowProposal(false);
      setAmount('');
      setAmountMin('');
      setAmountMax('');
      setDesc('');
      setNotes('');
      setLeadDays('');
      setWarrantyDays('');
    } catch (err) {
      setProposalError((err as Error).message);
    }
  }

  function openProposalForm() {
    // Default inteligente: se não pode mandar final, começa como estimativa.
    const startAsPre = !canSendFinal;
    setProposalType(startAsPre ? 'PRE' : 'FINAL');
    setRequestsVisit(startAsPre); // estimativa em fluxo de visita já vem pedindo visita
    setProposalError(null);
    setShowProposal(true);
  }

  const startExec = useStartExecution(conversation?.quoteId ?? '');
  const canStartExecution = conversation?.quoteStatus === 'EXECUTION_SCHEDULED';
  const inProgress = conversation?.quoteStatus === 'IN_PROGRESS';

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col overflow-hidden rounded-large border border-border">
      {/* Cabeçalho estilo WhatsApp */}
      <header className="flex items-center gap-3 border-b border-border bg-content1 px-3 py-2.5">
        <Link to="/conversas" className="text-text-muted hover:text-foreground" aria-label="Voltar">
          <LuArrowLeft size={22} />
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {(conversation?.counterpartName ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold leading-tight">
            {conversation?.counterpartName ?? 'Conversa'}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            {isActive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
                <span>Cliente · online</span>
              </>
            ) : (
              <span>conversa encerrada</span>
            )}
          </div>
        </div>
      </header>

      {/* Faixa de status do serviço (selecionado / execução) */}
      {((selected && net !== undefined) || canStartExecution || inProgress) && (
        <div className="space-y-2 border-b border-border bg-content1/60 px-3 py-2">
          {selected && net !== undefined && (
            <div className="flex items-center justify-between rounded-medium bg-status-finished/15 px-3 py-2 text-status-finished">
              <span className="text-sm font-medium">Você foi selecionado · líquido</span>
              <span className="font-bold">{formatBRL(net)}</span>
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
      )}

      {/* Área de mensagens */}
      <div className="flex-1 space-y-1 overflow-y-auto bg-background px-3 py-3">
        <p className="mx-auto mb-2 max-w-sm rounded-md bg-content1 px-3 py-1.5 text-center text-[11px] text-text-muted">
          🔒 Mensagens e ações desta conversa ficam registradas com segurança.
        </p>
        {messagesQ.isLoading && <p className="text-text-muted">Carregando…</p>}
        {messagesQ.data?.length === 0 && (
          <p className="text-center text-sm text-text-muted">
            Inicie a conversa ou envie uma proposta.
          </p>
        )}
        {messagesQ.data?.map((m, i) => {
          const prev = messagesQ.data![i - 1];
          const showDay = !prev || !sameDay(prev.createdAt, m.createdAt);
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-content1 px-3 py-1 text-[11px] font-medium text-text-muted">
                    {dayLabel(m.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble message={m} mine={m.senderId === user?.id} />
            </div>
          );
        })}
      </div>

      {isActive && showVisit && (
        <div className="border-t border-border bg-content1 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Solicitar visita</p>
            <button
              type="button"
              onClick={() => setShowVisit(false)}
              className="text-xs text-text-muted hover:text-foreground"
            >
              Fechar
            </button>
          </div>
          {conversation?.quoteId && <VisitsPanel quoteId={conversation.quoteId} />}
        </div>
      )}

      {!isActive && (
        <p className="border-t border-border bg-content1 px-3 py-2 text-center text-sm text-text-muted">
          Esta negociação foi encerrada.
        </p>
      )}

      {isActive && showProposal && (
        <form onSubmit={onPropose} className="space-y-2 border-t border-border bg-content1 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Enviar proposta</p>
            <button
              type="button"
              onClick={() => setShowProposal(false)}
              className="text-xs text-text-muted hover:text-foreground"
            >
              Fechar
            </button>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setProposalType('PRE')}
              className={`flex-1 rounded-md border px-3 py-1.5 ${
                proposalType === 'PRE' ? 'border-brand bg-card font-medium text-brand' : 'border-border'
              }`}
            >
              Estimativa
            </button>
            <button
              type="button"
              onClick={() => canSendFinal && setProposalType('FINAL')}
              disabled={!canSendFinal}
              title={canSendFinal ? undefined : 'Disponível após a visita técnica'}
              className={`flex-1 rounded-md border px-3 py-1.5 ${
                proposalType === 'FINAL' ? 'border-brand bg-card font-medium text-brand' : 'border-border'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Proposta final
            </button>
          </div>
          {proposalType === 'PRE' ? (
            <p className="text-xs text-text-muted">
              Estimativa não vinculante. O valor final vai na proposta após a visita.
            </p>
          ) : (
            <p className="text-xs text-text-muted">Proposta vinculante — o cliente pode contratar.</p>
          )}
          {requiresVisit && !canSendFinal && (
            <p className="rounded-md bg-card px-2 py-1 text-xs text-warning">
              ⓘ Esta solicitação pede visita técnica antes da proposta final. Agende e realize a visita
              para liberar.
            </p>
          )}
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={proposalType === 'PRE' ? 'Valor estimado (R$)' : 'Valor final (R$)'}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
          {proposalType === 'PRE' && (
            <>
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="Mínimo (opcional)"
                  className="w-1/2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                />
                <input
                  inputMode="decimal"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="Máximo (opcional)"
                  className="w-1/2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requestsVisit}
                  onChange={(e) => setRequestsVisit(e.target.checked)}
                  disabled={requiresVisit}
                />
                Preciso de visita técnica
              </label>
            </>
          )}
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder={
              proposalType === 'PRE'
                ? 'Descrição (o que será feito)'
                : 'Descrição detalhada (serviços, materiais)'
            }
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={leadDays}
              onChange={(e) => setLeadDays(e.target.value)}
              placeholder={proposalType === 'PRE' ? 'Prazo aprox. (dias)' : 'Prazo (dias)'}
              className="w-1/2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            {proposalType === 'FINAL' && (
              <input
                inputMode="numeric"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
                placeholder="Garantia (dias)"
                className="w-1/2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
              />
            )}
          </div>
          {proposalType === 'FINAL' && (
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={acceptsPix}
                  onChange={(e) => setAcceptsPix(e.target.checked)}
                />
                PIX
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={acceptsCard}
                  onChange={(e) => setAcceptsCard(e.target.checked)}
                />
                Cartão
              </label>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observações (opcional)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
          {proposalError && <p className="text-xs text-danger">{proposalError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createProposal.isPending}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {proposalType === 'PRE' ? 'Enviar estimativa' : 'Enviar proposta final'}
            </button>
            <button
              type="button"
              onClick={() => setShowProposal(false)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isActive && !showProposal && !showVisit && (
        <div className="flex gap-2 border-t border-border bg-content1 px-2.5 pt-2">
          <button
            type="button"
            onClick={() => setShowVisit(true)}
            className="flex-1 rounded-medium border border-border py-2 text-sm font-medium hover:bg-card-2"
          >
            📅 Solicitar visita
          </button>
          <button
            type="button"
            onClick={openProposalForm}
            className="flex-1 rounded-medium border border-primary py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            ＋ {canSendFinal ? 'Enviar proposta' : 'Enviar estimativa'}
          </button>
        </div>
      )}

      <form onSubmit={onSend} className="flex items-center gap-2 border-t border-border bg-content1 px-2.5 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isActive}
          placeholder={isActive ? 'Mensagem' : 'Conversa encerrada'}
          className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isActive || sendMessage.isPending || !text.trim()}
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <LuSend size={20} />
        </button>
      </form>
    </div>
  );
}

/** Mesmo dia do calendário? */
function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** "Hoje" / "Ontem" / data. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yst = new Date();
  yst.setDate(today.getDate() - 1);
  if (sameDay(iso, today.toISOString())) return 'Hoje';
  if (sameDay(iso, yst.toISOString())) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}
