import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../../auth/AuthContext';
import type { ProviderStatus } from '../../lib/types';

const messages: Record<string, { title: string; text: string }> = {
  PENDING_APPROVAL: {
    title: 'Cadastro em análise',
    text: 'Recebemos seu cadastro. Nossa equipe está avaliando seu perfil e você poderá receber oportunidades assim que for aprovado.',
  },
  INVITED: {
    title: 'Complete seu cadastro',
    text: 'Finalize seu cadastro para que possamos avaliar seu perfil.',
  },
  REJECTED: {
    title: 'Cadastro não aprovado',
    text: 'Infelizmente seu cadastro não foi aprovado no momento. Entre em contato com o suporte para mais informações.',
  },
  SUSPENDED: {
    title: 'Conta suspensa',
    text: 'Sua conta está temporariamente suspensa. Fale com o suporte.',
  },
};

export function PendingApproval({ status }: { status: ProviderStatus | null }) {
  const { logout, user } = useAuth();
  const m = messages[status ?? 'PENDING_APPROVAL'] ?? messages.PENDING_APPROVAL;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10 text-center">
      <h1 className="mb-6 text-xl font-bold text-brand">{brand.name} Profissional</h1>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-2 text-lg font-semibold">{m.title}</h2>
        <p className="text-sm text-text-muted">{m.text}</p>
      </div>
      <p className="mt-6 text-sm text-text-muted">Olá, {user?.name}.</p>
      <button onClick={() => void logout()} className="mt-2 text-sm text-text-muted underline">
        Sair
      </button>
    </div>
  );
}
