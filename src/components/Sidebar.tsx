import { NavLink, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import { useNotifications } from '../lib/queries';
import { Avatar } from './ui';
import { IconHome, IconBusiness, IconAgenda, IconInbox, IconWallet, IconUser, IconLogout } from './icons';

/** Sidebar de navegação (desktop ≥lg). No mobile a navegação fica na bottom TabBar. */
export function Sidebar() {
  const { user, logout } = useAuth();
  const notif = useNotifications();
  const unread = notif.data?.unreadCount ?? 0;

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background px-3 py-5 lg:flex">
      <div className="flex items-center justify-between px-2">
        <Link to="/" className="flex items-center gap-1.5" aria-label={`${brand.name} Pro`}>
          <img src="/brand/logo.svg" alt={brand.name} className="h-10 w-auto" />
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Pro</span>
        </Link>
        <NotificationsBell />
      </div>

      <nav className="mt-6 space-y-1">
        <Item to="/" icon={<IconHome size={20} />} label="Home" end />
        <Item to="/negocios" icon={<IconBusiness size={20} />} label="Trabalhos" />
        <Item to="/inbox" icon={<IconInbox size={20} />} label="Notificações" badge={unread} />
        <Item to="/financeiro" icon={<IconWallet size={20} />} label="Financeiro" />
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

function Item({
  to,
  icon,
  label,
  end,
  badge,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  badge?: number;
}) {
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
      {badge != null && badge > 0 && (
        <span className="min-w-[18px] rounded-full bg-danger px-1.5 text-center text-[10px] font-bold leading-[18px] text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  );
}
