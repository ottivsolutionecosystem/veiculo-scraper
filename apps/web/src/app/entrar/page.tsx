"use client";

import { AuttusWordmark } from "@/components/brand/auttus-mark";
import { EntrarAtmosphere } from "@/components/auth/entrar-atmosphere";
import { EntrarForm } from "@/components/auth/entrar-form";
import { EntrarHero } from "@/components/auth/entrar-hero";

export default function EntrarPage() {
  return (
    <div data-entrar className="relative min-h-dvh overflow-hidden bg-navy-deep">
      <EntrarAtmosphere />
      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-2">
        <EntrarHero />
        <div
          className="flex flex-col justify-center px-4 py-10 sm:px-8"
          style={{
            paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <AuttusWordmark onDark align="center" />
          </div>
          <div className="mx-auto w-full max-w-[26rem] lg:ml-auto lg:mr-0">
            <EntrarForm />
          </div>
        </div>
      </div>
    </div>
  );
}
