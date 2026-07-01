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
import { formatBRL, formatDateTime } from '../../lib/format';
import { useQuoteRealtime } from '../../lib/realtime';
import type { Message } from '../../lib/types';

function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  if (message.type === 'SYSTEM') {
    return <div className="my-2 text-center text-xs text-text-muted">{message.body}</div>;
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
  return (
    <div className={`my-1 flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <span
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          mine ? 'bg-brand text-white' : 'bg-card text-text'
        }`}
      >
        {message.body}
      </span>
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
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <Link to="/conversas" className="mb-2 text-sm text-text-muted underline">
        ← Conversas
      </Link>
      <h2 className="mb-2 font-semibold">{conversation?.counterpartName ?? 'Conversa'}</h2>

      {selected && net !== undefined && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-status-finished px-3 py-2 text-white">
          <span className="text-sm">Você foi selecionado · valor líquido</span>
          <span className="font-bold">{formatBRL(net)}</span>
        </div>
      )}

      {canStartExecution && (
        <button
          onClick={() => startExec.mutate()}
          disabled={startExec.isPending}
          className="mb-2 w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {startExec.isPending ? 'Iniciando…' : '▶ Iniciar serviço'}
        </button>
      )}
      {inProgress && (
        <div className="mb-2 rounded-md bg-status-scheduled px-3 py-2 text-center text-sm text-white">
          Execução em andamento — aguarde o cliente confirmar a conclusão.
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg border border-border p-3">
        {messagesQ.isLoading && <p className="text-text-muted">Carregando…</p>}
        {messagesQ.data?.length === 0 && (
          <p className="text-center text-sm text-text-muted">
            Inicie a conversa ou envie uma proposta.
          </p>
        )}
        {messagesQ.data?.map((m) => (
          <MessageBubble key={m.id} message={m} mine={m.senderId === user?.id} />
        ))}
      </div>

      {conversation?.quoteId && <div className="mt-2"><VisitsPanel quoteId={conversation.quoteId} /></div>}

      {!isActive && (
        <p className="mt-2 rounded-md bg-card px-3 py-2 text-center text-sm text-text-muted">
          Esta negociação foi encerrada.
        </p>
      )}

      {isActive && showProposal && (
        <form onSubmit={onPropose} className="mt-2 space-y-2 rounded-lg border border-brand p-3">
          <p className="text-sm font-medium text-brand">Enviar proposta</p>
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

      {isActive && !showProposal && (
        <button
          onClick={openProposalForm}
          className="mt-2 w-full rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand"
        >
          {canSendFinal ? '+ Enviar proposta' : '+ Enviar estimativa'}
        </button>
      )}

      <form onSubmit={onSend} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isActive}
          placeholder={isActive ? 'Escreva uma mensagem…' : 'Conversa encerrada'}
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isActive || sendMessage.isPending}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
