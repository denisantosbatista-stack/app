import { motion } from "framer-motion";
import { RotateCcw, Crown, Wifi, Server, Clock, AlertTriangle } from "lucide-react";

const MENSAGENS = {
  limite: {
    titulo: "Muitas gerações ao mesmo tempo",
    descricao: "Aguarde alguns segundos e tente de novo — você não perdeu nada.",
    Icon: Clock,
  },
  saldo: {
    titulo: "Suas gerações deste mês acabaram",
    descricao: "Libere paletas ilimitadas e exportações em alta com o plano Premium.",
    Icon: Crown,
  },
  timeout: {
    titulo: "A IA demorou demais para responder",
    descricao: "Pode ter sido um pico no servidor. Tente novamente.",
    Icon: Clock,
  },
  rede: {
    titulo: "Sem conexão",
    descricao: "Verifique sua internet e tente novamente.",
    Icon: Wifi,
  },
  servidor: {
    titulo: "Algo falhou do nosso lado",
    descricao: "Já estamos vendo. Tente novamente em instantes.",
    Icon: Server,
  },
};

/**
 * UI de erro persistente para fluxos de IA.
 * Renderiza mensagem categorizada + CTA principal (retry ou upgrade).
 */
export default function AIErrorState({ erro, onRetry, onUpgrade }) {
  const cfg = MENSAGENS[erro?.tipo] || {
    titulo: "Algo deu errado",
    descricao: "Tente novamente em instantes.",
    Icon: AlertTriangle,
  };
  const { titulo, descricao, Icon } = cfg;
  const isSaldo = erro?.tipo === "saldo";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative glass rounded-sm p-6 md:p-8 border border-rose-200/60 overflow-hidden"
      data-testid="ai-error-state"
      data-error-tipo={erro?.tipo || "desconhecido"}
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-400/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-sm bg-rose-50 text-rose-500 border border-rose-200/60"
            data-testid="ai-error-icon"
          >
            <Icon className="w-5 h-5" />
          </span>
          <div>
            <h3
              className="font-display text-xl md:text-2xl tracking-tight"
              data-testid="ai-error-title"
            >
              {titulo}
            </h3>
            <p
              className="text-sm text-zinc-600 mt-1 max-w-md"
              data-testid="ai-error-description"
            >
              {descricao}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {isSaldo ? (
            <button
              type="button"
              onClick={onUpgrade}
              className="btn-gold px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center gap-2"
              data-testid="ai-error-upgrade-btn"
            >
              <Crown className="w-4 h-4" />
              Liberar gerações ilimitadas
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="btn-gold px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase inline-flex items-center gap-2"
              data-testid="ai-error-retry-btn"
            >
              <RotateCcw className="w-4 h-4" />
              Tentar novamente
            </button>
          )}
          {!isSaldo && onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              className="px-5 py-3 rounded-sm text-xs tracking-[0.18em] uppercase border border-black/10 hover:border-gold/60 transition-colors"
              data-testid="ai-error-upgrade-secondary-btn"
            >
              Conheça o Premium
            </button>
          )}
        </div>

        {erro?.detail && (
          <details className="text-[11px] text-zinc-500 mt-1" data-testid="ai-error-details">
            <summary className="cursor-pointer">Detalhes técnicos</summary>
            <pre className="mt-1 whitespace-pre-wrap break-words">
              {typeof erro.detail === "string"
                ? erro.detail
                : JSON.stringify(erro.detail, null, 2)}
              {erro?.status ? `\nstatus: ${erro.status}` : ""}
            </pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
