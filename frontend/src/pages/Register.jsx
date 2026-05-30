import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useAuth, formatApiErrorDetail } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    handle: "",
    email: "",
    password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        handle: form.handle.trim(),
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
      data-testid="register-page"
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
          <h1 className="font-serif text-4xl text-bone mb-2">Criar conta</h1>
          <p className="text-ink-muted text-sm">Comece sua jornada na resina premium</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-bone/[0.03] border border-bone/10 rounded-2xl p-8 backdrop-blur-sm space-y-5"
          data-testid="register-form"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-bone/80 text-xs tracking-[0.2em] uppercase">
                Nome
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="bg-ink border-bone/10 text-bone h-11"
                placeholder="Seu nome"
                data-testid="register-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle" className="text-bone/80 text-xs tracking-[0.2em] uppercase">
                @handle
              </Label>
              <Input
                id="handle"
                value={form.handle}
                onChange={(e) => update("handle", e.target.value.toLowerCase())}
                className="bg-ink border-bone/10 text-bone h-11"
                placeholder="seunome"
                data-testid="register-handle-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-bone/80 text-xs tracking-[0.2em] uppercase">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="bg-ink border-bone/10 text-bone h-11"
              placeholder="voce@exemplo.com"
              data-testid="register-email-input"
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
                minLength={6}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="bg-ink border-bone/10 text-bone h-11 pr-11"
                placeholder="Mínimo 6 caracteres"
                data-testid="register-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-bone"
                tabIndex={-1}
                data-testid="register-toggle-password-btn"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              data-testid="register-error"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gold hover:bg-gold/90 text-ink font-medium tracking-wide"
            data-testid="register-submit-btn"
          >
            {loading ? "Criando..." : "Criar conta"}
          </Button>

          <div className="text-center pt-2 text-sm text-ink-muted">
            Já tem conta?{" "}
            <Link
              to="/login"
              className="text-gold hover:underline"
              data-testid="register-go-to-login-link"
            >
              Entrar
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
