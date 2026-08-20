"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpsFunnelStage, OpsReasonSlice } from "@veiculo/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ORANGE = "hsl(22 100% 50%)";
const NAVY = "hsl(215 61% 15%)";
const PIE = [ORANGE, NAVY, "hsl(0 72% 51%)", "hsl(142 65% 38%)", "hsl(215 16% 55%)", "hsl(40 90% 45%)"];

export function OpsReasons({ slices }: { slices: OpsReasonSlice[] }) {
  const total = slices.reduce((s, x) => s + x.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Por que devolveu</CardTitle>
        <p className="text-xs text-muted-foreground">Motivo no parecer, no período.</p>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma devolução no período.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slices} dataKey="count" nameKey="reason" innerRadius={38} outerRadius={64} paddingAngle={2}>
                    {slices.map((s, i) => (
                      <Cell key={s.reason} fill={PIE[i % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
              {slices.map((s, i) => (
                <li key={s.reason} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                    <span className="truncate">{s.reason}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.count} ({total ? Math.round((s.count / total) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OpsKanbanBars({ stages }: { stages: OpsFunnelStage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kanban agora</CardTitle>
        <p className="text-xs text-muted-foreground">Proposta e Agendado abertos; Estoque é o saldo acquired.</p>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 12% 88%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Bar dataKey="count" name="Qtd" fill={NAVY} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function OpsBrands({ slices }: { slices: OpsReasonSlice[] }) {
  const max = Math.max(...slices.map((s) => s.count), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estoque por marca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {slices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Estoque vazio.</p>
        ) : (
          slices.map((s) => (
            <div key={s.reason}>
              <div className="mb-0.5 flex justify-between text-sm">
                <span>{s.reason}</span>
                <span className="tabular-nums text-muted-foreground">{s.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-navy" style={{ width: `${(s.count / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
