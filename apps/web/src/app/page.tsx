import type { Vehicle } from "@veiculo/types";

export default function Home() {
  const example: Vehicle["state"] = "new";
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Captação de Veículos</h1>
      <p>estado de exemplo: {example}</p>
    </main>
  );
}
