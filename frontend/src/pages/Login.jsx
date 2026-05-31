import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useAuth, formatApiErrorDetail } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Aceita ?next=/rota (preferencial) e location.state.from (fallback)
  const nextParam = new URLSearchParams(location.search).get("next");
  const from =
    (nextParam && nextParam.startsWith("/") ? nextParam : null) ||
    location.state?.from?.pathname ||
    "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
      data-testid="login-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 text-gold">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] tracking-[0.3em] uppercase">LindArt</span>
          </div>
          <h1 className="font-serif text-4xl text-bone mb-2">Bem-vinda de volta</h1>
          <p className="text-ink-muted text-sm">Acesse seu Studio de Resina</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-bone/[0.03] border border-bone/10 rounded-2xl p-8 backdrop-blur-sm space-y-5"
          data-testid="login-form"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-bone/80 text-xs tracking-[0.2em] uppercase">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-ink border-bone/10 text-bone placeholder:text-ink-muted/60 h-11"
              placeholder="voce@exemplo.com"
              data-testid="login-email-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-bone/80 text-xs tracking-[0.2em] uppercase">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-ink border-bone/10 text-bone h-11 pr-11"
                placeholder="••••••••"
                data-testid="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-bone"
                tabIndex={-1}
                data-testid="login-toggle-password-btn"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gold hover:bg-gold/90 text-ink font-medium tracking-wide"
            data-testid="login-submit-btn"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <div className="text-center pt-2 text-sm text-ink-muted">
            Ainda não tem conta?{" "}
            <Link
              to="/register"
              className="text-gold hover:underline"
              data-testid="login-go-to-register-link"
            >
              Criar conta
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
