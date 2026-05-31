import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Guard de rotas privadas.
 *
 * Comportamento:
 *  - Enquanto a sessão é resolvida (`loading`), não renderiza nada
 *    para evitar flash de conteúdo protegido.
 *  - Se o usuário não está autenticado, redireciona para
 *    `/login?next={pathname}` com toast "Faça login para acessar".
 *  - Caso contrário, renderiza os filhos normalmente.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const shouldRedirect = !loading && !isAuthenticated;

  useEffect(() => {
    if (shouldRedirect) {
      toast.error("Faça login para acessar", {
        id: "require-auth-toast",
      });
    }
  }, [shouldRedirect]);

  if (loading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center text-ink-muted text-xs tracking-[0.22em] uppercase"
        data-testid="require-auth-loading"
      >
        Verificando sessão…
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search || ""}`;
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(next)}`}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}
