import { useProviderFinance } from '../../lib/queries';
import { formatBRL, formatDateTime } from '../../lib/format';
import { Card, EmptyState, PageHeader, SectionHeader, Spinner } from '../../components/ui';
import { IconWallet, IconClock, IconPayment, IconSuccess, IconUser } from '../../components/icons';
import type { ProviderFinanceEntry } from '../../lib/types';

/**
 * Área financeira do prestador — apenas os próprios recebíveis.
 * Saldos por estágio (liberado / em custódia / processando), total recebido e
 * histórico de repasses. O repasse em si (saque) é a próxima etapa (fluxo Asaas/PIX).
 */
export function FinancePage() {
  const { data, isLoading, isError, error } = useProviderFinance();

  if (isLoading) return <Spinner label="Carregando financeiro…" />;
  if (isError) return <p className="text-danger">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Seus recebimentos, saldo em custódia e repasses." />

      {/* Saldo disponível — destaque */}
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-text-muted">
              <IconWallet size={15} /> Disponível para saque
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-400">{formatBRL(data.availableCents)}</p>
            <p className="mt-1 text-xs text-text-muted">
              {data.releasedCount} repasse(s) liberado(s)
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Repasses automáticos chegam em breve"
            className="cursor-not-allowed rounded-medium border border-border px-3 py-2 text-sm font-medium text-text-muted opacity-70"
          >
            Sacar (em breve)
          </button>
        </div>
      </Card>

      {/* Resumo por estágio */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<IconClock size={16} />}
          label="Aguardando conclusão"
          value={formatBRL(data.blockedCents)}
          hint={`${data.blockedCount} em custódia`}
        />
        <SummaryCard
          icon={<IconPayment size={16} />}
          label="Em processamento"
          value={formatBRL(data.processingCents)}
          hint="cobranças não confirmadas"
        />
        <SummaryCard
          icon={<IconSuccess size={16} />}
          label="Total recebido"
          value={formatBRL(data.totalReceivedCents)}
          hint="custódia + liberado"
          accent
        />
      </div>

      {/* Em custódia (aguardando conclusão do serviço) */}
      <section>
        <SectionHeader title="Aguardando conclusão do serviço" />
        {data.escrow.length === 0 ? (
          <EmptyState icon={<IconClock size={22} />} title="Nada em custódia" />
        ) : (
          <ul className="space-y-2.5">
            {data.escrow.map((e) => (
              <EntryRow key={e.paymentId} entry={e} kind="escrow" />
            ))}
          </ul>
        )}
      </section>

      {/* Histórico de repasses */}
      <section>
        <SectionHeader title="Histórico de repasses" />
        {data.payouts.length === 0 ? (
          <EmptyState icon={<IconWallet size={22} />} title="Nenhum repasse ainda" hint="Valores liberados aparecem aqui." />
        ) : (
          <ul className="space-y-2.5">
            {data.payouts.map((e) => (
              <EntryRow key={e.paymentId} entry={e} kind="payout" />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className={`flex items-center gap-1.5 text-xs ${accent ? 'text-primary' : 'text-text-muted'}`}>
        {icon} {label}
      </p>
      <p className={`mt-1.5 text-xl font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p>}
    </Card>
  );
}

function EntryRow({ entry: e, kind }: { entry: ProviderFinanceEntry; kind: 'escrow' | 'payout' }) {
  const when = kind === 'payout' ? e.releasedAt : e.paidAt;
  return (
    <li>
      <Card to={`/orcamento/${e.quoteId}`} className="p-3.5">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              kind === 'payout' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {kind === 'payout' ? <IconWallet size={17} /> : <IconClock size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{e.categoryName}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-muted">
              <IconUser size={11} /> {e.clientName}
              {when && <span>· {formatDateTime(when)}</span>}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold text-foreground">{formatBRL(e.netCents)}</p>
            <p className="text-[11px] text-text-muted">
              {kind === 'payout' ? 'liberado' : 'em custódia'}
            </p>
          </div>
        </div>
      </Card>
    </li>
  );
}
