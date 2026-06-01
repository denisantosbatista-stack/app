import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Check, Mail, ArrowRight, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;

// Categorias temáticas de resina — slugs estáveis (servem para o backend)
const CATEGORIAS = [
  { slug: "aneis", label: "Anéis", title: "Anéis de resina chegando em breve." },
  { slug: "luminarias", label: "Luminárias", title: "Luminárias de resina chegando em breve." },
  { slug: "bandejas", label: "Bandejas", title: "Bandejas de resina chegando em breve." },
  { slug: "geodo", label: "Geodos", title: "Geodos de resina chegando em breve." },
  { slug: "pingentes", label: "Pingentes", title: "Pingentes de resina chegando em breve." },
];

const CATEGORIA_BY_SLUG = Object.fromEntries(CATEGORIAS.map((c) => [c.slug, c]));

function normalizeCategoriaParam(raw) {
  if (!raw) return null;
  const slug = String(raw).trim().toLowerCase();
  return CATEGORIA_BY_SLUG[slug] ? slug : null;
}

export default function WaitList() {
  const [params, setParams] = useSearchParams();
  const initialCategoria = normalizeCategoriaParam(params.get("categoria")) || "aneis";

  const [categoria, setCategoria] = useState(initialCategoria);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(null);

  const meta = useMemo(
    () => CATEGORIA_BY_SLUG[categoria] || CATEGORIAS[0],
    [categoria],
  );

  // Mantém ?categoria= sincronizado com o select (URL compartilhável)
  useEffect(() => {
    const current = params.get("categoria");
    if (current !== categoria) {
      const next = new URLSearchParams(params);
      next.set("categoria", categoria);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  // Carrega contador da categoria atual (refresh quando muda)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(`${API_BASE}/api/waitlist/count`);
        url.searchParams.set("categoria", categoria);
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(typeof data.count === "number" ? data.count : 0);
      } catch {
        if (!cancelled) setCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoria, done]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Informe um email válido");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          categoria,
          nome: nome.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Não foi possível salvar agora.");
      }
      setDone(true);
      if (data.created === false) {
        toast.success("Você já estava na lista — vamos te avisar!");
      } else {
        toast.success("Pronto! Vamos te avisar quando chegar ✦");
      }
    } catch (err) {
      toast.error(err.message || "Erro ao salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubscribeAnother() {
    setDone(false);
    setEmail("");
    setNome("");
  }

  return (
    <div className="min-h-screen bg-bone text-zinc-900" data-testid="waitlist-page">
      <div className="max-w-4xl mx-auto px-5 md:px-10 pt-16 md:pt-24 pb-16">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="label-eyebrow text-gold mb-3">Wait-list LindArt</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight">
            {meta.title}
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 mt-4 max-w-2xl">
            Deixe seu email e seja a primeira a saber quando essa categoria entrar no ar.
            Sem spam — só um aviso quando estiver pronto.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-3xl border border-zinc-200 bg-white shadow-sm p-6 md:p-10"
          data-testid="waitlist-card"
        >
          {!done ? (
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="waitlist-form">
              <div>
                <label
                  htmlFor="waitlist-categoria"
                  className="block text-xs uppercase tracking-[0.18em] text-zinc-500 mb-2"
                >
                  Categoria
                </label>
                <select
                  id="waitlist-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  data-testid="waitlist-categoria-select"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="waitlist-nome"
                  className="block text-xs uppercase tracking-[0.18em] text-zinc-500 mb-2"
                >
                  Nome (opcional)
                </label>
                <input
                  id="waitlist-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  maxLength={80}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                  data-testid="waitlist-nome-input"
                />
              </div>

              <div>
                <label
                  htmlFor="waitlist-email"
                  className="block text-xs uppercase tracking-[0.18em] text-zinc-500 mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="waitlist-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-zinc-300 bg-white pl-11 pr-4 py-3 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
                    data-testid="waitlist-email-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 text-white px-7 py-3.5 text-sm uppercase tracking-[0.18em] hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="waitlist-submit-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  <>
                    Quero ser avisada
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-zinc-500">
                Ao se inscrever, você concorda em receber um único aviso quando a categoria
                <strong className="font-medium text-zinc-700"> {meta.label.toLowerCase()} </strong>
                for liberada.
              </p>
            </form>
          ) : (
            <div className="text-center py-8" data-testid="waitlist-success">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/15 text-gold mb-4">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="font-display text-3xl mb-2">Você está na lista ✦</h2>
              <p className="text-base text-zinc-600 max-w-md mx-auto">
                Vamos te avisar assim que <strong>{meta.label.toLowerCase()}</strong> de resina entrarem no ar.
                Até lá, fique de olho no nosso feed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link
                  to="/feed"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-6 py-3 text-sm uppercase tracking-[0.18em] hover:bg-zinc-800 transition-colors"
                  data-testid="waitlist-go-feed"
                >
                  <Sparkles className="w-4 h-4" />
                  Explorar o feed
                </Link>
                <button
                  type="button"
                  onClick={handleSubscribeAnother}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 text-zinc-700 px-6 py-3 text-sm uppercase tracking-[0.18em] hover:bg-zinc-100 transition-colors"
                  data-testid="waitlist-another-btn"
                >
                  Inscrever outra categoria
                </button>
              </div>
            </div>
          )}

          {count !== null && (
            <div
              className="mt-8 pt-6 border-t border-zinc-100 text-sm text-zinc-500 text-center"
              data-testid="waitlist-count"
            >
              <span className="font-medium text-zinc-800">{count}</span>{" "}
              {count === 1 ? "pessoa já está" : "pessoas já estão"} na lista de{" "}
              <strong className="text-zinc-700">{meta.label.toLowerCase()}</strong>.
            </div>
          )}
        </motion.section>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            data-testid="waitlist-home-link"
          >
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
