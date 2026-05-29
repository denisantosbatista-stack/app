import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mail, User, Lock } from "lucide-react";

export default function RegisterStep({ value, onChange, onNext, onBack, onSkip }) {
  const [name, setName] = useState(value?.name || "");
  const [email, setEmail] = useState(value?.email || "");
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameValid = name.trim().length >= 2;
  const canSubmit = emailValid && nameValid;

  const submit = (e) => {
    e?.preventDefault?.();
    setTouched(true);
    if (!canSubmit) return;
    onChange({ name: name.trim(), email: email.trim() });
    onNext();
  };

  return (
    <div data-testid="onboarding-register">
      <div className="text-center mb-10">
        <div className="text-[10px] tracking-[0.32em] uppercase text-gold-deep mb-3">
          Passo 4 de 5
        </div>
        <h2 className="font-display text-3xl md:text-5xl tracking-tight leading-tight text-ink-text">
          Salve sua{" "}
          <span className="italic gold-shimmer">peça</span>
        </h2>
        <p className="text-ink-muted mt-4 max-w-md mx-auto">
          Crie uma conta gratuita para guardar suas paletas, peças e configurações.
        </p>
      </div>

      <form onSubmit={submit} className="max-w-md mx-auto space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <label className="label-eyebrow block mb-2">Nome</label>
          <div className="relative">
            <User className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como devemos te chamar?"
              data-testid="onboarding-register-name"
              className="w-full pl-10"
              autoComplete="name"
            />
          </div>
          {touched && !nameValid && (
            <div className="text-xs text-rose-600 mt-1">Informe um nome (mín. 2 letras)</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
        >
          <label className="label-eyebrow block mb-2">E-mail</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              data-testid="onboarding-register-email"
              className="w-full pl-10"
              autoComplete="email"
            />
          </div>
          {touched && !emailValid && (
            <div className="text-xs text-rose-600 mt-1">Informe um e-mail válido</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.26, duration: 0.4 }}
          className="flex items-center gap-2 text-xs text-ink-muted bg-ink-elevated/60 border border-black/[0.06] rounded-sm px-3 py-2.5"
        >
          <Lock className="w-3.5 h-3.5 text-gold-deep shrink-0" />
          Seus dados ficam apenas no seu dispositivo. Sem spam, sem rastreio externo.
        </motion.div>

        <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            data-testid="onboarding-register-back"
            className="btn-outline-gold px-5 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
          <button
            type="button"
            onClick={onSkip}
            data-testid="onboarding-register-skip"
            className="px-5 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase text-ink-muted hover:text-ink-text transition"
          >
            Pular por agora
          </button>
          <motion.button
            type="submit"
            whileHover={{ scale: canSubmit ? 1.03 : 1 }}
            whileTap={{ scale: canSubmit ? 0.98 : 1 }}
            data-testid="onboarding-register-submit"
            className={`btn-gold px-8 py-3.5 rounded-sm text-[11px] tracking-[0.28em] uppercase inline-flex items-center gap-2 ${
              !canSubmit && "opacity-60"
            }`}
          >
            Criar conta
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
