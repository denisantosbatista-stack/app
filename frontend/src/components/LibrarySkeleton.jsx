import { motion } from "framer-motion";

export default function LibrarySkeleton({ count = 6 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="library-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
          className="bg-ink-surface rounded-sm overflow-hidden border border-black/[0.06]"
          data-testid={`library-skeleton-${i}`}
        >
          {/* Color strips shimmer */}
          <div className="flex h-28 relative overflow-hidden">
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="flex-1 bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200"
                style={{
                  animation: `pulse 1.6s ease-in-out infinite`,
                  animationDelay: `${j * 0.15}s`,
                  opacity: 0.6 + j * 0.08,
                }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-sweep" />
          </div>
          {/* Card body */}
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-zinc-200/80 rounded-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer-sweep" />
            </div>
            <div className="h-3 w-1/2 bg-zinc-200/60 rounded-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer-sweep" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-black/[0.04]">
              <div className="flex gap-1">
                <div className="h-3 w-10 bg-zinc-200/60 rounded-sm" />
                <div className="h-3 w-10 bg-zinc-200/60 rounded-sm" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-5 w-5 bg-zinc-200/60 rounded-sm" />
                <div className="h-5 w-5 bg-zinc-200/60 rounded-sm" />
                <div className="h-5 w-5 bg-zinc-200/60 rounded-sm" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
