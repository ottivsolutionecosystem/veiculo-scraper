import { CAPTURAR_SHOPCAR_USERSCRIPT } from "@/lib/capturar-shopcar-userscript";

/** Instala no Tampermonkey — também em /capturar-shopcar.user.js (rewrite). */
export function GET() {
  return new Response(CAPTURAR_SHOPCAR_USERSCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Disposition": 'inline; filename="capturar-shopcar.user.js"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
