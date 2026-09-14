import { Suspense } from 'react';
import { lazyPage } from './lib/lazyPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useMe } from './lib/queries';
import { Layout } from './components/Layout';
import { LegalPage } from './components/LegalPage';
import { LegalIndex } from './components/LegalIndex';
import { TermsGate } from './components/TermsGate';
import { Spinner } from './components/ui';

// Code-splitting: cada tela vira um chunk sob demanda (recharts fica isolado na Home).
const LandingPage = lazyPage(() => import('./features/landing/LandingPage'), 'LandingPage');
const LoginPage = lazyPage(() => import('./features/auth/LoginPage'), 'LoginPage');
const PendingApproval = lazyPage(() => import('./features/auth/PendingApproval'), 'PendingApproval');
const HomePage = lazyPage(() => import('./features/home/HomePage'), 'HomePage');
const NegociosPage = lazyPage(() => import('./features/negocios/NegociosPage'), 'NegociosPage');
const QuoteDetailPage = lazyPage(() => import('./features/quotes/QuoteDetailPage'), 'QuoteDetailPage');
const ConversationPage = lazyPage(() => import('./features/conversations/ConversationPage'), 'ConversationPage');
const ServiceAreaPage = lazyPage(() => import('./features/area/ServiceAreaPage'), 'ServiceAreaPage');
const AgendaPage = lazyPage(() => import('./features/agenda/AgendaPage'), 'AgendaPage');
const EuPage = lazyPage(() => import('./features/profile/EuPage'), 'EuPage');
const ProfilePage = lazyPage(() => import('./features/profile/ProfilePage'), 'ProfilePage');
const InboxPage = lazyPage(() => import('./features/inbox/InboxPage'), 'InboxPage');
const FinancePage = lazyPage(() => import('./features/finance/FinancePage'), 'FinancePage');
const NotFoundPage = lazyPage(() => import('./features/misc/NotFoundPage'), 'NotFoundPage');

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
        {/* Convite do admin (?token=...) — a LoginPage renderiza o formulário de convite. */}
        <Route path="/convite" element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage />} />
        {/* Documentos legais (públicos). */}
        <Route path="/legal" element={<LegalIndex />} />
        <Route path="/termos" element={<LegalPage doc="terms" />} />
        <Route path="/privacidade" element={<LegalPage doc="privacy" />} />
        <Route path="/termos-profissional" element={<LegalPage doc="provider-terms" />} />
        <Route path="/conduta" element={<LegalPage doc="conduct" />} />
        <Route path="/reembolso" element={<LegalPage doc="refund" />} />
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
