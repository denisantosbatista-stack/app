import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BellRing, Check } from "lucide-react";
import toast from "react-hot-toast";

const API = `${(process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL)}/api`;

const INTERESTS = [
  { id: "qualquer", label: "Qualquer peça nova" },
  { id: "anel", label: "Anéis" },
  { id: "brinco", label: "Brincos" },
  { id: "colar", label: "Colares" },
  { id: "pulseira", label: "Pulseiras" },
  { id: "chaveiro", label: "Chaveiros" },
  { id: "porta-copos", label: "Porta-copos" },
  { id: "luminaria", label: "Luminárias" },
  { id: "escultura", label: "Esculturas" },
];

export default function NotifyMeModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("qualquer");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      // reset ao fechar para próxima abertura ficar limpa
      setDone(false);
      setSubmitting(false);
      return;
    }
    // foco no primeiro input ao abrir
    const t = setTimeout(() => firstInputRef.current?.focus(), 80);
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      toast.error("Diga seu nome para personalizarmos o aviso");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Email inválido");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch(`${API}/leads/notify-me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          interest,
          message: message.trim().slice(0, 400),
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const detail = Array.isArray(data?.detail)
          ? data.detail.map((d) => d.msg).join(" · ")
          : data?.detail || "Erro ao registrar";
        throw new Error(detail);
      }
      const data = await resp.json();
      setDone(true);
      toast.success(
        data.already_subscribed
          ? "Você já estava na lista — atualizamos seu interesse"
          : "Pronto! Vamos te avisar quando lançar"
      );
      setName("");
      setEmail("");
      setMessage("");
      setInterest("qualquer");
    } catch (err) {
      toast.error(err?.message || "Não foi possível registrar agora");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          data-testid="notify-me-modal"
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            data-testid="notify-me-backdrop"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative w-full max-w-md bg-white border border-black/[0.06] rounded-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho dourado */}
            <div className="relative px-6 py-5 bg-gradient-to-br from-[#fff7e0] via-[#fef0c4] to-[#f7e3a1] border-b border-gold/30">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Fechar modal"
                data-testid="notify-me-close-btn"
              >
                <X className="w-4 h-4 text-ink-text" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm inline-flex items-center justify-center ring-1 ring-gold/40">
                  <BellRing className="w-5 h-5 text-gold-deep" />
                </div>
                <div>
                  <div className="label-eyebrow text-gold-deep">Lista de avisos</div>
                  <h3 className="font-display text-2xl tracking-tight leading-tight">
                    Quero ser avisado(a)
                  </h3>
                </div>
              </div>
              <p className="text-sm text-zinc-700 mt-3">
                Novas peças 3D entram no Studio em breve. Deixe seu email e a gente te
                chama assim que a sua categoria favorita chegar.
              </p>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center" data-testid="notify-me-success">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 ring-1 ring-emerald-200 inline-flex items-center justify-center mb-4">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
                <h4 className="font-display text-xl tracking-tight mb-1">
                  Você está na lista
                </h4>
                <p className="text-sm text-zinc-600 mb-6">
                  A gente avisa por email quando a nova peça estiver disponível no Studio.
                </p>
                <button
                  onClick={onClose}
                  className="btn-gold px-5 py-2.5 rounded-sm text-[11px] uppercase tracking-[0.2em]"
                  data-testid="notify-me-done-btn"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                    Nome
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como devemos te chamar?"
                    maxLength={80}
                    className="w-full px-3 py-2 rounded-sm bg-ink-surface border border-black/10 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm transition"
                    data-testid="notify-me-name-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 rounded-sm bg-ink-surface border border-black/10 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm transition"
                    data-testid="notify-me-email-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                    Qual peça te interessa mais?
                  </label>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full px-3 py-2 rounded-sm bg-ink-surface border border-black/10 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm transition"
                    data-testid="notify-me-interest-select"
                  >
                    {INTERESTS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                    Mensagem <span className="opacity-60">(opcional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    maxLength={400}
                    placeholder="Algo que você gostaria de ver primeiro?"
                    className="w-full px-3 py-2 rounded-sm bg-ink-surface border border-black/10 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm resize-none transition"
                    data-testid="notify-me-message-input"
                  />
                  <div className="text-[10px] text-zinc-400 text-right mt-1">
                    {message.length}/400
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-outline-gold flex-1 px-3 py-2.5 rounded-sm text-[11px] uppercase tracking-[0.2em]"
                    data-testid="notify-me-cancel-btn"
                  >
                    Agora não
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-gold flex-[1.2] px-3 py-2.5 rounded-sm text-[11px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 disabled:opacity-60"
                    data-testid="notify-me-submit-btn"
                  >
                    {submitting ? "Enviando…" : "Me avise"}
                  </button>
                </div>

                <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                  Sem spam. Você pode pedir para sair a qualquer momento respondendo o email.
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
