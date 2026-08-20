"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpsDailyPoint, OpsFunnelStage } from "@veiculo/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ORANGE = "hsl(22 100% 50%)";
const RED = "hsl(0 72% 51%)";

function dayLabel(day: string): string {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

export function OpsDailyChart({ daily }: { daily: OpsDailyPoint[] }) {
  const data = daily.map((p) => ({ ...p, label: dayLabel(p.day) }));
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Consignou × devolveu</CardTitle>
        <p className="text-xs text-muted-foreground">Por dia em Brasília. Dias sem evento entram como zero.</p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 12% 88%)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Area type="monotone" dataKey="consigned" name="Consignou" stroke={ORANGE} fill={ORANGE} fillOpacity={0.25} />
              <Area type="monotone" dataKey="returned" name="Devolveu" stroke={RED} fill={RED} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function OpsFunnel({ funnel }: { funnel: OpsFunnelStage[] }) {
  const max = Math.max(...funnel.map((s) => s.count), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil agora</CardTitle>
        <p className="text-xs text-muted-foreground">Saldo atual, não é do período.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {funnel.map((stage) => (
          <div key={stage.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{stage.label}</span>
              <span className="font-semibold tabular-nums">{stage.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(stage.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
