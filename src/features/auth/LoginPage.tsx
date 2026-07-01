import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../../auth/AuthContext';
import type { OtpChannel } from '../../lib/types';

export function LoginPage() {
  const [params] = useSearchParams();
  const inviteToken = params.get('token');
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-center text-2xl font-bold text-brand">{brand.name} Profissional</h1>
      {inviteToken ? (
        <InviteForm token={inviteToken} />
      ) : (
        <>
          <p className="mb-8 text-center text-sm text-text-muted">
            Acesse sua conta de profissional parceiro.
          </p>
          <OtpForm />
        </>
      )}
    </div>
  );
}

function InviteForm({ token }: { token: string }) {
  const { acceptInvite } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [document, setDocument] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await acceptInvite({ token, name: name.trim(), companyName: companyName.trim() || undefined, document: document.trim() || undefined });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-text-muted">
        Você foi convidado para ser um profissional parceiro. Complete seu cadastro:
      </p>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Seu nome completo"
        className="w-full rounded-md border border-border bg-bg px-3 py-2"
      />
      <input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Empresa (opcional)"
        className="w-full rounded-md border border-border bg-bg px-3 py-2"
      />
      <input
        value={document}
        onChange={(e) => setDocument(e.target.value)}
        placeholder="CPF/CNPJ (opcional)"
        className="w-full rounded-md border border-border bg-bg px-3 py-2"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Enviando…' : 'Aceitar convite'}
      </button>
    </form>
  );
}

function OtpForm() {
  const { requestOtp, verifyOtp } = useAuth();
  const [channel, setChannel] = useState<OtpChannel>('EMAIL');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { devCode } = await requestOtp(channel, destination.trim());
      setDevCode(devCode ?? null);
      if (devCode) setCode(devCode);
      setStep('verify');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(channel, destination.trim(), code.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'request') {
    return (
      <form onSubmit={onRequest} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChannel('EMAIL')}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${channel === 'EMAIL' ? 'border-brand bg-brand text-white' : 'border-border'}`}
          >
            E-mail
          </button>
          <button
            type="button"
            onClick={() => setChannel('PHONE')}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${channel === 'PHONE' ? 'border-brand bg-brand text-white' : 'border-border'}`}
          >
            Telefone
          </button>
        </div>
        <input
          type={channel === 'EMAIL' ? 'email' : 'tel'}
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={channel === 'EMAIL' ? 'voce@exemplo.com' : '(11) 99999-8888'}
          className="w-full rounded-md border border-border bg-bg px-3 py-2"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Receber código'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} className="space-y-4">
      <p className="text-sm text-text-muted">
        Enviamos um código para <strong>{destination}</strong>.
      </p>
      {devCode && (
        <p className="rounded-md bg-card px-3 py-2 text-xs text-text-muted">
          Modo dev — código: <strong>{devCode}</strong>
        </p>
      )}
      <input
        inputMode="numeric"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Código de 6 dígitos"
        className="w-full rounded-md border border-border bg-bg px-3 py-2 tracking-widest"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
