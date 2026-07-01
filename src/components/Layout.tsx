import { Link, Outlet, useLocation } from 'react-router-dom';
import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import { TabBar } from './TabBar';
import { Sidebar } from './Sidebar';
import { Avatar } from './ui';

export function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const focusedFlow = pathname.includes('/conversa/');

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {!focusedFlow && (
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur-lg lg:hidden">
            <Link to="/" className="flex items-baseline gap-1.5 text-lg font-bold text-primary">
              {brand.name}
              <span className="text-xs font-normal text-text-muted">Pro</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <NotificationsBell />
              <Link to="/eu" aria-label="Sua conta">
                <Avatar name={user?.name ?? '?'} size="sm" />
              </Link>
            </div>
          </header>
        )}

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>

        {!focusedFlow && <TabBar />}
      </div>
    </div>
  );
}
