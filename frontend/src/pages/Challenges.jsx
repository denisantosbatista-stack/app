import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Flame,
  Clock,
  Hourglass,
  Heart,
  Plus,
  Loader2,
  X,
  Image as ImageIcon,
  RefreshCw,
  Crown,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const VOTED_KEY = "lindart.challenges.voted.v1";
const HANDLE_KEY = "lindart.author.handle.v1";

function loadVoted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveVoted(set) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

const STATUS_META = {
  active: { label: "Ativo", icon: Flame, tone: "text-rose-500 border-rose-500/40 bg-rose-500/10" },
  upcoming: { label: "Em breve", icon: Hourglass, tone: "text-amber-500 border-amber-500/40 bg-amber-500/10" },
  ended: { label: "Encerrado", icon: Clock, tone: "text-zinc-500 border-zinc-400/40 bg-zinc-500/10" },
};

function daysLeft(endsAt) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "encerrado";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 1) return "termina hoje";
  return `${days} dias restantes`;
}

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function fetchChallenges() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/challenges?limit=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setChallenges(await res.json());
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar os desafios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChallenges();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-6" data-testid="challenges-page">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="label-eyebrow text-gold inline-flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" /> Desafios LindArt
          </div>
          <button
            onClick={fetchChallenges}
            disabled={loading}
            className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 hover:text-gold inline-flex items-center gap-1.5 disabled:opacity-50"
            data-testid="challenges-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Competições <span className="italic gold-shimmer">temáticas</span> da comunidade
        </h1>
        <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-3xl leading-relaxed italic">
          Provoque sua técnica num tema curado, envie sua peça e a comunidade vota.
          Vencedora ganha destaque permanente como Pick + selo do desafio.
        </p>
      </motion.header>

      {loading && challenges.length === 0 ? (
        <div className="py-20 flex items-center justify-center text-zinc-500" data-testid="challenges-loading">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando desafios…
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {challenges.map((ch) => (
            <ChallengeCard key={ch.id} ch={ch} onOpen={() => setSelected(ch)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <ChallengeDetailModal
            challengeId={selected.id}
            onClose={() => setSelected(null)}
            onSubmitted={fetchChallenges}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChallengeCard({ ch, onOpen }) {
  const meta = STATUS_META[ch.status] || STATUS_META.active;
  const Icon = meta.icon;
  const colors = ch.palette_hint || [];

  return (
    <motion.button
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      onClick={onOpen}
      className="text-left group relative border border-black/[0.08] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/50 transition-colors"
      data-testid={`challenge-card-${ch.id}`}
      style={{
        boxShadow: `0 0 0 1px ${ch.theme_color}10`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 0%, ${ch.theme_color}, transparent 60%)` }}
      />
      <div className="relative p-6 md:p-8">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase px-2.5 py-1 rounded-sm border ${meta.tone}`}
            data-testid={`challenge-status-${ch.id}`}
          >
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
          <span className="text-[10px] tracking-[0.18em] uppercase text-zinc-500">
            {ch.status === "active" ? daysLeft(ch.ends_at) : ""}
          </span>
        </div>

        <h3
          className="font-display text-2xl md:text-3xl tracking-tight leading-tight mb-3"
          style={{ color: ch.theme_color }}
          data-testid={`challenge-title-${ch.id}`}
        >
          {ch.title}
        </h3>
        <p className="text-sm text-zinc-700 leading-relaxed line-clamp-3 italic mb-5">
          {ch.prompt}
        </p>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-5">
            {colors.slice(0, 6).map((c, i) => (
              <span
                key={i}
                className="w-6 h-6 rounded-sm border border-black/10"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-black/[0.06] pt-4">
          <span className="text-xs text-zinc-600">
            <strong className="text-zinc-900">{ch.submissions_count || 0}</strong> submissões
          </span>
          <span className="text-[11px] tracking-[0.22em] uppercase text-gold inline-flex items-center gap-1.5">
            Abrir desafio →
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function EmptyState() {
  return (
    <div className="border border-black/[0.06] bg-ink-surface rounded-sm p-12 text-center" data-testid="challenges-empty">
      <Trophy className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
      <h3 className="font-display text-xl text-zinc-800 mb-2">Sem desafios ativos no momento</h3>
      <p className="text-zinc-600 text-sm max-w-md mx-auto">
        Novos temas são lançados semanalmente. Volte em breve.
      </p>
    </div>
  );
}

function ChallengeDetailModal({ challengeId, onClose, onSubmitted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(loadVoted());
  const [showSubmit, setShowSubmit] = useState(false);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/challenges/${challengeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDetail(await res.json());
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível carregar o desafio");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  async function vote(sub) {
    if (voted.has(sub.id)) {
      toast("Você já votou nesta peça ✦", { duration: 1400 });
      return;
    }
    setDetail((d) =>
      d
        ? {
            ...d,
            submissions: d.submissions.map((s) =>
              s.id === sub.id ? { ...s, votes: (s.votes || 0) + 1 } : s
            ),
          }
        : d
    );
    const next = new Set(voted);
    next.add(sub.id);
    setVoted(next);
    saveVoted(next);
    try {
      await fetch(`${API_BASE}/api/challenges/${challengeId}/submissions/${sub.id}/vote`, {
        method: "POST",
      });
    } catch {
      /* rollback silencioso */
    }
  }

  const ch = detail?.challenge;
  const meta = ch ? STATUS_META[ch.status] || STATUS_META.active : STATUS_META.active;
  const canSubmit = ch?.status === "active";
  const sorted = useMemo(() => {
    if (!detail?.submissions) return [];
    return [...detail.submissions].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [detail]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto"
      data-testid="challenge-detail-modal"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="bg-bone w-full max-w-5xl rounded-sm border border-black/10 max-h-[92vh] overflow-y-auto"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-5 border-b border-black/[0.06] bg-bone/95 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="label-eyebrow text-gold truncate">Desafio</div>
            <h2
              className="font-display text-xl md:text-2xl truncate"
              style={{ color: ch?.theme_color || "#D4B260" }}
              data-testid="challenge-detail-title"
            >
              {ch?.title || "Carregando…"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800 shrink-0 ml-3"
            data-testid="challenge-detail-close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {loading || !ch ? (
          <div className="py-20 flex items-center justify-center text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando…
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-7">
            <section>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase px-2.5 py-1 rounded-sm border ${meta.tone}`}
                >
                  <meta.icon className="w-3 h-3" />
                  {meta.label}
                </span>
                <span className="text-[11px] tracking-[0.18em] uppercase text-zinc-500">
                  {ch.status === "active" ? daysLeft(ch.ends_at) : new Date(ch.ends_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="text-base text-zinc-700 leading-relaxed italic">{ch.prompt}</p>
              {ch.palette_hint?.length > 0 && (
                <div className="mt-5">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 mb-2">
                    Paleta sugerida
                  </div>
                  <div className="flex items-center gap-2">
                    {ch.palette_hint.map((c, i) => (
                      <span
                        key={i}
                        className="w-9 h-9 rounded-sm border border-black/10"
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowSubmit(true)}
                  disabled={!canSubmit}
                  className="text-[11px] tracking-[0.22em] uppercase bg-zinc-900 text-bone hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 inline-flex items-center gap-2 rounded-sm"
                  data-testid="challenge-open-submit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {canSubmit ? "Enviar minha peça" : ch.status === "upcoming" ? "Ainda não começou" : "Encerrado"}
                </button>
                <span className="text-xs text-zinc-600">
                  <strong className="text-zinc-900">{detail?.submissions?.length || 0}</strong> participações
                </span>
              </div>
            </section>

            {detail?.winner && (
              <section
                className="border border-gold/40 bg-gold/[0.06] rounded-sm p-5"
                data-testid="challenge-winner"
              >
                <div className="label-eyebrow text-gold inline-flex items-center gap-2 mb-2">
                  <Crown className="w-3.5 h-3.5" /> Peça vencedora
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src={detail.winner.image_url}
                    alt={detail.winner.handle}
                    className="w-20 h-20 object-cover rounded-sm border border-black/10"
                  />
                  <div>
                    <div className="font-display text-lg">@{detail.winner.handle}</div>
                    <div className="text-xs text-zinc-600 mt-1">{detail.winner.votes} votos</div>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h3 className="font-display text-xl mb-4">Galeria</h3>
              {sorted.length === 0 ? (
                <div className="border border-dashed border-black/15 rounded-sm py-12 text-center text-zinc-500 text-sm">
                  Ainda sem submissões. Seja a primeira.
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
                  data-testid="challenge-submissions-grid"
                >
                  {sorted.map((sub, idx) => (
                    <SubmissionCard
                      key={sub.id}
                      sub={sub}
                      rank={idx + 1}
                      voted={voted.has(sub.id)}
                      onVote={() => vote(sub)}
                      voteEnabled={canSubmit}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <AnimatePresence>
          {showSubmit && ch && (
            <SubmitModal
              challengeId={ch.id}
              themeColor={ch.theme_color}
              onClose={() => setShowSubmit(false)}
              onSubmitted={(newSub) => {
                setDetail((d) =>
                  d ? { ...d, submissions: [newSub, ...(d.submissions || [])] } : d
                );
                setShowSubmit(false);
                toast.success("Peça enviada! Boa sorte ✦");
                onSubmitted?.();
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function SubmissionCard({ sub, rank, voted, onVote, voteEnabled }) {
  const colors = sub.palette_colors || [];
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group border border-black/[0.06] bg-ink-surface rounded-sm overflow-hidden hover:border-gold/40 transition-colors"
      data-testid={`challenge-submission-${sub.id}`}
    >
      <div className="relative">
        <img
          src={sub.image_url}
          alt={sub.handle}
          loading="lazy"
          className="w-full aspect-square object-cover block"
        />
        {rank <= 3 && (
          <span
            className={`absolute top-2 left-2 inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-display font-semibold ${
              rank === 1
                ? "bg-gold text-ink"
                : rank === 2
                ? "bg-zinc-300 text-ink"
                : "bg-amber-700 text-bone"
            }`}
          >
            {rank}
          </span>
        )}
        <button
          onClick={onVote}
          disabled={!voteEnabled}
          className={`absolute bottom-2 right-2 inline-flex items-center gap-1.5 backdrop-blur-md bg-black/40 text-white text-xs px-2.5 py-1.5 rounded-full border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            voted ? "text-gold" : "hover:bg-black/60"
          }`}
          data-testid={`challenge-vote-${sub.id}`}
        >
          <Heart className={`w-3.5 h-3.5 ${voted ? "fill-gold" : ""}`} />
          {sub.votes || 0}
        </button>
      </div>
      <div className="p-2.5">
        <div className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-1">
          @{sub.handle}
        </div>
        {sub.caption && (
          <p className="text-[11px] text-zinc-600 line-clamp-2 mb-1.5">{sub.caption}</p>
        )}
        {colors.length > 0 && (
          <div className="flex gap-0.5">
            {colors.slice(0, 5).map((c, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-[1px] border border-black/10"
                style={{ background: c }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function SubmitModal({ challengeId, themeColor, onClose, onSubmitted }) {
  const [handle, setHandle] = useState(() => localStorage.getItem(HANDLE_KEY) || "");
  const [caption, setCaption] = useState("");
  const [palette, setPalette] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result || "");
      setImagePreview(reader.result || "");
    };
    reader.readAsDataURL(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!handle.trim() || !imageBase64) {
      toast.error("Handle e imagem são obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        handle: handle.trim(),
        caption: caption.trim(),
        image_base64: imageBase64,
        palette_colors: palette
          .split(",")
          .map((c) => c.trim())
          .filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)),
      };
      const res = await fetch(`${API_BASE}/api/challenges/${challengeId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `HTTP ${res.status}`);
      }
      const created = await res.json();
      localStorage.setItem(HANDLE_KEY, handle.trim().replace(/^@/, ""));
      onSubmitted(created);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao enviar peça");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="challenge-submit-modal"
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="bg-bone w-full max-w-lg rounded-sm border border-black/10 max-h-[92vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between p-4 border-b border-black/[0.06]">
          <div>
            <div className="label-eyebrow" style={{ color: themeColor }}>
              Enviar peça
            </div>
            <h2 className="font-display text-xl text-zinc-900">Sua submissão</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-800"
            data-testid="challenge-submit-close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
              Imagem da peça (até 4MB)
            </span>
            <div className="mt-1.5 border border-dashed border-black/15 rounded-sm p-4 text-center hover:border-gold/60 transition-colors">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt=""
                  className="max-h-48 mx-auto object-contain"
                />
              ) : (
                <div className="text-zinc-500 text-sm py-6">
                  <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                  Clique para escolher imagem
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="block w-full mt-3 text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:border file:border-black/10 file:bg-ink-surface file:text-zinc-700 file:rounded-sm file:cursor-pointer"
                data-testid="challenge-submit-file"
              />
            </div>
          </label>

          <Field
            label="Seu handle"
            placeholder="@suaarte"
            value={handle}
            onChange={setHandle}
            testId="challenge-submit-handle"
          />
          <Field
            label="Legenda (opcional)"
            placeholder="Conte sobre a peça…"
            value={caption}
            onChange={setCaption}
            multiline
            testId="challenge-submit-caption"
          />
          <Field
            label="Paleta usada (hex separados por vírgula)"
            placeholder="#1b3a4b, #f4f1ea"
            value={palette}
            onChange={setPalette}
            testId="challenge-submit-palette"
          />
        </div>
        <footer className="p-4 border-t border-black/[0.06] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-800 px-4 py-2"
            data-testid="challenge-submit-cancel"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="text-xs uppercase tracking-[0.22em] bg-zinc-900 text-bone hover:bg-zinc-800 px-5 py-2.5 rounded-sm inline-flex items-center gap-2 disabled:opacity-50"
            data-testid="challenge-submit-confirm"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enviar peça
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder, multiline, testId }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="block w-full mt-1.5 bg-ink-surface border border-black/[0.08] rounded-sm px-3 py-2 text-sm text-zinc-900 focus:border-gold focus:outline-none"
          data-testid={testId}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full mt-1.5 bg-ink-surface border border-black/[0.08] rounded-sm px-3 py-2 text-sm text-zinc-900 focus:border-gold focus:outline-none"
          data-testid={testId}
        />
      )}
    </label>
  );
}
