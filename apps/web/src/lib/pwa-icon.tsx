/** Ícone da Auttus para PWA / favicon — markup do ImageResponse. */
export function AuttusPwaGlyph({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ff6b6b 0%, #ff6a00 100%)",
        color: "white",
        fontSize: Math.round(size * 0.52),
        fontWeight: 800,
        letterSpacing: "-0.04em",
      }}
    >
      A
    </div>
  );
}
