import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCreateScheduleBlock,
  useDeleteScheduleBlock,
  useSchedule,
  useScheduleBlocks,
  useSetSchedule,
} from '../../lib/queries';

function BlocksSection() {
  const blocksQ = useScheduleBlocks();
  const create = useCreateScheduleBlock();
  const del = useDeleteScheduleBlock();
  const today = new Date().toISOString().slice(0, 10);
  const [startsAt, setStartsAt] = useState(today);
  const [endsAt, setEndsAt] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function fmt(iso: string): string {
    const d = new Date(iso);
    const tz = 'America/Sao_Paulo';
    return (
      d.toLocaleDateString('pt-BR', { timeZone: tz }) +
      ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
    );
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Datas em horário LOCAL: "YYYY-MM-DD" → início 00:00 / fim 23:59:59 do dia.
    const start = new Date(startsAt + 'T00:00:00');
    const end = new Date(endsAt + 'T23:59:59');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Datas inválidas.');
      return;
    }
    if (end <= start) {
      setError('O fim do bloqueio precisa ser depois do início.');
      return;
    }
    try {
      await create.mutateAsync({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        note: note.trim() || undefined,
      });
      setNote('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-border p-4">
      <h2 className="text-base font-semibold">Bloqueios / férias</h2>
      <p className="text-xs text-text-muted">
        Períodos em que você não recebe visitas (mesmo dentro do expediente).
      </p>

      {blocksQ.isLoading && <p className="text-xs text-text-muted">Carregando…</p>}
      {blocksQ.data && blocksQ.data.length === 0 && (
        <p className="text-xs text-text-muted">Nenhum bloqueio ativo.</p>
      )}
      <ul className="space-y-1">
        {blocksQ.data?.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          >
            <span>
              {fmt(b.startsAt)} → {fmt(b.endsAt)}
              {b.note ? ` · ${b.note}` : ''}
            </span>
            <button
              type="button"
              onClick={() => del.mutate(b.id)}
              disabled={del.isPending}
              className="rounded-md border border-border px-2 py-0.5 text-text-muted hover:bg-bg"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="mt-2 space-y-2 border-t border-border pt-2">
        <p className="text-xs font-medium text-text-muted">Adicionar bloqueio</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          />
          <span className="text-text-muted">→</span>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo (opcional)"
            className="flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {create.isError && <p className="text-xs text-danger">{(create.error as Error).message}</p>}
      </form>
    </section>
  );
}

const DAYS: Array<{ code: string; label: string }> = [
  { code: 'SUN', label: 'Dom' },
  { code: 'MON', label: 'Seg' },
  { code: 'TUE', label: 'Ter' },
  { code: 'WED', label: 'Qua' },
  { code: 'THU', label: 'Qui' },
  { code: 'FRI', label: 'Sex' },
  { code: 'SAT', label: 'Sáb' },
];

export function SchedulePage() {
  const q = useSchedule();
  const save = useSetSchedule();
  const [days, setDays] = useState<string[]>([]);
  const [start, setStart] = useState(8);
  const [end, setEnd] = useState(18);
  const [limit, setLimit] = useState(4);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setDays(q.data.workingDays);
    setStart(q.data.workingHourStart);
    setEnd(q.data.workingHourEnd);
    setLimit(q.data.maxVisitsPerDay);
  }, [q.data]);

  function toggleDay(code: string) {
    setDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (days.length === 0) {
      setError('Escolha pelo menos um dia da semana.');
      return;
    }
    if (end <= start) {
      setError('O fim do expediente precisa ser depois do início.');
      return;
    }
    try {
      await save.mutateAsync({
        workingDays: days,
        workingHourStart: start,
        workingHourEnd: end,
        maxVisitsPerDay: limit,
      });
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (q.isLoading) return <p className="text-text-muted">Carregando…</p>;

  return (
    <div className="space-y-3">
      <Link to="/" className="text-sm text-text-muted underline">
        ← Início
      </Link>
      <h1 className="text-xl font-semibold">Disponibilidade</h1>
      <p className="text-sm text-text-muted">
        Quando você atende. Visitas só podem ser agendadas dentro dessa janela
        (doc 10).
      </p>

      <BlocksSection />

      <form onSubmit={onSave} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Dias da semana</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => toggleDay(d.code)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  days.includes(d.code)
                    ? 'border-brand bg-card font-medium text-brand'
                    : 'border-border'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Início</label>
            <input
              type="number"
              min={0}
              max={23}
              value={start}
              onChange={(e) => setStart(Math.max(0, Math.min(23, Number(e.target.value))))}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fim (exclusivo)</label>
            <input
              type="number"
              min={1}
              max={24}
              value={end}
              onChange={(e) => setEnd(Math.max(1, Math.min(24, Number(e.target.value))))}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
            />
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Ex.: 8 → 18 = expediente 08:00 às 17:59.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium">Visitas por dia</label>
          <input
            type="number"
            min={1}
            max={20}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-24 rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && !save.isPending && (
          <p className="text-sm text-status-finished">✓ Disponibilidade salva.</p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="w-full rounded-md bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {save.isPending ? 'Salvando…' : 'Salvar disponibilidade'}
        </button>
      </form>
    </div>
  );
}
