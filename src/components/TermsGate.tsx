import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMe } from '../lib/queries';
import { queryKeys } from '../lib/queries';
import { api } from '../lib/api';
import { Button } from './ui';

/**
 * Portão de aceite dos Termos + Privacidade (prestador). Bloqueia o app até o
 * usuário aceitar a versão vigente. Cobre novos usuários e re-aceite em novas
 * versões. O aceite é registrado no backend com versão + data + IP.
 */
export function TermsGate() {
  const me = useMe();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);
  const accept = useMutation({
    mutationFn: () => api.acceptTerms(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });

  if (!me.data || me.data.termsAccepted !== false) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-large border border-border bg-content1 p-5 shadow-pop">
        <h2 className="text-lg font-bold">Antes de continuar</h2>
        <p className="mt-1 text-sm text-text-muted">
          Para usar a OrcaLink, você precisa aceitar os Termos de Uso e a Política de Privacidade.
        </p>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            Li e aceito os{' '}
            <Link to="/termos" target="_blank" className="text-primary underline">
              Termos de Uso
            </Link>
            , o{' '}
            <Link to="/termos-profissional" target="_blank" className="text-primary underline">
              Termo do Profissional
            </Link>
            , o{' '}
            <Link to="/conduta" target="_blank" className="text-primary underline">
              Código de Conduta
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank" className="text-primary underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        <Button full className="mt-4" disabled={!checked} loading={accept.isPending} onClick={() => accept.mutate()}>
          Aceitar e continuar
        </Button>
        {accept.isError && <p className="mt-2 text-sm text-danger">{(accept.error as Error).message}</p>}
      </div>
    </div>
  );
}
