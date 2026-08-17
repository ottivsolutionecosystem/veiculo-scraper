import { VEHICLES } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { DialerView } from "@/components/dialer/dialer-view";

export default async function DiscadorPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Discador");
  if (demo === "loading") await delay(900);

  const queue =
    demo === "empty"
      ? []
      : VEHICLES.filter((v) => ["new", "interested"].includes(v.state) && v.sellerId).sort(
          (a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0),
        );

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">Discador</h1>
      <DialerView vehicles={queue} />
    </div>
  );
}
