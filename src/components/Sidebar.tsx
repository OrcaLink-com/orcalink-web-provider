import { NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { brand } from '@orcalink/design-tokens/brand.config';
import { useAuth } from '../auth/AuthContext';
import { NotificationsBell } from './NotificationsBell';
import { useNotifications, useProfile } from '../lib/queries';
import { Avatar } from './ui';
import { IconHome, IconBusiness, IconAgenda, IconArea, IconInbox, IconWallet, IconUser, IconLogout } from './icons';

const PROFILE_SUBS: { s: string; label: string }[] = [
  { s: 'dados', label: 'Dados pessoais' },
  { s: 'empresa', label: 'Empresa' },
  { s: 'endereco', label: 'Endereço' },
  { s: 'portfolio', label: 'Portfólio' },
  { s: 'seguranca', label: 'Segurança' },
];

/** Sidebar de navegação (desktop ≥lg). No mobile a navegação fica na bottom TabBar. */
export function Sidebar() {
  const { user, logout } = useAuth();
  const notif = useNotifications();
  const profile = useProfile();
  const unread = notif.data?.unreadCount ?? 0;

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background px-3 py-5 lg:flex">
      <div className="flex items-center justify-between px-2">
        <Link to="/app" className="flex items-center gap-1.5" aria-label={`${brand.name} Pro`}>
          <img src="/brand/logo.svg" alt={brand.name} className="h-10 w-auto" />
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Pro</span>
        </Link>
        <NotificationsBell />
      </div>

      <nav className="mt-6 space-y-1">
        <Item to="/app" icon={<IconHome size={20} />} label="Home" end />
        <Item to="/app/negocios" icon={<IconBusiness size={20} />} label="Trabalhos" />
        <Item to="/app/agenda" icon={<IconAgenda size={20} />} label="Agenda" />
        <Item to="/app/inbox" icon={<IconInbox size={20} />} label="Notificações" badge={unread} />
        <Item to="/app/financeiro" icon={<IconWallet size={20} />} label="Financeiro" />
        <Item to="/app/area" icon={<IconArea size={20} />} label="Área de atendimento" />
        <ProfileGroup />
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user?.name ?? '?'} src={profile.data?.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{user?.name ?? 'Você'}</span>
          <button onClick={() => void logout()} aria-label="Sair" className="text-text-muted hover:text-danger">
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** "Meu perfil" como grupo colapsável, com as seções do perfil (?s=…). */
function ProfileGroup() {
  const loc = useLocation();
  const onProfile = loc.pathname.startsWith('/app/perfil');
  const [open, setOpen] = useState(onProfile);
  useEffect(() => {
    if (onProfile) setOpen(true);
  }, [onProfile]);
  const current = new URLSearchParams(loc.search).get('s') ?? 'dados';

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-medium px-3 py-2.5 text-sm font-medium transition-colors ${
          onProfile ? 'text-foreground' : 'text-text-muted hover:bg-content2 hover:text-foreground'
        }`}
      >
        <IconUser size={20} />
        <span className="flex-1 text-left">Meu perfil</span>
        <LuChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {PROFILE_SUBS.map((sub) => {
            const isActive = onProfile && current === sub.s;
            return (
              <Link
                key={sub.s}
                to={`/app/perfil?s=${sub.s}`}
                className={`block rounded-medium px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-primary/15 font-medium text-primary' : 'text-text-muted hover:bg-content2 hover:text-foreground'
                }`}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
