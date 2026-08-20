"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function WorkScopeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setScope(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={searchParams.get("scope") ?? "untouched"} onValueChange={setScope}>
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="untouched">Ainda não ligamos</SelectItem>
        <SelectItem value="followup">Follow-up vencido</SelectItem>
        <SelectItem value="mine">Meus</SelectItem>
        <SelectItem value="price_drop">Caiu depois do contato</SelectItem>
        <SelectItem value="all">Todos no ar</SelectItem>
      </SelectContent>
    </Select>
  );
}
