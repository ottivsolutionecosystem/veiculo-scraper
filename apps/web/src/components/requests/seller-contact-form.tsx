"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, putVehicleSeller } from "@/lib/api";

/**
 * Nome e telefone que o consignador descobriu falando com o vendedor. O campo
 * de telefone nasce vazio de propósito: o número que já está cadastrado fica
 * mascarado, e revelar é uma ação separada e auditada.
 */
export function SellerContactForm({
  vehicleId,
  currentName,
  hasPhone,
  onSaved,
}: {
  vehicleId: number;
  currentName: string | null;
  hasPhone: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(currentName ?? "");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setName(currentName ?? "");
    setPhone("");
    setError(null);
    setSaved(false);
    // currentName fora das deps: salvar recarrega a tratativa e o nome novo
    // voltaria por aqui, apagando o aviso de "contato salvo".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  async function salvar() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await putVehicleSeller(vehicleId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      setPhone("");
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não salvou o contato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-navy/[0.08] p-3">
      <p className="text-sm font-medium">Vendedor</p>

      <div className="space-y-1">
        <Label htmlFor="seller-name">Nome</Label>
        <Input
          id="seller-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Quem atende o telefone"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="seller-phone">Telefone</Label>
        <Input
          id="seller-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-8888"
        />
        <p className="text-xs text-muted-foreground">
          {hasPhone
            ? "Já tem telefone cadastrado. Preencha só para corrigir."
            : "Sem telefone não dá para ligar nem mandar mensagem."}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-boa">Contato salvo.</p>}

      <Button size="sm" variant="secondary" disabled={saving || !name.trim()} onClick={() => void salvar()}>
        {saving && <Loader2 className="animate-spin" />}
        Salvar contato
      </Button>
    </div>
  );
}
