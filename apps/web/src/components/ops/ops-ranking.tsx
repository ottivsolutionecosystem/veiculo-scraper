"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpsOperatorRow } from "@veiculo/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatHours, formatRate } from "@/lib/ops-format";
import { cn } from "@/lib/utils";

export function OpsRanking({
  ranking,
  selectedId,
  onSelect,
}: {
  ranking: OpsOperatorRow[];
  selectedId?: number;
  onSelect: (operatorId: number | undefined) => void;
}) {
  const bars = ranking
    .filter((r) => r.consigned > 0 || r.claims > 0)
    .slice(0, 8)
    .map((r) => ({ name: r.name.split(" ")[0] ?? r.login, consigned: r.consigned, claims: r.claims }));

  function toggle(operatorId: number) {
    onSelect(selectedId === operatorId ? undefined : operatorId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking cobrável</CardTitle>
        <p className="text-xs text-muted-foreground">
          Toque no nome para filtrar o dashboard. De novo no mesmo nome limpa o filtro.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {bars.length > 0 && (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 12% 88%)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="consigned" name="Consignou" fill="hsl(22 100% 50%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="claims" name="Assumiu" fill="hsl(215 61% 15%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="space-y-2 md:hidden">
          {ranking.map((row) => (
            <button
              key={row.operatorId}
              type="button"
              className={cn(
                "w-full rounded-lg border p-3 text-left",
                selectedId === row.operatorId && "border-primary bg-accent",
              )}
              onClick={() => toggle(row.operatorId)}
            >
              <p className="font-medium">
                {row.name}
                {!row.active && <span className="ml-2 text-xs text-muted-foreground">inativo</span>}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Assumiu</dt>
                  <dd className="tabular-nums text-foreground">{row.claims}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Abertos</dt>
                  <dd className="tabular-nums text-foreground">{row.open}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Vencidos</dt>
                  <dd className={cn("tabular-nums", row.overdue > 0 && "font-semibold text-destructive")}>{row.overdue}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Consignou</dt>
                  <dd className="tabular-nums font-medium text-foreground">{row.consigned}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Devolveu</dt>
                  <dd className="tabular-nums text-foreground">{row.returned}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Conversão</dt>
                  <dd className="tabular-nums text-foreground">{formatRate(row.conversion)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Até o parecer</dt>
                  <dd className="tabular-nums text-foreground">{formatHours(row.avgHoursToParecer)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Visitas</dt>
                  <dd className="tabular-nums text-foreground">{row.visits}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consignador</TableHead>
                <TableHead className="text-right">Assumiu</TableHead>
                <TableHead className="text-right">Abertos</TableHead>
                <TableHead className="text-right">Vencidos</TableHead>
                <TableHead className="text-right">Consignou</TableHead>
                <TableHead className="text-right">Devolveu</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Até o parecer</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((row) => (
                <TableRow
                  key={row.operatorId}
                  className={cn("cursor-pointer", selectedId === row.operatorId && "bg-accent")}
                  onClick={() => toggle(row.operatorId)}
                >
                  <TableCell className="font-medium">
                    {row.name}
                    {!row.active && <span className="ml-2 text-xs text-muted-foreground">inativo</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.claims}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", row.overdue > 0 && "font-semibold text-destructive")}>
                    {row.overdue}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.consigned}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.returned}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRate(row.conversion)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatHours(row.avgHoursToParecer)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.visits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
