import type { Settings } from "@veiculo/types";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export function CurveTemplateTab({ settings }: { settings: Settings }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Curva de km por ano (referência)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano modelo</TableHead>
                <TableHead>Km média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.kmCurve.map((point) => (
                <TableRow key={point.modelYear}>
                  <TableCell>{point.modelYear}</TableCell>
                  <TableCell>{point.averageKm.toLocaleString("pt-BR")} km</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template de WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea defaultValue={settings.whatsappTemplate} rows={6} />
          <p className="text-xs text-muted-foreground">
            Variáveis disponíveis: <code>{"{{modelo}}"}</code> <code>{"{{ano}}"}</code>{" "}
            <code>{"{{preco}}"}</code> <code>{"{{desconto_fipe}}"}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
