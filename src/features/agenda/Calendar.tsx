import { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import type { ProviderVisit, VisitStatus } from '../../lib/types';

export type CalendarView = 'month' | 'week' | 'day';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Cores por status da visita (chip + bloco no grid). */
export const VISIT_COLOR: Record<VisitStatus, { dot: string; block: string; text: string }> = {
  CONFIRMED: { dot: 'bg-emerald-400', block: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-200' },
  SUGGESTED: { dot: 'bg-sky-400', block: 'bg-sky-500/20 border-sky-500/40', text: 'text-sky-200' },
  RESCHEDULED: { dot: 'bg-amber-400', block: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-200' },
  COMPLETED: { dot: 'bg-primary', block: 'bg-primary/20 border-primary/40', text: 'text-primary' },
  PENDING: { dot: 'bg-zinc-400', block: 'bg-content2 border-border', text: 'text-text-muted' },
  CANCELED: { dot: 'bg-danger', block: 'bg-danger/15 border-danger/40 line-through', text: 'text-danger' },
};

const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_PX = 46;

interface CalEvent {
  visit: ProviderVisit;
  start: Date;
  end: Date;
}

function toEvents(visits: ProviderVisit[]): CalEvent[] {
  return visits
    .filter((v) => v.scheduledAt && v.status !== 'CANCELED')
    .map((v) => {
      const start = new Date(v.scheduledAt as string);
      const end = v.endsAt ? new Date(v.endsAt) : new Date(start.getTime() + 60 * 60_000);
      return { visit: v, start, end };
    });
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export function Calendar({
  visits,
  onSelect,
}: {
  visits: ProviderVisit[];
  onSelect?: (v: ProviderVisit) => void;
}) {
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const events = useMemo(() => toEvents(visits), [visits]);

  function move(dir: -1 | 1) {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  }

  const label =
    view === 'month'
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === 'day'
        ? cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
        : (() => {
            const s = startOfWeek(cursor);
            const e = addDays(s, 6);
            return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}`;
          })();

  return (
    <div className="rounded-large border border-border bg-content1 shadow-card">
      {/* Cabeçalho: navegação + views */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="rounded-medium p-1.5 text-text-muted hover:bg-content2" aria-label="Anterior">
            <LuChevronLeft size={18} />
          </button>
          <button onClick={() => setCursor(new Date())} className="rounded-medium border border-border px-2.5 py-1 text-xs font-medium hover:bg-content2">
            Hoje
          </button>
          <button onClick={() => move(1)} className="rounded-medium p-1.5 text-text-muted hover:bg-content2" aria-label="Próximo">
            <LuChevronRight size={18} />
          </button>
          <span className="ml-2 text-sm font-semibold capitalize">{label}</span>
        </div>
        <div className="flex rounded-medium border border-border p-0.5 text-xs">
          {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                view === v ? 'bg-primary text-white' : 'text-text-muted hover:text-foreground'
              }`}
            >
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && <MonthGrid cursor={cursor} events={events} onSelect={onSelect} />}
      {view === 'week' && <TimeGrid days={weekDays(cursor)} events={events} onSelect={onSelect} />}
      {view === 'day' && <TimeGrid days={[new Date(cursor)]} events={events} onSelect={onSelect} />}
    </div>
  );
}

function weekDays(cursor: Date): Date[] {
  const s = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

/* ───────── Mês ───────── */
function MonthGrid({ cursor, events, onSelect }: { cursor: Date; events: CalEvent[]; onSelect?: (v: ProviderVisit) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-semibold uppercase text-text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const dayEvents = events.filter((e) => sameDay(e.start, day)).sort((a, b) => a.start.getTime() - b.start.getTime());
          const isToday = sameDay(day, today);
          return (
            <div
              key={i}
              className={`min-h-[92px] border-b border-r border-border p-1 ${i % 7 === 0 ? 'border-l' : ''} ${
                inMonth ? '' : 'bg-background/40 text-text-muted'
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? 'bg-primary font-bold text-white' : 'text-text-muted'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const c = VISIT_COLOR[e.visit.status];
                  return (
                    <button
                      key={e.visit.id}
                      onClick={() => onSelect?.(e.visit)}
                      className={`flex w-full items-center gap-1 truncate rounded border px-1 py-0.5 text-left text-[10px] ${c.block} ${c.text}`}
                    >
                      <span className="shrink-0 font-semibold">{hhmm(e.start)}</span>
                      <span className="truncate">{e.visit.clientName}</span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-text-muted">+{dayEvents.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Semana / Dia (grade de horas) ───────── */
function TimeGrid({ days, events, onSelect }: { days: Date[]; events: CalEvent[]; onSelect?: (v: ProviderVisit) => void }) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Cabeçalho dos dias */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            return (
              <div key={i} className="border-l border-border py-1.5 text-center">
                <p className="text-[11px] uppercase text-text-muted">{WEEKDAYS[d.getDay()]}</p>
                <p className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>
        {/* Grade */}
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}>
          {/* Coluna de horas */}
          <div>
            {hours.map((h) => (
              <div key={h} className="relative border-b border-border text-right" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 right-1 text-[10px] text-text-muted">{h}h</span>
              </div>
            ))}
          </div>
          {/* Colunas dos dias */}
          {days.map((day, di) => {
            const dayEvents = events.filter((e) => sameDay(e.start, day));
            return (
              <div key={di} className="relative border-l border-border">
                {hours.map((h) => (
                  <div key={h} className="border-b border-border" style={{ height: HOUR_PX }} />
                ))}
                {dayEvents.map((e) => {
                  const startMin = (e.start.getHours() - HOUR_START) * 60 + e.start.getMinutes();
                  const durMin = Math.max(30, (e.end.getTime() - e.start.getTime()) / 60000);
                  const top = (startMin / 60) * HOUR_PX;
                  const height = Math.min((durMin / 60) * HOUR_PX, (HOUR_END - HOUR_START) * HOUR_PX - top);
                  const c = VISIT_COLOR[e.visit.status];
                  if (top < 0) return null;
                  return (
                    <button
                      key={e.visit.id}
                      onClick={() => onSelect?.(e.visit)}
                      style={{ top, height: Math.max(height, 22) }}
                      className={`absolute inset-x-1 overflow-hidden rounded border px-1.5 py-0.5 text-left text-[11px] ${c.block} ${c.text}`}
                    >
                      <span className="block font-semibold leading-tight">{hhmm(e.start)}</span>
                      <span className="block truncate">{e.visit.clientName}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
