import { AuttusWordmark } from "@/components/brand/auttus-mark";

const BEATS = ["Fila do dia", "Kanban no nome", "Estoque que entra"];

export function EntrarHero() {
  return (
    <aside className="relative hidden flex-col justify-between px-12 py-14 lg:flex xl:px-16">
      <AuttusWordmark onDark />
      <div className="max-w-lg space-y-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-coral">
          Auttus · consignação
        </p>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl">
          O carro certo
          <span className="block bg-gradient-to-r from-coral to-orange bg-clip-text text-transparent">
            no nome certo.
          </span>
        </h1>
        <p className="max-w-md text-base leading-relaxed text-white/55">
          Fila, kanban e estoque no mesmo lugar. Quem entra, trabalha no próprio nome.
        </p>
        <ul className="flex flex-wrap gap-2 pt-2">
          {BEATS.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs tracking-wide text-white/30">Consignação inteligente · uso interno</p>
    </aside>
  );
}
