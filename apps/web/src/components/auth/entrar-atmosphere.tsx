/** Luz e marca atrás do login — sem tocar no formulário. */
export function EntrarAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,hsl(var(--navy)/0.2),transparent_55%),radial-gradient(90%_70%_at_100%_100%,#061018,transparent_50%)]" />
      <div
        className="absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-full opacity-70 blur-3xl motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--orange) / 0.38), transparent 68%)",
          animation: "entrar-drift 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-20 top-1/4 h-[22rem] w-[22rem] rounded-full opacity-60 blur-3xl motion-reduce:animate-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--coral) / 0.28), transparent 70%)",
          animation: "entrar-drift-alt 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-8rem] left-1/3 h-[20rem] w-[36rem] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--navy) / 0.9), transparent 70%)" }}
      />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(hsl(var(--coral)/0.35)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--coral)/0.35)_1px,transparent_1px)] [background-size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local */}
      <img
        src="/brand/logo-mark.png"
        alt=""
        className="absolute -right-8 bottom-[-3rem] hidden h-[28rem] w-[28rem] object-contain opacity-[0.07] lg:block"
      />
    </div>
  );
}
