"use client";

import { TeamForm } from "@/components/equipe/team-form";

export default function EquipePage() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        Só você autoriza quem entra. Cadastre o consignador e, se precisar, desligue o acesso.
      </p>
      <TeamForm />
    </div>
  );
}
