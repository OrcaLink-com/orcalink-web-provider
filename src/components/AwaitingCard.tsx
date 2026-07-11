import { motion } from 'framer-motion';
import { LuLoaderCircle } from 'react-icons/lu';

/**
 * Estado premium "aguardando o cliente" — FIXADO acima do input, mesmo visual do
 * NextActionCard, porém SEM botão de ação (o prestador só espera). Um spinner
 * sutil reforça que há uma solicitação pendente.
 */
export function AwaitingCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  /** Ação secundária opcional (ex.: "Enviar proposta revisada"). */
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-border bg-gradient-to-b from-amber-500/10 to-transparent px-3 py-3"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
          <LuLoaderCircle size={18} className="animate-spin" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Aguardando cliente</p>
          <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        </div>
      </div>
      {action && <div className="mt-2 text-center">{action}</div>}
    </motion.div>
  );
}
