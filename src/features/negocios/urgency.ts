import { QUOTE_RESPONSE_WINDOW_DAYS, URGENCY_THRESHOLD_DAYS } from '../../lib/config';

export interface Urgency {
  daysLeft: number;
  label: string;
  /** 'danger' (≤1 dia), 'warning' (≤ limiar), 'muted' (sem pressa/expirado). */
  tone: 'danger' | 'warning' | 'muted';
  /** Deve aparecer em destaque (faltam poucos dias)? */
  urgent: boolean;
}

/** Calcula a urgência a partir da data de criação + janela de resposta (convenção configurável). */
export function computeUrgency(createdAtIso: string): Urgency {
  const created = new Date(createdAtIso).getTime();
  const deadline = created + QUOTE_RESPONSE_WINDOW_DAYS * 86400_000;
  const daysLeft = Math.ceil((deadline - Date.now()) / 86400_000);

  if (daysLeft <= 0) return { daysLeft, label: 'Expirado', tone: 'muted', urgent: false };
  if (daysLeft === 1) return { daysLeft, label: 'Expira hoje', tone: 'danger', urgent: true };
  if (daysLeft === 2) return { daysLeft, label: 'Expira amanhã', tone: 'danger', urgent: true };
  if (daysLeft <= URGENCY_THRESHOLD_DAYS + 1)
    return { daysLeft, label: `Restam ${daysLeft} dias`, tone: 'warning', urgent: true };
  return { daysLeft, label: `Restam ${daysLeft} dias`, tone: 'muted', urgent: false };
}

export const URGENCY_VAR: Record<Urgency['tone'], string> = {
  danger: '--color-danger',
  warning: '--color-status-waiting',
  muted: '--color-status-canceled',
};
