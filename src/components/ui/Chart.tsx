import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartPoint {
  label: string;
  value: number;
}

const AXIS = { stroke: '#8b94a7', fontSize: 10 };
const GRID = '#232a39';

function DarkTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-medium border border-border bg-content2 px-2.5 py-1.5 text-xs shadow-pop">
      <p className="text-text-muted">{label}</p>
      <p className="font-semibold text-foreground">{format(payload[0].value)}</p>
    </div>
  );
}

/** Gráfico de área (ex.: receita 30 dias). */
export function AreaTrend({
  data,
  color = '#3b82f6',
  format = (v) => String(v),
  height = 140,
}: {
  data: ChartPoint[];
  color?: string;
  format?: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} />
        <YAxis hide />
        <Tooltip content={<DarkTooltip format={format} />} cursor={{ stroke: GRID }} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#areaFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Gráfico de barras (ex.: serviços concluídos por mês). */
export function BarTrend({
  data,
  color = '#22c55e',
  format = (v) => String(v),
  height = 140,
}: {
  data: ChartPoint[];
  color?: string;
  format?: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip content={<DarkTooltip format={format} />} cursor={{ fill: '#ffffff08' }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
