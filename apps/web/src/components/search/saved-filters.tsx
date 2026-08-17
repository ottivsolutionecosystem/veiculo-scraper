"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SavedFilter {
  name: string;
  query: string;
}

const STORAGE_KEY = "veiculo-scraper:filtros-salvos";

export function SavedFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saved, setSaved] = React.useState<SavedFilter[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      // localStorage indisponível (ex: modo privado) — segue sem filtros salvos
    }
  }, []);

  function persist(next: SavedFilter[]) {
    setSaved(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function save() {
    const name = window.prompt("Nome do filtro salvo:");
    if (!name) return;
    const query = searchParams.toString();
    persist([...saved.filter((f) => f.name !== name), { name, query }]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={save}>
        <Save /> Salvar filtro
      </Button>
      {saved.map((filter) => (
        <Badge
          key={filter.name}
          variant="outline"
          className="cursor-pointer gap-1"
          onClick={() => router.push(`${pathname}?${filter.query}`)}
        >
          <Bookmark className="h-3 w-3" />
          {filter.name}
        </Badge>
      ))}
    </div>
  );
}
