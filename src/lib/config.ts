/**
 * Constantes de configuração do app do prestador.
 * Centralizadas aqui para ajuste fácil.
 */

/** Janela (em dias) que o cliente "espera" uma resposta antes do orçamento expirar.
 *  Usada para a tag de urgência nas oportunidades. Aumente se precisar. */
export const QUOTE_RESPONSE_WINDOW_DAYS = 7;

/** A partir de quantos dias restantes a urgência vira destaque (laranja/vermelho). */
export const URGENCY_THRESHOLD_DAYS = 3;
