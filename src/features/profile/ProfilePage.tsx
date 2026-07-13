import { useEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuBriefcase, LuImagePlus, LuLock, LuMapPin, LuTrash2, LuUser } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import {
  useCategories,
  useProfile,
  useProviderProfile,
  useRequestPasswordOtp,
  useSetPassword,
  useUpdateMe,
  useUpdateProviderProfile,
} from '../../lib/queries';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type { PortfolioItem } from '../../lib/types';
import { AvatarUploader } from '../../components/AvatarUploader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button, Card, Input, Select, Spinner, Textarea } from '../../components/ui';

/** Tela "Meu Perfil" do prestador: dados pessoais, endereço, senha e perfil profissional. */
export function ProfilePage() {
  const navigate = useNavigate();
  const profileQ = useProfile();

  if (profileQ.isLoading) return <Spinner label="Carregando perfil…" />;
  if (profileQ.isError || !profileQ.data)
    return <p className="p-6 text-center text-sm text-danger">Não foi possível carregar seu perfil.</p>;

  const p = profileQ.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-content2 hover:text-foreground"
        >
          <LuArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Meu perfil</h1>
      </div>

      <PersonalSection profile={p} />
      <BusinessSection />
      <AddressSection profile={p} />
      <PasswordSection hasPassword={p.hasPassword} hasEmail={Boolean(p.email)} />
      <DangerZoneSection />
    </div>
  );
}

/* ───────── Zona de risco: excluir conta (LGPD) ───────── */
function DangerZoneSection() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    try {
      await api.deleteAccount();
      await logout(); // encerra a sessão e volta pra landing
    } catch (e) {
      setError((e as Error).message);
      throw e; // mantém o modal aberto em caso de erro
    }
  }

  return (
    <Card className="space-y-3 border-danger/30 p-5">
      <SectionTitle icon={<LuTrash2 size={16} />} title="Excluir minha conta" />
      <p className="text-sm text-text-muted">
        Remove seus dados pessoais e o perfil profissional e encerra o acesso. Registros financeiros
        exigidos por lei são mantidos de forma anonimizada. Esta ação não pode ser desfeita.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button variant="secondary" className="text-danger" onClick={() => setOpen(true)}>
        Excluir minha conta
      </Button>
      <ConfirmDialog
        open={open}
        danger
        title="Excluir sua conta?"
        description="Seus dados pessoais e seu perfil profissional serão removidos e você perderá o acesso. Não é possível desfazer."
        confirmLabel="Excluir conta"
        onConfirm={remove}
        onClose={() => setOpen(false)}
      />
    </Card>
  );
}

/* ───────── Dados pessoais ───────── */
function PersonalSection({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>['data']> }) {
  const update = useUpdateMe();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [ok, setOk] = useState(false);
  useAutoHide(ok, () => setOk(false));

  async function saveAvatar(url: string) {
    setAvatarUrl(url);
    await update.mutateAsync({ avatarUrl: url });
    setOk(true);
  }
  async function save() {
    await update.mutateAsync({ name: name.trim(), phone: phone.trim() || undefined });
    setOk(true);
  }

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle icon={<LuUser size={16} />} title="Informações pessoais" />
      <div className="flex items-center gap-4">
        <AvatarUploader value={avatarUrl} name={name} onChange={(u) => void saveAvatar(u)} />
        <div className="text-sm text-text-muted">
          <p className="font-medium text-foreground">Foto de perfil</p>
          <p>Toque na foto para trocar, recortar e enviar.</p>
        </div>
      </div>
      <Input label="Nome" value={name} onChange={setName} />
      <Input label="Telefone" value={phone} onChange={setPhone} placeholder="(11) 99999-8888" />
      <div>
        <p className="mb-1 text-sm text-text-muted">E-mail</p>
        <div className="rounded-medium border border-border bg-content2/50 px-3 py-2.5 text-sm text-text-muted">
          {profile.email ?? 'Sem e-mail cadastrado'}
        </div>
      </div>
      {update.isError && <p className="text-sm text-danger">{(update.error as Error).message}</p>}
      <SaveRow onSave={() => void save()} loading={update.isPending} ok={ok} label="Salvar alterações" />
    </Card>
  );
}

/* ───────── Perfil profissional ───────── */
function BusinessSection() {
  const profileQ = useProviderProfile();
  const categoriesQ = useCategories();
  const update = useUpdateProviderProfile();
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    companyName: '',
    tradeName: '',
    bio: '',
    history: '',
    logoUrl: '',
    coverUrl: '',
    foundedYear: '',
    specialties: '',
    citiesServed: '',
    avgResponseMinutes: '',
    phone: '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [social, setSocial] = useState({ instagram: '', facebook: '', website: '', whatsapp: '' });
  const [ok, setOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useAutoHide(ok, () => setOk(false));

  // Preenche o formulário quando o perfil chega.
  useEffect(() => {
    const d = profileQ.data;
    if (!d) return;
    setF({
      companyName: d.companyName ?? '',
      tradeName: d.tradeName ?? '',
      bio: d.bio ?? '',
      history: d.history ?? '',
      logoUrl: d.logoUrl ?? '',
      coverUrl: d.coverUrl ?? '',
      foundedYear: d.foundedYear ? String(d.foundedYear) : '',
      specialties: d.specialties.join(', '),
      citiesServed: d.citiesServed.join(', '),
      avgResponseMinutes: d.avgResponseMinutes != null ? String(d.avgResponseMinutes) : '',
      phone: d.phone ?? '',
    });
    setCategoryIds(d.categoryIds);
    setPortfolio(d.portfolio);
    setSocial({
      instagram: d.social.instagram ?? '',
      facebook: d.social.facebook ?? '',
      website: d.social.website ?? '',
      whatsapp: d.social.whatsapp ?? '',
    });
  }, [profileQ.data]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function uploadTo(file: File, apply: (url: string) => void) {
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadImage(file);
      apply(res.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadTo(file, (url) => setF((s) => ({ ...s, coverUrl: url })));
  }
  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadTo(file, (url) => setF((s) => ({ ...s, logoUrl: url })));
  }
  function onAddPortfolio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file)
      void uploadTo(file, (url) =>
        setPortfolio((prev) => [...prev, { id: `${Date.now()}`, url, title: '', description: '' }]),
      );
  }
  function updateItem(idx: number, patch: Partial<PortfolioItem>) {
    setPortfolio((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const toList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

  async function save() {
    setError(null);
    try {
      await update.mutateAsync({
        companyName: f.companyName.trim() || undefined,
        tradeName: f.tradeName.trim() || undefined,
        bio: f.bio.trim() || undefined,
        history: f.history.trim() || undefined,
        logoUrl: f.logoUrl || undefined,
        coverUrl: f.coverUrl || undefined,
        foundedYear: f.foundedYear ? Number(f.foundedYear) : undefined,
        specialties: toList(f.specialties),
        citiesServed: toList(f.citiesServed),
        avgResponseMinutes: f.avgResponseMinutes ? Number(f.avgResponseMinutes) : undefined,
        phone: f.phone.trim() || undefined,
        categoryIds,
        portfolio,
        social: {
          instagram: social.instagram.trim() || undefined,
          facebook: social.facebook.trim() || undefined,
          website: social.website.trim() || undefined,
          whatsapp: social.whatsapp.trim() || undefined,
        },
      });
      setOk(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (profileQ.isLoading) return <Card className="p-5"><Spinner label="Carregando perfil profissional…" /></Card>;

  const catOptions = [{ value: '', label: 'Sem categoria' }, ...(categoriesQ.data ?? []).map((c) => ({ value: c.id, label: c.name }))];

  return (
    <Card className="space-y-5 p-5">
      <SectionTitle icon={<LuBriefcase size={16} />} title="Perfil da empresa" />

      {/* Capa + logo */}
      <div>
        <p className="mb-1 text-sm text-text-muted">Foto de capa (banner)</p>
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-content2/40 text-text-muted hover:bg-content2"
        >
          {f.coverUrl ? (
            <img src={f.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex items-center gap-2 text-sm"><LuImagePlus size={18} /> Adicionar capa</span>
          )}
        </button>
        <input ref={coverRef} type="file" accept="image/*" onChange={onCover} className="hidden" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-content2/40 text-text-muted hover:bg-content2"
        >
          {f.logoUrl ? <img src={f.logoUrl} alt="" className="h-full w-full object-cover" /> : <LuImagePlus size={18} />}
        </button>
        <div className="text-sm text-text-muted">
          <p className="font-medium text-foreground">Logo da empresa</p>
          <p>Aparece no seu perfil público.</p>
        </div>
        <input ref={logoRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
      </div>

      {/* Dados básicos */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome da empresa" value={f.companyName} onChange={set('companyName')} placeholder="Pinturas Silva ME" />
        <Input label="Nome fantasia" value={f.tradeName} onChange={set('tradeName')} placeholder="Silva Pinturas" />
      </div>
      <Textarea label="Descrição da empresa" value={f.bio} onChange={set('bio')} minRows={3} placeholder="O que sua empresa faz, diferenciais…" />
      <Textarea label="História da empresa" value={f.history} onChange={set('history')} minRows={3} placeholder="Como tudo começou…" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Atua desde (ano)" value={f.foundedYear} onChange={set('foundedYear')} placeholder="2014" />
        <Input label="Tempo médio de resposta (min)" value={f.avgResponseMinutes} onChange={set('avgResponseMinutes')} placeholder="60" />
      </div>
      <Input label="Especialidades (separe por vírgula)" value={f.specialties} onChange={set('specialties')} placeholder="Pintura, Textura, Gesso" />

      {/* Atendimento */}
      <Input label="Cidades atendidas (separe por vírgula)" value={f.citiesServed} onChange={set('citiesServed')} placeholder="São Paulo, Guarulhos" />
      <div>
        <p className="mb-2 text-sm text-text-muted">Categorias atendidas</p>
        <div className="flex flex-wrap gap-2">
          {categoriesQ.data?.map((c) => {
            const on = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on ? 'border-primary bg-primary/15 font-medium text-primary' : 'border-border text-text-muted hover:bg-content2'
                }`}
              >
                {c.name}
              </button>
            );
          })}
          {!categoriesQ.data?.length && <span className="text-sm text-text-muted">Sem categorias disponíveis.</span>}
        </div>
      </div>

      {/* Contato */}
      <div className="space-y-3">
        <p className="text-sm text-text-muted">Contato</p>
        <Input label="Telefone" value={f.phone} onChange={set('phone')} placeholder="(11) 99999-8888" />
        <Input label="WhatsApp" value={social.whatsapp} onChange={(v) => setSocial((s) => ({ ...s, whatsapp: v }))} placeholder="(11) 99999-8888" />
        <Input label="Instagram" value={social.instagram} onChange={(v) => setSocial((s) => ({ ...s, instagram: v }))} placeholder="@usuario" />
        <Input label="Facebook" value={social.facebook} onChange={(v) => setSocial((s) => ({ ...s, facebook: v }))} />
        <Input label="Site" value={social.website} onChange={(v) => setSocial((s) => ({ ...s, website: v }))} placeholder="https://…" />
      </div>

      {/* Portfólio (imagens grandes, cada trabalho com título/descrição/categoria/data) */}
      <div className="space-y-3">
        <p className="text-sm text-text-muted">Portfólio de trabalhos</p>
        {portfolio.map((it, idx) => (
          <div key={it.id ?? it.url} className="overflow-hidden rounded-2xl border border-border">
            <div className="relative aspect-video w-full bg-content2">
              <img src={it.url} alt={it.title ?? ''} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPortfolio((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                aria-label="Remover trabalho"
              >
                <LuTrash2 size={15} />
              </button>
            </div>
            <div className="space-y-2 p-3">
              <Input label="Título" value={it.title ?? ''} onChange={(v) => updateItem(idx, { title: v })} placeholder="Ex.: Pintura de fachada" />
              <Textarea label="Descrição" value={it.description ?? ''} onChange={(v) => updateItem(idx, { description: v })} minRows={2} />
              <div className="grid grid-cols-2 gap-2">
                <Select label="Categoria" options={catOptions} value={it.categoryId ?? ''} onChange={(v) => updateItem(idx, { categoryId: v })} />
                <Input label="Data (opcional)" value={it.date ?? ''} onChange={(v) => updateItem(idx, { date: v })} placeholder="2025-03" />
              </div>
            </div>
          </div>
        ))}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-6 text-sm text-text-muted hover:bg-content2">
          <LuImagePlus size={18} /> Adicionar trabalho
          <input type="file" accept="image/*" onChange={onAddPortfolio} className="hidden" />
        </label>
      </div>

      {uploading && <p className="text-xs text-text-muted">Enviando imagem…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <SaveRow onSave={() => void save()} loading={update.isPending} ok={ok} label="Salvar perfil da empresa" />
    </Card>
  );
}

/* ───────── Endereço ───────── */
function AddressSection({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>['data']> }) {
  const update = useUpdateMe();
  const [form, setForm] = useState({
    zipCode: profile.zipCode ?? '',
    street: profile.street ?? '',
    number: profile.number ?? '',
    neighborhood: profile.neighborhood ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
  });
  const [ok, setOk] = useState(false);
  useAutoHide(ok, () => setOk(false));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    await update.mutateAsync(form);
    setOk(true);
  }

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle icon={<LuMapPin size={16} />} title="Endereço" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="CEP" value={form.zipCode} onChange={set('zipCode')} placeholder="00000-000" />
        <Input label="Número" value={form.number} onChange={set('number')} />
      </div>
      <Input label="Rua" value={form.street} onChange={set('street')} />
      <Input label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Cidade" value={form.city} onChange={set('city')} />
        <Input label="Estado" value={form.state} onChange={set('state')} placeholder="UF" />
      </div>
      {update.isError && <p className="text-sm text-danger">{(update.error as Error).message}</p>}
      <SaveRow onSave={() => void save()} loading={update.isPending} ok={ok} label="Salvar endereço" />
    </Card>
  );
}

/* ───────── Senha ───────── */
function PasswordSection({ hasPassword, hasEmail }: { hasPassword: boolean; hasEmail: boolean }) {
  const requestOtp = useRequestPasswordOtp();
  const setPassword = useSetPassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpa o erro assim que o usuário edita os campos de senha.
  useEffect(() => {
    setError(null);
  }, [current, next, code]);

  async function sendOtp() {
    setError(null);
    try {
      const res = await requestOtp.mutateAsync();
      setOtpSent(true);
      setDevCode(res.devCode ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function submit() {
    setError(null);
    if (next.length < 8) {
      setError('A nova senha deve ter ao menos 8 caracteres.');
      return;
    }
    try {
      await setPassword.mutateAsync(
        hasPassword ? { newPassword: next, currentPassword: current } : { newPassword: next, code },
      );
      setDone(true);
      setCurrent('');
      setNext('');
      setCode('');
      setOtpSent(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle icon={<LuLock size={16} />} title={hasPassword ? 'Alterar senha' : 'Cadastrar senha'} />
      {done && <p className="rounded-medium bg-success/15 px-3 py-2 text-sm text-success">Senha atualizada com sucesso.</p>}
      {hasPassword ? (
        <>
          <Input label="Senha atual" type="password" value={current} onChange={setCurrent} />
          <Input label="Nova senha" type="password" value={next} onChange={setNext} placeholder="Mín. 8 caracteres" />
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted">
            Sua conta usa código por e-mail. Para criar uma senha, confirme seu e-mail com o código e defina a senha.
          </p>
          {!otpSent ? (
            <Button variant="secondary" onClick={() => void sendOtp()} loading={requestOtp.isPending} disabled={!hasEmail}>
              {hasEmail ? 'Enviar código ao meu e-mail' : 'Cadastre um e-mail primeiro'}
            </Button>
          ) : (
            <>
              {devCode && <p className="text-xs text-text-muted">Código (dev): <strong>{devCode}</strong></p>}
              <Input label="Código do e-mail" value={code} onChange={setCode} placeholder="6 dígitos" />
              <Input label="Nova senha" type="password" value={next} onChange={setNext} placeholder="Mín. 8 caracteres" />
            </>
          )}
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {(hasPassword || otpSent) && (
        <Button onClick={() => void submit()} loading={setPassword.isPending}>
          {hasPassword ? 'Alterar senha' : 'Cadastrar senha'}
        </Button>
      )}
    </Card>
  );
}

/* ───────── helpers ───────── */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-primary">{icon}</span>
      {title}
    </div>
  );
}

function SaveRow({ onSave, loading, ok, label }: { onSave: () => void; loading: boolean; ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Button onClick={onSave} loading={loading}>
        {label}
      </Button>
      {ok && <span className="text-sm text-success">Salvo!</span>}
    </div>
  );
}

function useAutoHide(active: boolean, hide: () => void) {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(hide, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
