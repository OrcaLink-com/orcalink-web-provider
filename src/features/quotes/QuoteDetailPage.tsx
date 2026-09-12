import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProviderQuote, useMessages, queryKeys } from '../../lib/queries';
import { api } from '../../lib/api';
import { formatBRL, formatDateTime } from '../../lib/format';
import { Button, Card, EmptyState, SectionHeader, Spinner, StatusChip, Timeline } from '../../components/ui';
import { IconBack, IconChat, IconHistory, IconUser } from '../../components/icons';
import { QuotePhotos } from '../../components/QuotePhotos';
import { ConversationDrawer } from '../conversations/ConversationDrawer';
import { buildProviderTimeline, providerTurnAction } from './providerTimeline';

/**
 * Detalhe do orçamento visto pelo PRESTADOR — espelha o do cliente:
 * dados do orçamento → imagens → negociação (abre a conversa em Drawer lateral).
 * Se ainda não há conversa, o botão "Propor" inicia uma e já abre o chat.
 */
export function QuoteDetailPage() {
  const { quoteId = '' } = useParams();
  const qc = useQueryClient();
  const quoteQ = useProviderQuote(quoteId);
  const quote = quoteQ.data;

  const [openConv, setOpenConv] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Histórico: montado das mensagens da conversa do prestador (proposta/aceite/visita/pagamento).
  const messagesQ = useMessages(quote?.myConversationId ?? null);
  const timeline = useMemo(
    () =>
      quote
        ? buildProviderTimeline(
            quote.createdAt,
            messagesQ.data ?? [],
            providerTurnAction(quote.status, quote.canSendFinalProposal),
          )
        : [],
    [quote, messagesQ.data],
  );

  // Abertura do chat pela notificação (toast → state; push/deep-link → ?chat=).
  const location = useLocation();
  const openChat =
    (location.state as { openChat?: string } | null)?.openChat ??
    new URLSearchParams(location.search).get('chat') ??
    undefined;
  useEffect(() => {
    if (openChat) {
      setOpenConv(openChat);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [openChat, location.pathname]);

  async function startAndOpen() {
    if (quote?.myConversationId) {
      setOpenConv(quote.myConversationId);
      return;
    }
    setStarting(true);
    try {
      const { conversationId } = await api.startConversation(quoteId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.quoteDetail(quoteId) }),
        qc.invalidateQueries({ queryKey: queryKeys.myConversations }),
        qc.invalidateQueries({ queryKey: queryKeys.openQuotes }),
      ]);
      setOpenConv(conversationId);
    } finally {
      setStarting(false);
    }
  }

  if (quoteQ.isLoading) return <Spinner label="Carregando…" />;
  if (quoteQ.isError) return <p className="text-danger">{(quoteQ.error as Error).message}</p>;
  if (!quote) return null;

  return (
    <div className="space-y-6">
      <Link to="/app/negocios" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground">
        <IconBack size={15} /> Negócios
      </Link>

      {/* Dados do orçamento */}
      <Card className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">{quote.title ?? quote.categoryName}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
              <IconUser size={12} /> {quote.clientName} · {quote.categoryName}
            </p>
          </div>
          <StatusChip status={quote.status} />
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-muted">{quote.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Field label="Categoria" value={quote.categoryName} />
          <Field label="Modo" value={quote.requiresVisit ? 'Com visita técnica' : 'À distância'} />
          <Field label="Região" value={[quote.neighborhood, quote.city].filter(Boolean).join(' · ') || '—'} />
          {quote.budgetMaxCents != null && (
            <Field label="Orçamento máximo" value={formatBRL(quote.budgetMaxCents)} />
          )}
          {quote.distanceKm != null && (
            <Field label="Distância" value={`${quote.distanceKm.toFixed(1)} km`} />
          )}
          <Field label="Criado em" value={formatDateTime(quote.createdAt)} />
        </dl>

        {/* Endereço exato: só liberado quando há visita/execução agendada (privacidade do cliente). */}
        {quote.addressVisible ? (
          <div className="mt-3 rounded-medium border border-border bg-content2/50 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold text-text-muted">Endereço do serviço</p>
            <p>
              {[quote.street, quote.number].filter(Boolean).join(', ') || '—'}
              {quote.complement ? ` — ${quote.complement}` : ''}
            </p>
            <p className="text-text-muted">
              {[quote.neighborhood, quote.city].filter(Boolean).join(' · ')}
              {quote.zipCode ? ` · CEP ${quote.zipCode}` : ''}
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-medium bg-content2/50 px-3 py-2 text-xs text-text-muted">
            🔒 O endereço completo é liberado quando a visita ou a execução for agendada.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {quote.requiresVisit && (
            <StatusChip label="Pede visita técnica" varName="--color-status-waiting" size="sm" />
          )}
          {!quote.canSendFinalProposal && quote.requiresVisit && (
            <StatusChip label="Proposta final após a visita" varName="--color-status-scheduled" size="sm" />
          )}
        </div>

        {/* Fotos de referência do pedido do cliente — no fim do card, carrossel + lightbox. */}
        <QuotePhotos images={quote.images} />
      </Card>

      {/* Conversa: o prestador só tem a própria conversa com o cliente — ação principal
          da tela, direta e visível (sem uma seção "Negociação" escondendo o botão). */}
      <Button full size="lg" onClick={startAndOpen} loading={starting} startContent={<IconChat size={18} />}>
        {quote.myConversationId ? 'Abrir conversa com o cliente' : 'Enviar proposta e conversar'}
      </Button>

      {/* Histórico — passos do orçamento (proposta, aceite, visita, pagamento…) sem abrir o chat. */}
      <section>
        <SectionHeader title="Histórico" />
        {timeline.length <= 1 ? (
          <EmptyState icon={<IconHistory size={22} />} title="Ainda sem movimentações" />
        ) : (
          <Timeline items={timeline} />
        )}
      </section>

      <ConversationDrawer
        conversationId={openConv}
        isOpen={openConv !== null}
        onClose={() => setOpenConv(null)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
