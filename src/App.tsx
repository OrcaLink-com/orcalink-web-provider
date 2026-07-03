import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useMe } from './lib/queries';
import { Layout } from './components/Layout';
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
const SchedulePage = lazy(() => import('./features/agenda/SchedulePage').then((m) => ({ default: m.SchedulePage })));
const EuPage = lazy(() => import('./features/profile/EuPage').then((m) => ({ default: m.EuPage })));
const InboxPage = lazy(() => import('./features/inbox/InboxPage').then((m) => ({ default: m.InboxPage })));

function Loading() {
  return <Spinner label="Carregando…" />;
}

export function App() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }
  return <Authenticated />;
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
          <Route path="agenda" element={<SchedulePage />} />
          <Route path="area" element={<ServiceAreaPage />} />
          <Route path="eu" element={<EuPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="orcamento/:quoteId" element={<QuoteDetailPage />} />
          <Route path="conversa/:conversationId" element={<ConversationPage />} />
          {/* Compat com links antigos */}
          <Route path="oportunidades" element={<Navigate to="/negocios" replace />} />
          <Route path="conversas" element={<Navigate to="/negocios" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
