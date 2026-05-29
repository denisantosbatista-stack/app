import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageCircle, Sparkles, RefreshCw, Image as ImageIcon, X } from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = "lindart.mentora.v1";

const QUICK_PROMPTS = [
  "Como evitar bolhas em resina cristal AB 1:1?",
  "Por que minha peça ficou opaca depois de curar?",
  "Qual a proporção ideal de mica para um efeito mármore translúcido?",
  "Como conseguir um acabamento alto-brilho sem polimento mecânico?",
  "Minha resina ficou amarelada — qual o problema e como corrigir?",
];

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { session_id: null, messages: [] };
    const parsed = JSON.parse(raw);
    return {
      session_id: parsed.session_id || null,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return { session_id: null, messages: [] };
  }
}

function saveSession(session_id, messages) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ session_id, messages: messages.slice(-40) })
    );
  } catch {
    /* ignore quota */
  }
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Mentora() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageB64, setImageB64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const s = loadSession();
    setSessionId(s.session_id);
    setMessages(s.messages);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    saveSession(sessionId, messages);
  }, [messages, sessionId]);

  async function send(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text, ts: Date.now(), image: imagePreview };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const body = {
        session_id: sessionId,
        message: text,
        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      };
      if (imageB64) body.image_base64 = imageB64;
      const res = await fetch(`${API_BASE}/api/ai/mentora`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.session_id && data.session_id !== sessionId) setSessionId(data.session_id);
      const asst = { role: "assistant", content: data.reply || "", ts: Date.now() };
      setMessages([...next, asst]);
      setImageB64(null);
      setImagePreview(null);
    } catch (e) {
      toast.error(e.message || "Erro ao consultar a Mentora");
      console.error(e);
      setMessages(next.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  async function onImagePick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      toast.error("Imagem deve ter menos de 6MB");
      return;
    }
    const b64 = await fileToBase64(f);
    setImageB64(b64);
    setImagePreview(b64);
  }

  function clearSession() {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Conversa reiniciada");
  }

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 pt-10 md:pt-14 pb-6" data-testid="mentora-page">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="label-eyebrow text-gold mb-3">Inteligência Artística</div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] pb-1">
          Mentora IA <span className="italic gold-shimmer">do Ateliê</span>
        </h1>
        <p className="text-zinc-600 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
          Sua especialista sênior em resina epóxi — diagnóstico de problemas,
          proporções, técnicas, acabamento e tendências. Anexe uma foto da peça
          para análise visual.
        </p>
      </motion.header>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
          data-testid="mentora-quick-prompts"
        >
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 mb-3">
            Comece com uma pergunta
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs md:text-sm text-left px-3 py-2 rounded-sm bg-ink-surface border border-black/[0.08] hover:border-gold/50 hover:bg-gold/5 transition-colors"
                data-testid="mentora-quick-prompt"
              >
                {q}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="glass rounded-sm p-4 md:p-5 min-h-[300px] max-h-[58vh] overflow-y-auto space-y-4 mb-4"
        data-testid="mentora-thread"
      >
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-sm py-12 flex flex-col items-center gap-2">
            <MessageCircle className="w-8 h-8 text-gold/60" />
            <span>Faça a primeira pergunta para começar.</span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gold text-ink shadow-gold"
                    : "bg-ink-surface border border-black/[0.06] text-ink-text"
                }`}
                data-testid={`mentora-msg-${m.role}`}
              >
                {m.image && (
                  <img
                    src={m.image}
                    alt="anexada"
                    className="rounded-sm mb-2 max-h-40 object-cover"
                  />
                )}
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start" data-testid="mentora-loading">
            <div className="bg-ink-surface border border-black/[0.06] rounded-sm px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
              Pensando…
            </div>
          </div>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-3 bg-ink-surface border border-black/[0.06] rounded-sm p-2">
          <img src={imagePreview} alt="preview" className="w-14 h-14 object-cover rounded-sm" />
          <span className="text-xs text-zinc-600 flex-1">Foto anexada para análise</span>
          <button
            onClick={() => {
              setImageB64(null);
              setImagePreview(null);
            }}
            className="text-zinc-500 hover:text-ink-text"
            data-testid="mentora-remove-image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Pergunte sobre proporções, bolhas, cura, pigmentos, acabamento…"
          rows={2}
          className="flex-1 resize-none text-sm"
          data-testid="mentora-input"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImagePick}
          data-testid="mentora-image-input"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Anexar foto da peça"
          className="p-3 rounded-sm bg-ink-surface border border-black/[0.08] hover:border-gold/50 text-zinc-600 hover:text-gold transition-colors"
          data-testid="mentora-attach-image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-gold px-4 py-3 rounded-sm flex items-center gap-2 text-xs tracking-[0.18em] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="mentora-send"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar
        </button>
      </div>

      <div className="flex items-center justify-between mt-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-gold" />
          Claude Sonnet 4.5 · contexto persistente
        </span>
        {messages.length > 0 && (
          <button
            onClick={clearSession}
            className="flex items-center gap-1 hover:text-ink-text transition-colors uppercase tracking-[0.18em]"
            data-testid="mentora-clear"
          >
            <RefreshCw className="w-3 h-3" />
            Nova conversa
          </button>
        )}
      </div>
    </div>
  );
}
