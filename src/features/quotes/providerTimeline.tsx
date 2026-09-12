import { formatBRL, formatDateTime } from '../../lib/format';
import type { Message, QuoteStatus } from '../../lib/types';
import type { TimelineItem } from '../../components/ui';

/** O evento de agendamento é de EXECUÇÃO (não visita técnica)? Deriva do texto. */
const isExec = (b?: string | null): boolean => !!b && /execu[çc][aã]o/i.test(b);

/**
 * Ação pendente do PRESTADOR derivada do status (null = está aguardando o cliente).
 * Vira um marco em destaque "SUA VEZ" no topo do histórico, pra não passar batido.
 */
export function providerTurnAction(status: QuoteStatus, canSendFinalProposal: boolean): string | null {
  switch (status) {
    case 'WAITING_PROPOSALS':
    case 'IN_NEGOTIATION':
      return canSendFinalProposal ? 'Envie a proposta final ao cliente' : null;
    case 'PAID':
      return 'Agende a data de execução do serviço';
    case 'EXECUTION_SCHEDULED':
      return 'Inicie o serviço na data combinada';
    case 'IN_PROGRESS':
      return 'Marque como concluído quando terminar';
    default:
      return null;
  }
}

/**
 * Histórico do orçamento para o PRESTADOR, montado das mensagens da conversa
 * (que já têm timestamp real de cada passo: proposta, aceite, visita, pagamento).
 * Assim o prestador vê o histórico sem precisar rolar o chat inteiro.
 * Retorna do mais recente para o mais antigo (topo = atual).
 */
export function buildProviderTimeline(
  createdAt: string,
  messages: Message[],
  yourTurn?: string | null,
): TimelineItem[] {
  const raw: Array<{ at: string; title: string; body?: string }> = [];
  raw.push({ at: createdAt, title: 'Orçamento recebido' });

  for (const m of messages) {
    const at = m.createdAt;
    switch (m.type) {
      case 'PROPOSAL':
        raw.push({
          at,
          title: m.proposal?.type === 'PRE' ? 'Você enviou uma estimativa' : 'Você enviou a proposta final',
          body: m.proposal ? formatBRL(m.proposal.amountCents) : undefined,
        });
        break;
      case 'PROPOSAL_ACCEPTED':
        raw.push({ at, title: 'Cliente aceitou a proposta', body: m.body ?? undefined });
        break;
      case 'PROPOSAL_REJECTED':
        raw.push({ at, title: 'Proposta recusada', body: m.body ?? undefined });
        break;
      case 'VISIT_REQUEST':
        raw.push({ at, title: isExec(m.body) ? 'Execução agendada' : 'Visita solicitada', body: m.body ?? undefined });
        break;
      case 'VISIT_CONFIRMED':
        raw.push({
          at,
          title: isExec(m.body) ? 'Execução confirmada' : 'Visita confirmada pelo cliente',
          body: m.body ?? undefined,
        });
        break;
      case 'VISIT_RESCHEDULED':
        raw.push({ at, title: 'Nova data sugerida', body: m.body ?? undefined });
        break;
      case 'SYSTEM':
        if (m.body) raw.push({ at, title: 'Atualização', body: m.body });
        break;
      default:
        break; // TEXT / IMAGE não entram no histórico
    }
  }

  raw.sort((a, b) => b.at.localeCompare(a.at));

  const items: TimelineItem[] = raw.map((e, i) => ({
    id: `${i}-${e.at}`,
    meta: formatDateTime(e.at),
    title: e.title,
    body: e.body,
    tone: 'done' as const,
    current: !yourTurn && i === 0,
  }));

  // Marco "SUA VEZ" em destaque no topo — quando a bola está com o prestador.
  if (yourTurn) {
    items.unshift({
      id: 'your-turn',
      meta: 'Agora',
      title: (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
            Sua vez
          </span>
          <span className="font-semibold text-warning">{yourTurn}</span>
        </span>
      ),
      tone: 'pending',
      current: true,
    });
  }

  return items;
}
