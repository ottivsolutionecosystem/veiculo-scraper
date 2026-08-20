import { redirect } from "next/navigation";

/** O discador deixou de ser aba irmã: é o modo “ainda não ligamos” da fila. */
export default function DiscadorPage() {
  redirect("/?scope=untouched");
}
