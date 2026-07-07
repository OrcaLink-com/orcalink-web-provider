import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProviderQuote, queryKeys } from '../../lib/queries';
import { api } from '../../lib/api';
import { formatBRL, formatDateTime } from '../../lib/format';
import { Button, Card, EmptyState, SectionHeader, Spinner, StatusChip } from '../../components/ui';
import { IconBack, IconChat, IconImages, IconLocation, IconUser } from '../../components/icons';
import { ConversationDrawer } from '../conversations/ConversationDrawer';

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
        <p className="text-sm text-text-muted">{quote.description}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Field label="Categoria" value={quote.categoryName} />
          <Field label="Modo" value={quote.requiresVisit ? 'Com visita técnica' : 'À distância'} />
          <Field label="Endereço / CEP" value={quote.zipCode ?? '—'} />
          {quote.budgetMaxCents != null && (
            <Field label="Orçamento máximo" value={formatBRL(quote.budgetMaxCents)} />
          )}
          {quote.distanceKm != null && (
            <Field label="Distância" value={`${quote.distanceKm.toFixed(1)} km`} />
          )}
          <Field label="Criado em" value={formatDateTime(quote.createdAt)} />
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {quote.requiresVisit && (
            <StatusChip label="Pede visita técnica" varName="--color-status-waiting" size="sm" />
          )}
          {!quote.canSendFinalProposal && quote.requiresVisit && (
            <StatusChip label="Proposta final após a visita" varName="--color-status-scheduled" size="sm" />
          )}
        </div>
      </Card>

      {/* Imagens */}
      <section>
        <SectionHeader title="Imagens" />
        {quote.images.length === 0 ? (
          <EmptyState icon={<IconImages size={24} />} title="Sem imagens anexadas" />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {quote.images.map((img) => (
              <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                <img
                  src={img.url}
                  alt="referência"
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-md object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Negociação */}
      <section className="space-y-3">
        <SectionHeader title="Negociação" />
        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <IconChat size={18} className="text-primary" />
            <span>
              {quote.myConversationId
                ? 'Você já está conversando com o cliente.'
                : 'Envie sua proposta e comece a conversa com o cliente.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {quote.distanceKm != null && (
              <span className="hidden items-center gap-1 text-xs text-text-muted sm:inline-flex">
                <IconLocation size={12} /> {quote.distanceKm.toFixed(1)} km
              </span>
            )}
            <Button size="sm" onClick={startAndOpen} disabled={starting}>
              {quote.myConversationId ? 'Abrir conversa' : starting ? 'Abrindo…' : 'Propor'}
            </Button>
          </div>
        </Card>
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
