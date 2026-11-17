import Link from "next/link";

import { PublicShell } from "@/components/consorcio/public-shell";
import { AVALIACAO_TERMS_VERSION } from "@/lib/consorcio/terms";

export const metadata = {
  title: "Termos da avaliação | Auttus",
  description: "Declaração de veracidade das informações enviadas na avaliação remota.",
};

export default function TermosAvaliacaoPage() {
  return (
    <PublicShell
      eyebrow="Termos"
      title="Declaração de veracidade"
      subtitle="Ao enviar a avaliação, você declara sob sua responsabilidade que as informações são reais e completas."
    >
      <article className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/[0.07] px-5 py-6 text-sm leading-relaxed text-white/75 backdrop-blur-xl sm:px-7 sm:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-coral">
          Versão {AVALIACAO_TERMS_VERSION}
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">1. Objeto</h2>
          <p>
            Esta declaração integra o preenchimento da avaliação remota do veículo na plataforma
            Auttus. O envio do formulário equivale à sua ciência e aceite destes termos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">2. O que você declara</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Que todas as informações prestadas são verdadeiras, atuais e de sua autoria;</li>
            <li>
              Que não omitiu fato relevante sobre o veículo (incluindo avarias, financiamento,
              quilometragem aparente no painel, documentação e estado geral);
            </li>
            <li>
              Que as fotos e dados enviados correspondem ao veículo da placa informada e não
              destinam a induzir terceiro a erro;
            </li>
            <li>
              Que está ciente de que prestar informação falsa ou incompleta pode gerar
              responsabilidade civil e, conforme o caso, outras consequências legais.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">3. Fundamento e boa-fé</h2>
          <p>
            A relação se apoia na boa-fé objetiva e na vedação ao abuso de direito e ao ato ilícito,
            nos termos do Código Civil brasileiro (em especial arts. 186, 187 e 422). Declarações
            inverídicas ou omissões relevantes podem ensejar reparação de danos a quem delas se
            prejudicar, sem prejuízo de outras medidas cabíveis.
          </p>
          <p>
            Este texto é uma declaração contratual de veracidade para uso na avaliação remota; não
            substitui orientação jurídica individual. Em caso de dúvida, consulte um advogado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-white">4. Uso das informações</h2>
          <p>
            Os dados e imagens são usados para análise do oferecimento pelo consignador e, se
            liberado, para exibição controlada a lojistas. Telefone e contato seguem as regras de
            privacidade e auditoria da plataforma.
          </p>
        </section>

        <p className="border-t border-white/10 pt-4 text-xs text-white/45">
          Ao marcar o aceite no formulário e enviar a avaliação, você confirma ter lido e concordado
          com esta declaração.
        </p>

        <p>
          <Link
            href="/"
            className="text-sm font-medium text-coral underline-offset-2 hover:underline"
          >
            Voltar
          </Link>
        </p>
      </article>
    </PublicShell>
  );
}
