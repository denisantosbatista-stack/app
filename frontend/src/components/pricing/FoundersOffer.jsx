import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Crown, Lock } from "lucide-react";

/**
 * FoundersOffer — bloco de oferta especial para as primeiras 100 assinantes.
 *
 * Aparece logo abaixo do hero da página Pricing. Tem ar de “convite”
 * (não promoção agressiva): paleta de preto + dourado, vidro fosco e
 * micro-animação suave. O contador atual é estimado client-side; quando
 * houver endpoint de tracking, basta substituir SEATS_TAKEN.
 */
const TOTAL_SEATS = 100;
const SEATS_TAKEN = 97; // mock até endpoint real existir

export default function FoundersOffer() {
  const remaining = Math.max(0, TOTAL_SEATS - SEATS_TAKEN);
  const progress = Math.min(100, (SEATS_TAKEN / TOTAL_SEATS) * 100);

  return (
    <section
      className="relative px-6 md:px-10 pb-12 md:pb-16"
      data-testid="founders-offer"
    >
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-lg bg-gradient-to-br from-ink-text via-zinc-900 to-ink-text border border-gold/30 shadow-deep p-8 md:p-10"
        >
          {/* Brilho decorativo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at 100% 0%, rgba(212,175,55,0.18), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(184,149,74,0.14), transparent 55%)",
            }}
          />
          <div className="relative grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 md:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-[10px] tracking-[0.24em] uppercase">
                <Crown className="w-3.5 h-3.5" />
                Oferta Fundadoras
              </div>
              <h2
                className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight text-bone"
                data-testid="founders-title"
              >
                As primeiras{" "}
                <span className="gold-shimmer">100 fundadoras</span> garantem
                preço pra sempre.
              </h2>
              <p className="mt-4 text-sm md:text-base text-ink-muted max-w-xl">
                Assine qualquer plano pago agora e o seu valor mensal nunca
                sobe — mesmo quando a gente reajustar pro restante do mundo.
                Você também entra no canal privado das fundadoras e vota nas
                próximas features do LindArt.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  "Preço congelado vitalício no plano escolhido",
                  "Selo \u201CFundadora LindArt\u201D dourado no perfil",
                  "Canal privado no Telegram com a equipe",
                  "Voto direto no roadmap de features",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-bone/85"
                  >
                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link
                  to="/register?plan=pro&founders=1"
                  className="btn-gold px-7 py-3.5 rounded-sm text-xs tracking-[0.22em] uppercase inline-flex items-center gap-2"
                  data-testid="founders-cta"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Travar meu preço agora
                </Link>
                <span className="text-[11px] tracking-[0.18em] uppercase text-ink-muted">
                  Sem trial, sem fidelidade
                </span>
              </div>
            </div>

            {/* Contador visual */}
            <div className="relative">
              <div className="rounded-md bg-bone/5 border border-gold/20 backdrop-blur-md p-6">
                <div className="text-[10px] tracking-[0.24em] uppercase text-gold mb-3">
                  Vagas preenchidas
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-display text-6xl md:text-7xl leading-none text-bone"
                    data-testid="founders-remaining"
                  >
                    {SEATS_TAKEN}
                  </span>
                  <span className="text-sm text-ink-muted">
                    de {TOTAL_SEATS} vagas
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="mt-5 h-1.5 w-full rounded-full bg-bone/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-gold-hover via-gold to-gold-deep"
                  />
                </div>
                <p className="mt-3 text-[11px] text-ink-muted">
                  Restam apenas <strong className="text-gold">{remaining} vagas</strong>.
                  Quando as 100 acabarem, o programa fecha — e o preço passa a ser
                  reajustado normalmente.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
