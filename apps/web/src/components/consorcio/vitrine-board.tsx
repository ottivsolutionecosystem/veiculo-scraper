"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Store } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError } from "@/lib/api";
import { formatCents } from "@/lib/format";
import { addConsorcioProposal, listConsorcioOffers } from "@/lib/consorcio/api";
import { OFFER_STATUS_LABEL } from "@/lib/consorcio/labels";

export function VitrineBoard() {
  const [items, setItems] = React.useState<ConsorcioOffer[] | null>(null);
  const [active, setActive] = React.useState<ConsorcioOffer | null>(null);
  const [dealer, setDealer] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function reload() {
    const res = await listConsorcioOffers();
    setItems(res.items.filter((o) => o.status === "listed" || o.status === "proposed"));
  }

  React.useEffect(() => {
    let cancelled = false;
    void reload()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof ApiError ? err.message : "Não carregou a vitrine.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitProposal() {
    if (!active) return;
    const cents = Number.parseInt(amount.replace(/\D/g, "") || "0", 10) * 100;
    if (!cents) {
      setMsg("Informe o valor da proposta.");
      return;
    }
    try {
      await addConsorcioProposal(active.id, {
        dealerName: dealer,
        amountCents: cents,
        notes,
      });
      await reload();
      setActive(null);
      setDealer("");
      setAmount("");
      setNotes("");
      setMsg("Proposta registrada.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Não registrou a proposta.");
    }
  }

  if (!items) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">Vitrine do lojista</h2>
          <p className="text-sm text-muted-foreground">
            Veículos liberados para proposta.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/consorcio/oferecimentos">Oferecimentos</Link>
        </Button>
      </div>

      {msg && <p className="text-sm text-navy">{msg}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Vitrine vazia"
          description="Quando a avaliação estiver completa, use “Liberar na vitrine”."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((o) => {
            const thumb =
              o.photos.find((p) => p.slot === "front")?.url ??
              o.photos.find((p) => p.slot !== "damage")?.url;
            return (
              <Card key={o.id} className="overflow-hidden">
                <div className="aspect-[16/10] bg-navy/[0.04]">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-mono">{o.plate}</CardTitle>
                    <Badge variant="outline">{OFFER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {o.fipe ? `${o.fipe.brand} ${o.fipe.model} ${o.fipe.modelYear}` : "—"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Lance: {formatCents(o.bidCents)}</p>
                  <p>
                    {o.financed
                      ? `Quitação: ${formatCents(o.payoffCents)}`
                      : "Sem financiamento"}
                  </p>
                  <p>FIPE: {formatCents(o.fipe?.priceCents ?? null)}</p>
                  <p className="text-xs text-muted-foreground">{o.proposals.length} proposta(s)</p>
                  <Button type="button" size="sm" className="w-full" onClick={() => setActive(o)}>
                    Fazer proposta
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposta — {active?.plate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Lojista</Label>
              <Input value={dealer} onChange={(e) => setDealer(e.target.value)} placeholder="Nome da loja" />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="42000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <Button type="button" onClick={() => void submitProposal()}>
              Enviar proposta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
