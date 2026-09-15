import type { ConversationSummary } from './types';

/**
 * É a vez do PRESTADOR agir nesta negociação? (mensagem não lida, precisa propor,
 * agendar, iniciar, confirmar recebimento…). `false` = aguardando o cliente.
 * Fonte única para o badge da navegação, a Home e a lista de Trabalhos concordarem.
 */
export function providerNeedsAction(c: ConversationSummary): boolean {
  if ((c.unreadCount ?? 0) > 0) return true;
  const p = c.latestProposal;
  switch (c.quoteStatus) {
    case 'WAITING_PROPOSALS':
    case 'IN_NEGOTIATION':
      return !p; // sem proposta → envie; com proposta pendente → aguardando o cliente
    case 'PAID':
    case 'EXECUTION_SCHEDULED':
      return true; // agendar execução / iniciar serviço
    case 'IN_PROGRESS':
      return !c.providerDoneAt; // marcar como concluído
    case 'FINISHED':
      return Boolean(c.externalPayment && !c.externalPaymentConfirmedAt); // confirmar recebimento
    default:
      return false;
  }
}

/** Quantas negociações precisam de uma ação do prestador. */
export function countProviderActions(list: ConversationSummary[] | undefined): number {
  return (list ?? []).filter(providerNeedsAction).length;
}
