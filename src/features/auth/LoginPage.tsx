import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../../auth/AuthContext';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Button, Card, Input } from '../../components/ui';

type Mode = 'code' | 'password';

/** Sem credencial no build, o bloco do Google (e o divisor) não aparecem. */
const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

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
          <p className="mb-6 text-center text-sm text-text-muted">
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

/**
 * Entrada do prestador: Google (se configurado), código no e-mail (OTP) ou
 * e-mail + senha. O canal por telefone saiu — SMS/WhatsApp têm custo por
 * mensagem e o backend recusa o canal (AUTH_PHONE_OTP_ENABLED).
 */
function OtpForm() {
  const { requestOtp, verifyOtp, loginWithGoogle, loginWithPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [devCode, setDevCode] = useState<string | null>(null);
  // Fluxo de senha em aparelho novo (2FA): pede um código antes de entrar.
  const [pwNeedsCode, setPwNeedsCode] = useState(false);
  const [pwCode, setPwCode] = useState('');
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Limpa o erro assim que o usuário edita os campos.
  useEffect(() => {
    setError(null);
  }, [email, code, password, pwCode]);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const onRequest = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { devCode } = await requestOtp('EMAIL', email.trim());
      setDevCode(devCode ?? null);
      if (devCode) setCode(devCode);
      setStep('verify');
    });
  };

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => verifyOtp('EMAIL', email.trim(), code.trim()));
  };

  const onPassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await loginWithPassword(email.trim(), password, {
        code: pwNeedsCode ? pwCode.trim() : undefined,
        trustDevice: pwNeedsCode ? trust : undefined,
      });
      if (res.status === 'code_required') {
        setPwNeedsCode(true);
        setDevCode(res.devCode ?? null);
        if (res.devCode) setPwCode(res.devCode);
      }
    });
  };

  return (
    <Card className="space-y-5 p-5">
      {/* Google primeiro: um toque, sem código. Some (com o divisor) se não
          houver VITE_GOOGLE_CLIENT_ID — o login por e-mail segue inteiro. */}
      {googleEnabled && (
        <>
          <GoogleSignInButton
            onCode={(code) => run(() => loginWithGoogle(code))}
            onError={setError}
          />
          <Divider />
        </>
      )}

      {step === 'verify' ? (
        <form onSubmit={onVerify} className="space-y-4">
          <p className="text-sm text-text-muted">
            Enviamos um código para <strong className="text-foreground">{email}</strong>.
          </p>
          {devCode && (
            <p className="rounded-medium bg-content2 px-3 py-2 text-xs text-text-muted">
              Modo dev — código: <strong>{devCode}</strong>
            </p>
          )}
          <Input label="Código de 6 dígitos" value={code} onChange={setCode} placeholder="000000" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" full loading={loading}>
            Entrar
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setError(null);
            }}
            className="w-full text-center text-sm text-text-muted underline"
          >
            Usar outro e-mail
          </button>
        </form>
      ) : mode === 'code' ? (
        <form onSubmit={onRequest} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="voce@exemplo.com"
            isRequired
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" full loading={loading}>
            Receber código por e-mail
          </Button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className="w-full text-center text-sm text-text-muted underline"
          >
            Entrar com senha
          </button>
        </form>
      ) : (
        <form onSubmit={onPassword} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="voce@exemplo.com"
            isRequired
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Sua senha"
            isRequired
          />
          {pwNeedsCode && (
            <>
              <p className="text-sm text-text-muted">
                Primeiro acesso neste aparelho: confirme com o código enviado a{' '}
                <strong className="text-foreground">{email}</strong>.
              </p>
              {devCode && (
                <p className="rounded-medium bg-content2 px-3 py-2 text-xs text-text-muted">
                  Modo dev — código: <strong>{devCode}</strong>
                </p>
              )}
              <Input label="Código de 6 dígitos" value={pwCode} onChange={setPwCode} placeholder="000000" />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={trust}
                  onChange={(e) => setTrust(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Confiar neste dispositivo por 60 dias (não pedir código de novo)
              </label>
            </>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" full loading={loading}>
            {pwNeedsCode ? 'Confirmar e entrar' : 'Entrar'}
          </Button>
          <button
            type="button"
            onClick={() => setMode('code')}
            className="w-full text-center text-sm text-text-muted underline"
          >
            Prefiro receber um código por e-mail
          </button>
        </form>
      )}
    </Card>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-text-muted">ou</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
