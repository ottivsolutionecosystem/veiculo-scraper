"use client";

import { LayoutGrid, List, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RequestsToolbar({
  query,
  view,
  mobile,
  onQueryChange,
  onViewChange,
}: {
  query: string;
  view: "kanban" | "lista";
  mobile: boolean;
  onQueryChange: (value: string) => void;
  onViewChange: (value: string) => void;
}) {
  return (
    <>
      {!mobile && (
        <div className="flex justify-end">
          <Tabs value={view} onValueChange={onViewChange}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="lista" className="gap-1.5">
                <List className="h-3.5 w-3.5" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar #número, marca, modelo, ano, estágio ou responsável"
          className="pl-9"
        />
      </div>
    </>
  );
}
