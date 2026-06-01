import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Download, ArrowRight } from "lucide-react";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import DNAShareCard from "@/components/DNAShareCard";

const API_BASE = (process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL);

export default function PublicDNAPage() {
  const { id } = useParams();
  const cardRef = useRef(null);
  const [state, setState] = useState({ loading: true, dna: null, handle: null, error: null });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/dna/share/${id}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || `Erro ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setState({
          loading: false,
          dna: data.payload,
          handle: data.handle,
          error: null,
        });
      } catch (e) {
        if (!cancelled) setState({ loading: false, dna: null, handle: null, error: e.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Share tracking E2E — dispara em /dna/<id>?ref=share (fire-and-forget).
  useEffect(() => {
    if (!id) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ref") !== "share") return;
      const key = `lindart.share.tracked.dna.${id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      fetch(`${API_BASE}/api/analytics/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "dna", id, ref: "share" }),
      }).catch(() => {});
    } catch {
      /* fire-and-forget */
    }
  }, [id]);

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#050505",
        scale: 1,
        useCORS: true,
        logging: false,
        width: 1080,
        height: 1080,
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `lindart-dna-${id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Cartão baixado");
    } catch (e) {
      toast.error(e.message || "Falha ao baixar");
    } finally {
      setDownloading(false);
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  if (state.error || !state.dna) {
    return (
      <div className="min-h-screen bg-bone flex flex-col items-center justify-center px-6 text-center" data-testid="dna-public-error">
        <div className="label-eyebrow text-gold mb-2">Assinatura de Cor</div>
        <h1 className="font-display text-3xl mb-2">Cartão não encontrado</h1>
        <p className="text-sm text-zinc-600 mb-6 max-w-md">
          O link pode ter expirado ou ter sido digitado incorretamente.
        </p>
        <Link
          to="/"
          className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-[11px] tracking-[0.22em] uppercase"
        >
          Voltar ao LindArt
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone py-10 px-4" data-testid="dna-public-page">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="font-display text-2xl tracking-tight">
            LindArt
            <span className="text-gold">.</span>
          </Link>
          <Link
            to="/"
            className="text-[10px] tracking-[0.22em] uppercase text-zinc-700 hover:text-ink inline-flex items-center gap-1.5"
          >
            Criar seu DNA <ArrowRight className="w-3 h-3" />
          </Link>
        </header>

        <div className="grid lg:grid-cols-[1fr,320px] gap-8 items-start">
          {/* Card preview at responsive scale */}
          <div className="bg-zinc-900 rounded-sm p-6 flex items-center justify-center overflow-hidden">
            <div
              className="shadow-2xl"
              style={{ width: 540, height: 540 }}
            >
              <DNAShareCard
                ref={cardRef}
                dna={state.dna}
                handle={state.handle || undefined}
                compact
              />
            </div>
          </div>

          <aside className="space-y-5">
            <div>
              <div className="label-eyebrow text-gold mb-1">Assinatura de Cor</div>
              <h1 className="font-display text-3xl tracking-tight leading-tight">
                {state.handle ? `Linguagem de @${state.handle}` : "Linguagem cromática"}
              </h1>
              <p className="text-sm text-zinc-600 mt-2 italic">
                {state.dna.signature}
              </p>
            </div>

            {state.dna.mood?.length > 0 && (
              <div>
                <div className="label-eyebrow text-zinc-500 mb-2">Mood</div>
                <div className="flex flex-wrap gap-1.5">
                  {state.dna.mood.map((m, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-sm bg-ink text-bone"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={downloadPng}
              disabled={downloading}
              className="btn-gold w-full py-3 rounded-sm text-[11px] tracking-[0.22em] uppercase inline-flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="dna-public-download"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Gerando…" : "Baixar PNG"}
            </button>

            <Link
              to="/"
              className="block w-full py-3 rounded-sm border border-ink text-ink text-[11px] tracking-[0.22em] uppercase text-center hover:bg-ink hover:text-bone transition-colors"
              data-testid="dna-public-cta"
            >
              Criar meu próprio DNA
            </Link>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              LindArt · Studio de paletas cromáticas para arte em resina,
              pintura e curadoria visual.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
