import type { ReactNode } from 'react';
import { brand } from '@orcalink/design-tokens/brand.config';
import { links } from '@orcalink/design-tokens/links.config';
import { Button, ButtonLink } from '../../components/ui';
import {
  IconAgenda,
  IconArrowRight,
  IconBell,
  IconBusiness,
  IconFast,
  IconGrowth,
  IconHistory,
  IconMetrics,
  IconShield,
  IconStar,
  IconSuccess,
  IconWallet,
} from '../../components/icons';

/** Landing premium do Prestador (pública) — foco em conversão de novos profissionais. */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Nav />
      <Hero />
      <Benefits />
      <HowItWorks />
      <Differentials />
      <Plans />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <span className="flex items-baseline gap-1.5 text-xl font-bold tracking-tight text-primary">
          {brand.name}
          <span className="text-xs font-normal text-text-muted">Pro</span>
        </span>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href={links.clientUrl}
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-text-muted hover:text-foreground sm:inline-block"
          >
            Sou cliente
          </a>
          <ButtonLink to="/login" size="sm">
            Entrar
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(34,197,94,0.16),transparent)]" />
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-content1 px-3 py-1 text-xs text-text-muted">
          <IconGrowth size={13} className="text-success" /> Mais clientes, menos esforço
        </span>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Encontre novos clientes e <span className="text-primary">aumente sua receita</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-text-muted">
          Receba orçamentos da sua região, envie propostas, organize sua agenda e acompanhe seus
          resultados — tudo num painel feito para o profissional.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink to="/login" size="lg" endContent={<IconArrowRight size={18} />}>
            Começar agora
          </ButtonLink>
          <a href="#beneficios">
            <Button variant="secondary" size="lg">
              Ver vantagens
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: <IconBusiness size={20} />, title: 'Novos orçamentos', desc: 'Oportunidades da sua área, em tempo real.' },
    { icon: <IconAgenda size={20} />, title: 'Gestão de agenda', desc: 'Disponibilidade, bloqueios e visitas organizados.' },
    { icon: <IconWallet size={20} />, title: 'Painel financeiro', desc: 'Acompanhe seus recebimentos e repasses.' },
    { icon: <IconMetrics size={20} />, title: 'Métricas', desc: 'Conversão, receita e tempo de resposta.' },
    { icon: <IconHistory size={20} />, title: 'Histórico de clientes', desc: 'Tudo de cada negociação num só lugar.' },
    { icon: <IconStar size={20} />, title: 'Avaliações', desc: 'Construa sua reputação e ganhe mais trabalhos.' },
    { icon: <IconBell size={20} />, title: 'Notificações', desc: 'Não perca nenhuma oportunidade ou resposta.' },
    { icon: <IconSuccess size={20} />, title: 'Gestão de serviços', desc: 'Do aceite à conclusão, sem planilhas.' },
  ];
  return (
    <Section id="beneficios" eyebrow="Recursos" title="Tudo para crescer seu negócio" className="bg-content1/30">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b) => (
          <div key={b.title} className="rounded-large border border-border bg-content1 p-5 shadow-card">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-medium bg-primary/15 text-primary">
              {b.icon}
            </div>
            <p className="font-semibold">{b.title}</p>
            <p className="mt-1 text-sm text-text-muted">{b.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function HowItWorks() {
  const steps = ['Cadastro', 'Aprovação', 'Oportunidades', 'Propostas', 'Fechamento', 'Execução', 'Recebimento'];
  return (
    <Section eyebrow="Como funciona" title="Do cadastro ao recebimento">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {steps.map((s, i) => (
          <li key={s} className="rounded-large border border-border bg-content1 p-4 text-center shadow-card">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {i + 1}
            </span>
            <p className="mt-2 text-xs font-medium">{s}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Differentials() {
  const items = [
    { icon: <IconFast size={22} />, title: 'Rápido de usar', desc: 'Responda oportunidades em poucos toques.' },
    { icon: <IconShield size={22} />, title: 'Pagamento garantido', desc: 'Valor em custódia, repasse na conclusão.' },
    { icon: <IconGrowth size={22} />, title: 'Mais visibilidade', desc: 'Apareça para clientes da sua região.' },
  ];
  return (
    <Section eyebrow="Diferenciais" title="Por que escolher a plataforma" className="bg-content1/30">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((d) => (
          <div key={d.title} className="rounded-large border border-border bg-content1 p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              {d.icon}
            </div>
            <p className="font-semibold">{d.title}</p>
            <p className="mt-1 text-sm text-text-muted">{d.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Plans() {
  const plans = [
    { name: 'Free', price: 'R$ 0', features: ['Receber oportunidades', 'Enviar propostas', 'Agenda básica'] },
    { name: 'Pro', price: 'Em breve', features: ['Destaque nas buscas', 'Métricas avançadas', 'Suporte prioritário'], highlight: true },
  ];
  return (
    <Section eyebrow="Planos" title="Comece grátis, evolua quando quiser">
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-large border p-6 shadow-card ${p.highlight ? 'border-primary/50 bg-primary/5' : 'border-border bg-content1'}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">{p.name}</p>
              {p.highlight && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">Em breve</span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold">{p.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-text-muted">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <IconSuccess size={15} className="text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button variant={p.highlight ? 'secondary' : 'primary'} full className="mt-5" disabled={p.highlight}>
              {p.highlight ? 'Disponível em breve' : 'Começar grátis'}
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <section className="border-y border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pronto para receber mais trabalhos?</h2>
        <p className="mx-auto mt-3 max-w-lg text-text-muted">
          Crie sua conta e comece a receber oportunidades hoje mesmo.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink to="/login" size="lg" endContent={<IconArrowRight size={18} />}>
            Começar agora
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-content1/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-text-muted sm:flex-row">
        <span>
          © {new Date().getFullYear()} {brand.legalName}
        </span>
        <div className="flex items-center gap-4">
          <a href={links.clientUrl} className="hover:text-foreground">
            Sou cliente
          </a>
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground">
            Contato
          </a>
          <a href={links.adminUrl} className="text-text-muted/60 hover:text-text-muted">
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
  className = '',
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-8 text-center">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>}
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}
