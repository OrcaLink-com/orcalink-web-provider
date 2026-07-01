import { NavLink, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import { Avatar } from './ui';
import { IconHome, IconBusiness, IconAgenda, IconUser, IconLogout } from './icons';

/** Sidebar de navegação (desktop ≥lg). No mobile a navegação fica na bottom TabBar. */
export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background px-3 py-5 lg:flex">
      <div className="flex items-center justify-between px-2">
        <Link to="/" className="flex items-baseline gap-1.5 text-xl font-bold tracking-tight text-primary">
          {brand.name}
          <span className="text-xs font-normal text-text-muted">Pro</span>
        </Link>
        <NotificationsBell />
      </div>

      <nav className="mt-6 space-y-1">
        <Item to="/" icon={<IconHome size={20} />} label="Home" end />
        <Item to="/negocios" icon={<IconBusiness size={20} />} label="Negócios" />
        <Item to="/agenda" icon={<IconAgenda size={20} />} label="Agenda" />
        <Item to="/eu" icon={<IconUser size={20} />} label="Eu" />
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user?.name ?? '?'} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{user?.name ?? 'Você'}</span>
          <button onClick={() => void logout()} aria-label="Sair" className="text-text-muted hover:text-danger">
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Item({ to, icon, label, end }: { to: string; icon: ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-content2 hover:text-foreground'
        }`
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
    </NavLink>
  );
}
