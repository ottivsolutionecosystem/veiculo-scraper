"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function SellerTypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSellerType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("sellerType");
    else params.set("sellerType", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={searchParams.get("sellerType") ?? "all"} onValueChange={setSellerType}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Particular e loja</SelectItem>
        <SelectItem value="individual">Só particular</SelectItem>
        <SelectItem value="dealer">Só loja</SelectItem>
      </SelectContent>
    </Select>
  );
}
