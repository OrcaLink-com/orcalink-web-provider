import { Link } from 'react-router-dom';
import { useProviderProfile, useServiceArea } from '../lib/queries';
import { Card } from './ui';
import { IconChevronRight, IconSuccess } from './icons';

interface ChecklistItem {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  to: string;
}

/**
 * Onboarding do prestador: checklist do que falta no cadastro para começar a
 * receber e responder propostas. Deriva os itens do estado real do perfil e
 * some sozinho quando está 100% completo.
 */
export function OnboardingChecklist() {
  const profileQ = useProviderProfile();
  const areaQ = useServiceArea();
  const p = profileQ.data;
  const area = areaQ.data;

  if (!p) return null; // ainda carregando o perfil

  const items: ChecklistItem[] = [
    {
      key: 'categories',
      label: 'Escolha suas categorias',
      hint: 'Você só recebe oportunidades das categorias que atende.',
      done: p.categoryIds.length > 0,
      to: '/app/perfil',
    },
    {
      key: 'company',
      label: 'Apresente sua empresa',
      hint: 'Nome e uma breve descrição para os clientes.',
      done: Boolean(p.companyName && p.bio),
      to: '/app/perfil',
    },
    {
      key: 'logo',
      label: 'Adicione a sua logo',
      hint: 'Aparece no seu perfil público e passa mais confiança.',
      done: Boolean(p.logoUrl),
      to: '/app/perfil',
    },
    {
      key: 'document',
      label: 'Informe seu CPF ou CNPJ',
      hint: 'Necessário para receber os pagamentos dos serviços.',
      done: Boolean(p.document),
      to: '/app/perfil',
    },
    {
      key: 'area',
      label: 'Defina sua área de atendimento',
      hint: 'O raio de distância em que você atende.',
      done: Boolean(area && area.radiusKm),
      to: '/app/area',
    },
    {
      key: 'phone',
      label: 'Informe um telefone de contato',
      hint: 'Para os clientes falarem com você.',
      done: Boolean(p.phone),
      to: '/app/perfil',
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null; // tudo pronto → some

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <Card className="space-y-4 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Complete seu cadastro</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Falta pouco para você começar a receber propostas.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
          {doneCount}/{items.length}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-content2">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-1">
        {items.map((it) =>
          it.done ? (
            <li key={it.key} className="flex items-center gap-3 rounded-medium px-2 py-2 text-sm">
              <IconSuccess size={18} className="shrink-0 text-success" />
              <span className="text-text-muted line-through">{it.label}</span>
            </li>
          ) : (
            <li key={it.key}>
              <Link
                to={it.to}
                className="flex items-center gap-3 rounded-medium px-2 py-2 transition-colors hover:bg-content2"
              >
                <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-text-muted/50" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{it.label}</span>
                  <span className="block text-xs text-text-muted">{it.hint}</span>
                </span>
                <IconChevronRight size={18} className="shrink-0 text-text-muted" />
              </Link>
            </li>
          ),
        )}
      </ul>
    </Card>
  );
}
