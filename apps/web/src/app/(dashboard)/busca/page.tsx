import { parseSearchFilters } from "@/lib/search";
import { ConsignadosBoard } from "@/components/search/consignados-board";

export default function ConsignadosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const filters = parseSearchFilters(searchParams);
  return <ConsignadosBoard filters={filters} />;
}
