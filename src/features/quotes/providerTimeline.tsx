import { formatBRL, formatDateTime } from '../../lib/format';
import type { Message } from '../../lib/types';
import type { TimelineItem } from '../../components/ui';

/** O evento de agendamento é de EXECUÇÃO (não visita técnica)? Deriva do texto. */
const isExec = (b?: string | null): boolean => !!b && /execu[çc][aã]o/i.test(b);

/**
 * Histórico do orçamento para o PRESTADOR, montado das mensagens da conversa
 * (que já têm timestamp real de cada passo: proposta, aceite, visita, pagamento).
 * Assim o prestador vê o histórico sem precisar rolar o chat inteiro.
 * Retorna do mais recente para o mais antigo (topo = atual).
 */
export function buildProviderTimeline(createdAt: string, messages: Message[]): TimelineItem[] {
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

  return raw.map((e, i) => ({
    id: `${i}-${e.at}`,
    meta: formatDateTime(e.at),
    title: e.title,
    body: e.body,
    tone: 'done' as const,
    current: i === 0,
  }));
}
