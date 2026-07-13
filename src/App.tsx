import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useMe } from './lib/queries';
import { Layout } from './components/Layout';
import { LegalPage } from './components/LegalPage';
import { TermsGate } from './components/TermsGate';
import { Spinner } from './components/ui';

// Code-splitting: cada tela vira um chunk sob demanda (recharts fica isolado na Home).
const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const PendingApproval = lazy(() => import('./features/auth/PendingApproval').then((m) => ({ default: m.PendingApproval })));
const HomePage = lazy(() => import('./features/home/HomePage').then((m) => ({ default: m.HomePage })));
const NegociosPage = lazy(() => import('./features/negocios/NegociosPage').then((m) => ({ default: m.NegociosPage })));
const QuoteDetailPage = lazy(() => import('./features/quotes/QuoteDetailPage').then((m) => ({ default: m.QuoteDetailPage })));
const ConversationPage = lazy(() => import('./features/conversations/ConversationPage').then((m) => ({ default: m.ConversationPage })));
const ServiceAreaPage = lazy(() => import('./features/area/ServiceAreaPage').then((m) => ({ default: m.ServiceAreaPage })));
const AgendaPage = lazy(() => import('./features/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })));
const EuPage = lazy(() => import('./features/profile/EuPage').then((m) => ({ default: m.EuPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const InboxPage = lazy(() => import('./features/inbox/InboxPage').then((m) => ({ default: m.InboxPage })));
const FinancePage = lazy(() => import('./features/finance/FinancePage').then((m) => ({ default: m.FinancePage })));
const NotFoundPage = lazy(() => import('./features/misc/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function Loading() {
  return <Spinner label="Carregando…" />;
}

export function App() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Público: a landing é sempre a home em "/" (mesmo logado). */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage />} />
        {/* Documentos legais (públicos). */}
        <Route path="/termos" element={<LegalPage doc="terms" />} />
        <Route path="/privacidade" element={<LegalPage doc="privacy" />} />
        <Route path="/termos-profissional" element={<LegalPage doc="provider-terms" />} />
        <Route path="/conduta" element={<LegalPage doc="conduct" />} />
        {/* Compat: quem tinha "/site" salvo cai na landing. */}
        <Route path="/site" element={<Navigate to="/" replace />} />

        {/* Área autenticada sob "/app". */}
        <Route
          path="/app/*"
          element={isAuthenticated ? <Authenticated /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {/* Portão de aceite dos Termos/Privacidade (bloqueia até aceitar). */}
      {isAuthenticated && <TermsGate />}
    </Suspense>
  );
}

function Authenticated() {
  const meQ = useMe();

  if (meQ.isLoading) {
    return <p className="p-6 text-center text-text-muted">Carregando…</p>;
  }
  if (meQ.isError) {
    return <p className="p-6 text-center text-danger">{(meQ.error as Error).message}</p>;
  }

  if (meQ.data?.providerStatus !== 'APPROVED') {
    return (
      <Suspense fallback={<Loading />}>
        <PendingApproval status={meQ.data?.providerStatus ?? null} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="negocios" element={<NegociosPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="area" element={<ServiceAreaPage />} />
          <Route path="eu" element={<EuPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="financeiro" element={<FinancePage />} />
          <Route path="orcamento/:quoteId" element={<QuoteDetailPage />} />
          <Route path="conversa/:conversationId" element={<ConversationPage />} />
          {/* Compat com links antigos */}
          <Route path="oportunidades" element={<Navigate to="/app/negocios" replace />} />
          <Route path="conversas" element={<Navigate to="/app/negocios" replace />} />
          <Route path="*" element={<NotFoundPage homeTo="/app" />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
