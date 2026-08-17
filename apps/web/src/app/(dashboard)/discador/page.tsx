import { getDialerQueue } from "@/lib/api";
import { DialerView } from "@/components/dialer/dialer-view";

export default async function DiscadorPage() {
  const page = await getDialerQueue({ limit: 40 });

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">Discador</h1>
      <DialerView initial={page} />
    </div>
  );
}
