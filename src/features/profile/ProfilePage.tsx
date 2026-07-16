import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuBriefcase,
  LuChevronRight,
  LuImagePlus,
  LuImages,
  LuLock,
  LuMapPin,
  LuTrash2,
  LuUser,
} from "react-icons/lu";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useCategories,
  useProfile,
  useProviderProfile,
  useRequestPasswordOtp,
  useSetPassword,
  useUpdateMe,
  useUpdateProviderProfile,
} from "../../lib/queries";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import type { PortfolioItem } from "../../lib/types";
import { AvatarUploader } from "../../components/AvatarUploader";
import { CepField } from "../../components/CepField";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Textarea,
} from "../../components/ui";

type Section = "dados" | "empresa" | "endereco" | "portfolio" | "seguranca";

const NAV: { key: Section; label: string; desc: string; icon: ReactNode }[] = [
  {
    key: "dados",
    label: "Dados pessoais",
    desc: "Nome, telefone e e-mail",
    icon: <LuUser size={18} />,
  },
  {
    key: "empresa",
    label: "Empresa",
    desc: "Negócio, categorias e contato",
    icon: <LuBriefcase size={18} />,
  },
  {
    key: "endereco",
    label: "Endereço",
    desc: "CEP e localização",
    icon: <LuMapPin size={18} />,
  },
  {
    key: "portfolio",
    label: "Portfólio",
    desc: "Fotos dos seus trabalhos",
    icon: <LuImages size={18} />,
  },
  {
    key: "seguranca",
    label: "Segurança",
    desc: "Senha e conta",
    icon: <LuLock size={18} />,
  },
];

/** "Meu Perfil" do prestador: hero + seções navegáveis (sidebar no desktop, lista no mobile). */
export function ProfilePage() {
  const navigate = useNavigate();
  const profileQ = useProfile();

  if (profileQ.isLoading) return <Spinner label="Carregando perfil…" />;
  if (profileQ.isError || !profileQ.data)
    return (
      <p className="p-6 text-center text-sm text-danger">
        Não foi possível carregar seu perfil.
      </p>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-content2 hover:text-foreground"
        >
          <LuArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Meu perfil</h1>
          <p className="text-sm text-text-muted">
            Gerencie suas informações pessoais e da empresa.
          </p>
        </div>
      </div>
      <ProfileEditor profile={profileQ.data} />
    </div>
  );
}

function ProfileEditor({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["data"]>;
}) {
  const providerQ = useProviderProfile();
  const categoriesQ = useCategories();
  const updateMe = useUpdateMe();
  const updateBiz = useUpdateProviderProfile();
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Seção ativa vem da URL (?s=empresa). null = "menu" no mobile; no desktop mostra 'dados'.
  // Usar query param (mesma rota) preserva o estado do formulário ao trocar de seção.
  const [sp] = useSearchParams();
  const rawSection = sp.get("s");
  const active: Section | null = NAV.some((n) => n.key === rawSection)
    ? (rawSection as Section)
    : null;

  // Pessoais (Me)
  const [name, setName] = useState(profile.name);
  const [personalPhone, setPersonalPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");

  // Endereço (Me)
  const [addr, setAddr] = useState({
    zipCode: profile.zipCode ?? "",
    street: profile.street ?? "",
    number: profile.number ?? "",
    neighborhood: profile.neighborhood ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
  });
  const setA = (k: keyof typeof addr) => (v: string) =>
    setAddr((s) => ({ ...s, [k]: v }));

  // Empresa (ProviderProfile)
  const [f, setF] = useState({
    companyName: "",
    tradeName: "",
    bio: "",
    history: "",
    logoUrl: "",
    coverUrl: "",
    foundedYear: "",
    specialties: "",
    citiesServed: "",
    avgResponseMinutes: "",
    phone: "",
    document: "",
    birthDate: "",
    companyType: "",
    income: "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((s) => ({ ...s, [k]: v }));
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [social, setSocial] = useState({
    instagram: "",
    facebook: "",
    website: "",
    whatsapp: "",
  });

  const [ok, setOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useAutoHide(ok, () => setOk(false));

  useEffect(() => {
    const d = providerQ.data;
    if (!d) return;
    setF({
      companyName: d.companyName ?? "",
      tradeName: d.tradeName ?? "",
      bio: d.bio ?? "",
      history: d.history ?? "",
      logoUrl: d.logoUrl ?? "",
      coverUrl: d.coverUrl ?? "",
      foundedYear: d.foundedYear ? String(d.foundedYear) : "",
      specialties: d.specialties.join(", "),
      citiesServed: d.citiesServed.join(", "),
      avgResponseMinutes:
        d.avgResponseMinutes != null ? String(d.avgResponseMinutes) : "",
      phone: d.phone ?? "",
      document: d.document ?? "",
      birthDate: d.birthDate ?? "",
      companyType: d.companyType ?? "",
      income: d.incomeValueCents != null ? String(d.incomeValueCents / 100) : "",
    });
    setCategoryIds(d.categoryIds);
    setPortfolio(d.portfolio);
    setSocial({
      instagram: d.social.instagram ?? "",
      facebook: d.social.facebook ?? "",
      website: d.social.website ?? "",
      whatsapp: d.social.whatsapp ?? "",
    });
  }, [providerQ.data]);

  async function saveAvatar(url: string) {
    setAvatarUrl(url);
    await updateMe.mutateAsync({ avatarUrl: url });
    setOk(true);
  }
  function applyCep(r: {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  }) {
    setAddr((s) => ({
      ...s,
      street: r.street || s.street,
      neighborhood: r.neighborhood || s.neighborhood,
      city: r.city || s.city,
      state: r.state || s.state,
    }));
  }
  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }
  async function uploadTo(
    file: File,
    apply: (url: string) => void,
    kind: string,
  ) {
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadImage(file, kind);
      apply(res.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file)
      void uploadTo(
        file,
        (url) => setF((s) => ({ ...s, coverUrl: url })),
        "cover",
      );
  }
  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file)
      void uploadTo(
        file,
        (url) => setF((s) => ({ ...s, logoUrl: url })),
        "logo",
      );
  }
  function onAddPortfolio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file)
      void uploadTo(
        file,
        (url) =>
          setPortfolio((prev) => [
            ...prev,
            { id: `${Date.now()}`, url, title: "", description: "" },
          ]),
        "portfolio",
      );
  }
  function updateItem(idx: number, patch: Partial<PortfolioItem>) {
    setPortfolio((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }
  const toList = (v: string) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  async function saveAll() {
    setError(null);
    try {
      await Promise.all([
        updateMe.mutateAsync({
          name: name.trim(),
          phone: personalPhone.trim() || undefined,
          zipCode: addr.zipCode.trim() || undefined,
          street: addr.street.trim() || undefined,
          number: addr.number.trim() || undefined,
          neighborhood: addr.neighborhood.trim() || undefined,
          city: addr.city.trim() || undefined,
          state: addr.state.trim() || undefined,
        }),
        updateBiz.mutateAsync({
          companyName: f.companyName.trim() || undefined,
          tradeName: f.tradeName.trim() || undefined,
          bio: f.bio.trim() || undefined,
          history: f.history.trim() || undefined,
          logoUrl: f.logoUrl || undefined,
          coverUrl: f.coverUrl || undefined,
          foundedYear: f.foundedYear ? Number(f.foundedYear) : undefined,
          specialties: toList(f.specialties),
          citiesServed: toList(f.citiesServed),
          avgResponseMinutes: f.avgResponseMinutes
            ? Number(f.avgResponseMinutes)
            : undefined,
          phone: f.phone.trim() || undefined,
          document:
            f.document.trim() !== (providerQ.data?.document ?? "")
              ? f.document.trim()
              : undefined,
          birthDate: f.birthDate || undefined,
          companyType: f.companyType || undefined,
          incomeValueCents: f.income
            ? Math.round(Number(f.income.replace(",", ".")) * 100)
            : undefined,
          categoryIds,
          portfolio,
          social: {
            instagram: social.instagram.trim() || undefined,
            facebook: social.facebook.trim() || undefined,
            website: social.website.trim() || undefined,
            whatsapp: social.whatsapp.trim() || undefined,
          },
        }),
      ]);
      setOk(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (providerQ.isLoading) {
    return (
      <Card className="p-5">
        <Spinner label="Carregando seu perfil…" />
      </Card>
    );
  }

  const saving = updateMe.isPending || updateBiz.isPending;
  const eff: Section = active ?? "dados";
  const showSave = eff !== "seguranca";
  const catOptions = [
    { value: "", label: "Sem categoria" },
    ...(categoriesQ.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  function renderSection(section: Section): ReactNode {
    switch (section) {
      case "dados":
        return (
          <Card className="space-y-4 p-5">
            <SectionTitle icon={<LuUser size={16} />} title="Dados pessoais" />
            <div className="flex items-center gap-3">
              <AvatarUploader
                value={avatarUrl}
                name={name}
                onChange={(u) => void saveAvatar(u)}
              />
              <div>
                <p className="text-sm font-medium">Foto de perfil</p>
                <p className="text-xs text-text-muted">Aparece para os clientes nas conversas.</p>
              </div>
            </div>
            <Input label="Nome" value={name} onChange={setName} />
            <div>
              <Input
                label="Telefone"
                value={personalPhone}
                onChange={setPersonalPhone}
                placeholder="(11) 99999-8888"
              />
              {profile.phoneVerified && <VerifiedChip />}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">E-mail</p>
              <div className="flex items-center gap-2 rounded-medium border border-border bg-content2/50 px-3 py-2.5 text-sm text-text-muted">
                <span className="truncate">
                  {profile.email ?? "Sem e-mail cadastrado"}
                </span>
                {profile.emailVerified && (
                  <span className="ml-auto shrink-0">
                    <VerifiedChip />
                  </span>
                )}
              </div>
            </div>
          </Card>
        );
      case "empresa":
        return (
          <Card className="space-y-5 p-5">
            <SectionTitle icon={<LuBriefcase size={16} />} title="Empresa" />
            <p className="-mt-3 text-xs text-text-muted">
              Ajuda os clientes a conhecerem seu trabalho.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-sm font-medium">Logo</p>
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  className="flex h-24 w-full items-center justify-center overflow-hidden rounded-medium border border-dashed border-border bg-content2/40 hover:bg-content2"
                >
                  {f.logoUrl ? (
                    <img src={f.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <LuImagePlus size={16} /> Enviar logo
                    </span>
                  )}
                </button>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Capa</p>
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="flex h-24 w-full items-center justify-center overflow-hidden rounded-medium border border-dashed border-border bg-content2/40 hover:bg-content2"
                >
                  {f.coverUrl ? (
                    <img src={f.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <LuImagePlus size={16} /> Enviar capa
                    </span>
                  )}
                </button>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
            <input ref={coverRef} type="file" accept="image/*" onChange={onCover} className="hidden" />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nome da empresa"
                value={f.companyName}
                onChange={set("companyName")}
                placeholder="Pinturas Silva ME"
              />
              <Input
                label="Nome fantasia"
                value={f.tradeName}
                onChange={set("tradeName")}
                placeholder="Silva Pinturas"
              />
            </div>
            <div>
              <Input
                label="CPF ou CNPJ"
                value={f.document}
                onChange={set("document")}
                placeholder="Somente números"
              />
              <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1 rounded-full bg-content2 px-2 py-0.5 text-[10px] font-semibold">
                  🔒 Privado
                </span>
                Necessário para receber os pagamentos. Visível somente para
                você.
              </p>
            </div>
            {(() => {
              const isCnpj = f.document.replace(/\D/g, "").length > 11;
              return (
                <div className="space-y-3 rounded-medium border border-border bg-content2/30 p-3">
                  <p className="text-sm font-medium">Dados para recebimento</p>
                  <p className="-mt-2 text-xs text-text-muted">
                    Exigidos pelo nosso parceiro de pagamentos (Asaas) para
                    liberar seus repasses. O endereço vem da aba Endereço.
                    Visível somente para você.
                  </p>
                  <Input
                    label="Faturamento / renda mensal (R$)"
                    value={f.income}
                    onChange={set("income")}
                    placeholder="5000"
                  />
                  {isCnpj ? (
                    <Select
                      label="Tipo de empresa"
                      value={f.companyType}
                      onChange={set("companyType")}
                      placeholder="Selecione"
                      options={[
                        { value: "MEI", label: "MEI" },
                        { value: "LIMITED", label: "Ltda / Sociedade Limitada" },
                        { value: "INDIVIDUAL", label: "Empresário Individual" },
                        { value: "ASSOCIATION", label: "Associação" },
                      ]}
                    />
                  ) : (
                    <Input
                      label="Data de nascimento"
                      type="date"
                      value={f.birthDate}
                      onChange={set("birthDate")}
                    />
                  )}
                </div>
              );
            })()}
            <Textarea
              label="Descrição da empresa"
              value={f.bio}
              onChange={set("bio")}
              minRows={3}
              placeholder="O que sua empresa faz, diferenciais…"
            />
            <Textarea
              label="História da empresa"
              value={f.history}
              onChange={set("history")}
              minRows={3}
              placeholder="Como tudo começou…"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Atua desde (ano)"
                value={f.foundedYear}
                onChange={set("foundedYear")}
                placeholder="2014"
              />
              <Input
                label="Tempo médio de resposta (min)"
                value={f.avgResponseMinutes}
                onChange={set("avgResponseMinutes")}
                placeholder="60"
              />
            </div>
            <Input
              label="Especialidades (separe por vírgula)"
              value={f.specialties}
              onChange={set("specialties")}
              placeholder="Pintura, Textura, Gesso"
            />
            <Input
              label="Cidades atendidas (separe por vírgula)"
              value={f.citiesServed}
              onChange={set("citiesServed")}
              placeholder="São Paulo, Guarulhos"
            />
            <div>
              <p className="mb-2 text-sm text-text-muted">
                Categorias atendidas
              </p>
              <div className="flex flex-wrap gap-2">
                {categoriesQ.data?.map((c) => {
                  const on = categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        on
                          ? "border-primary bg-primary/15 font-medium text-primary"
                          : "border-border text-text-muted hover:bg-content2"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {!categoriesQ.data?.length && (
                  <span className="text-sm text-text-muted">
                    Sem categorias disponíveis.
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-text-muted">Contato público</p>
              <Input
                label="Telefone"
                value={f.phone}
                onChange={set("phone")}
                placeholder="(11) 99999-8888"
              />
              <Input
                label="WhatsApp"
                value={social.whatsapp}
                onChange={(v) => setSocial((s) => ({ ...s, whatsapp: v }))}
                placeholder="(11) 99999-8888"
              />
              <Input
                label="Instagram"
                value={social.instagram}
                onChange={(v) => setSocial((s) => ({ ...s, instagram: v }))}
                placeholder="@usuario"
              />
              <Input
                label="Facebook"
                value={social.facebook}
                onChange={(v) => setSocial((s) => ({ ...s, facebook: v }))}
              />
              <Input
                label="Site"
                value={social.website}
                onChange={(v) => setSocial((s) => ({ ...s, website: v }))}
                placeholder="https://…"
              />
            </div>
          </Card>
        );
      case "endereco":
        return (
          <Card className="space-y-4 p-5">
            <SectionTitle icon={<LuMapPin size={16} />} title="Endereço" />
            <CepField
              value={addr.zipCode}
              onChange={setA("zipCode")}
              onResolved={applyCep}
            />
            <Input label="Rua" value={addr.street} onChange={setA("street")} />
            <Input
              label="Número"
              value={addr.number}
              onChange={setA("number")}
            />
            <Input
              label="Bairro"
              value={addr.neighborhood}
              onChange={setA("neighborhood")}
            />
            <div className="grid grid-cols-[1fr,5rem] gap-3">
              <Input label="Cidade" value={addr.city} onChange={setA("city")} />
              <Input
                label="UF"
                value={addr.state}
                onChange={setA("state")}
                placeholder="SP"
              />
            </div>
          </Card>
        );
      case "portfolio":
        return (
          <Card className="space-y-3 p-5">
            <SectionTitle
              icon={<LuImages size={16} />}
              title="Portfólio de trabalhos"
            />
            {portfolio.map((it, idx) => (
              <div
                key={it.id ?? it.url}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div className="relative aspect-video w-full bg-content2">
                  <img
                    src={it.url}
                    alt={it.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPortfolio((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                    aria-label="Remover trabalho"
                  >
                    <LuTrash2 size={15} />
                  </button>
                </div>
                <div className="space-y-2 p-3">
                  <Input
                    label="Título"
                    value={it.title ?? ""}
                    onChange={(v) => updateItem(idx, { title: v })}
                    placeholder="Ex.: Pintura de fachada"
                  />
                  <Textarea
                    label="Descrição"
                    value={it.description ?? ""}
                    onChange={(v) => updateItem(idx, { description: v })}
                    minRows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Categoria"
                      options={catOptions}
                      value={it.categoryId ?? ""}
                      onChange={(v) => updateItem(idx, { categoryId: v })}
                    />
                    <Input
                      label="Data (opcional)"
                      value={it.date ?? ""}
                      onChange={(v) => updateItem(idx, { date: v })}
                      placeholder="2025-03"
                    />
                  </div>
                </div>
              </div>
            ))}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-6 text-sm text-text-muted hover:bg-content2">
              <LuImagePlus size={18} /> Adicionar trabalho
              <input
                type="file"
                accept="image/*"
                onChange={onAddPortfolio}
                className="hidden"
              />
            </label>
          </Card>
        );
      case "seguranca":
        return (
          <div className="space-y-4">
            <PasswordSection
              hasPassword={profile.hasPassword}
              hasEmail={Boolean(profile.email)}
            />
            <DangerZoneSection />
          </div>
        );
    }
  }

  return (
    <>
      <div className="mt-4">
        {/* Mobile: lista de seções. No desktop a navegação fica no menu lateral (Meu perfil). */}
        {active === null && (
          <div className="space-y-2 lg:hidden">
            {NAV.map((n) => (
              <Link
                key={n.key}
                to={`?s=${n.key}`}
                className="flex w-full items-center gap-3 rounded-large border border-border bg-content1 p-4 text-left transition-colors hover:bg-content2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-medium bg-primary/10 text-primary">
                  {n.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{n.label}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {n.desc}
                  </span>
                </span>
                <LuChevronRight
                  size={18}
                  className="shrink-0 text-text-muted"
                />
              </Link>
            ))}
          </div>
        )}

        {/* Mobile: voltar ao menu de seções */}
        {active !== null && (
          <Link
            to="/app/perfil"
            className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground lg:hidden"
          >
            <LuArrowLeft size={16} /> Todas as seções
          </Link>
        )}

        {/* Conteúdo da seção: desktop sempre; mobile só quando uma seção está aberta */}
        <div className={active === null ? "hidden lg:block" : ""}>
          {renderSection(eff)}

          {uploading && (
            <p className="mt-2 text-xs text-text-muted">Enviando imagem…</p>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}

          {showSave && (
            <div className="sticky bottom-3 z-10 mt-4 flex items-center gap-3 rounded-large border border-border bg-content1/95 p-3 shadow-pop backdrop-blur">
              <Button
                full
                loading={saving}
                disabled={uploading}
                onClick={() => void saveAll()}
              >
                Salvar alterações
              </Button>
              {ok && (
                <span className="shrink-0 text-sm text-success">Salvo!</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ───────── Senha (ação separada) ───────── */
function PasswordSection({
  hasPassword,
  hasEmail,
}: {
  hasPassword: boolean;
  hasEmail: boolean;
}) {
  const requestOtp = useRequestPasswordOtp();
  const setPassword = useSetPassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }
    try {
      await setPassword.mutateAsync(
        hasPassword
          ? { newPassword: next, currentPassword: current }
          : { newPassword: next, code },
      );
      setDone(true);
      setCurrent("");
      setNext("");
      setCode("");
      setOtpSent(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle
        icon={<LuLock size={16} />}
        title={hasPassword ? "Alterar senha" : "Cadastrar senha"}
      />
      {done && (
        <p className="rounded-medium bg-success/15 px-3 py-2 text-sm text-success">
          Senha atualizada com sucesso.
        </p>
      )}
      {hasPassword ? (
        <>
          <Input
            label="Senha atual"
            type="password"
            value={current}
            onChange={setCurrent}
          />
          <Input
            label="Nova senha"
            type="password"
            value={next}
            onChange={setNext}
            placeholder="Mín. 8 caracteres"
          />
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted">
            Sua conta usa código por e-mail. Para criar uma senha, confirme seu
            e-mail com o código e defina a senha.
          </p>
          {!otpSent ? (
            <Button
              variant="secondary"
              onClick={() => void sendOtp()}
              loading={requestOtp.isPending}
              disabled={!hasEmail}
            >
              {hasEmail
                ? "Enviar código ao meu e-mail"
                : "Cadastre um e-mail primeiro"}
            </Button>
          ) : (
            <>
              {devCode && (
                <p className="text-xs text-text-muted">
                  Código (dev): <strong>{devCode}</strong>
                </p>
              )}
              <Input
                label="Código do e-mail"
                value={code}
                onChange={setCode}
                placeholder="6 dígitos"
              />
              <Input
                label="Nova senha"
                type="password"
                value={next}
                onChange={setNext}
                placeholder="Mín. 8 caracteres"
              />
            </>
          )}
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {(hasPassword || otpSent) && (
        <Button onClick={() => void submit()} loading={setPassword.isPending}>
          {hasPassword ? "Alterar senha" : "Cadastrar senha"}
        </Button>
      )}
    </Card>
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
      await logout();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }

  return (
    <Card className="space-y-3 border-danger/30 p-5">
      <SectionTitle icon={<LuTrash2 size={16} />} title="Excluir minha conta" />
      <p className="text-sm text-text-muted">
        Remove seus dados pessoais e o perfil profissional e encerra o acesso.
        Registros financeiros exigidos por lei são mantidos de forma
        anonimizada. Esta ação não pode ser desfeita.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        variant="secondary"
        className="text-danger"
        onClick={() => setOpen(true)}
      >
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

/* ───────── helpers ───────── */
function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-primary">{icon}</span>
      {title}
    </div>
  );
}

function VerifiedChip() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
      <LuBadgeCheck size={12} /> Verificado
    </span>
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
