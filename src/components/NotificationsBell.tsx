import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../lib/queries';
import { useNotificationsRealtime } from '../lib/realtime';
import { notificationMeta } from '../lib/notificationMeta';
import { IconBell, IconChevronRight } from './icons';

export function NotificationsBell() {
  useNotificationsRealtime();
  const q = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unread = q.data?.unreadCount ?? 0;
  const items = q.data?.items ?? [];

  function relative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60_000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min}m`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24)}d`;
  }

  function onItemClick(n: { id: string; link: string | null; readAt: string | null }) {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end" offset={8} shouldFlip>
      <PopoverTrigger>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-content2 hover:text-foreground"
          aria-label="Notificações"
        >
          <Badge content={unread > 9 ? '9+' : unread} color="danger" size="sm" isInvisible={unread === 0} shape="circle">
            <IconBell size={20} />
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        {/* Largura fixa mas limitada à viewport; altura máxima ~70vh com rolagem interna. */}
        <div className="flex max-h-[70vh] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-sm font-semibold">Notificações</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs text-text-muted hover:text-foreground disabled:opacity-50"
              >
                Marcar todas
              </button>
            )}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">Nenhuma notificação ainda.</li>
            )}
            {items.map((n) => {
              const { icon, circleClass } = notificationMeta(n.kind, 15);
              return (
                <li
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={`flex cursor-pointer items-start gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-content2 ${
                    n.readAt ? '' : 'bg-primary/5'
                  }`}
                >
                  <span className={circleClass}>{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      <span className="shrink-0 text-[10px] text-text-muted">{relative(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{n.body}</p>}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/inbox');
            }}
            className="flex items-center justify-center gap-0.5 border-t border-border py-2.5 text-xs font-medium text-primary hover:bg-content2"
          >
            Ver todas as notificações <IconChevronRight size={13} />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
