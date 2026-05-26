import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Inbox } from "lucide-react";

export default function LibraryEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-sm p-12 text-center"
    >
      <Inbox className="w-10 h-10 text-gold/60 mx-auto mb-4" />
      <h3 className="font-display text-2xl mb-2">Sua biblioteca está vazia</h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm">
        Crie ou gere paletas com IA, depois salve-as aqui para acessar a qualquer momento.
      </p>
      <Link
        to="/studio"
        className="btn-gold px-5 py-2.5 rounded-sm text-xs tracking-[0.2em] uppercase inline-flex items-center gap-2"
        data-testid="lib-empty-cta"
      >
        <Sparkles className="w-4 h-4" />
        Ir para o Studio
      </Link>
    </motion.div>
  );
}
