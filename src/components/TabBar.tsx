import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LuLayoutGrid } from 'react-icons/lu';
import { useNotifications } from '../lib/queries';
import { IconHome, IconBusiness, IconAgenda } from './icons';

/**
 * Navegação inferior do app Prestador (mobile): 🏠 Home · 💼 Trabalhos · 📅 Agenda
 * · ▦ Mais. "Mais" abre o hub com o restante (perfil, financeiro, área, suporte…).
 */
export function TabBar() {
  const q = useNotifications();
  const unread = q.data?.unreadCount ?? 0;
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-border bg-background/85 backdrop-blur-lg lg:hidden">
      <Tab to="/app" icon={<IconHome size={22} />} label="Home" />
      <Tab to="/app/negocios" icon={<IconBusiness size={22} />} label="Trabalhos" badge={unread} />
      <Tab to="/app/agenda" icon={<IconAgenda size={22} />} label="Agenda" />
      <Tab to="/app/eu" icon={<LuLayoutGrid size={22} />} label="Mais" />
    </nav>
  );
}

function Tab({ to, icon, label, badge }: { to: string; icon: ReactNode; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/app'}
      className={({ isActive }) =>
        `relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
          isActive ? 'font-semibold text-primary' : 'text-text-muted hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" aria-hidden />}
          {icon}
          <span>{label}</span>
          {badge != null && badge > 0 && (
            <span className="absolute right-[calc(50%-22px)] top-1 min-w-[16px] rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
