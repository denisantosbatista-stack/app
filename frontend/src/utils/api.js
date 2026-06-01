// api.js — função única que TODAS as gerações IA devem usar.
// Implementa: backoff exponencial (2s/4s/8s), AbortController com timeout,
// e ApiError com `tipo` categorizado para a UI distinguir erro de saldo,
// limite (rate-limit), timeout, rede e servidor.

const API_BASE = `${(process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL)}/api`;

export class ApiError extends Error {
  constructor(message, { tipo, status, detail } = {}) {
    super(message);
    this.name = "ApiError";
    this.tipo = tipo; // 'limite' | 'saldo' | 'timeout' | 'rede' | 'servidor' | 'config'
    this.status = status;
    this.detail = detail;
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Callback padrão para o botão "Liberar gerações ilimitadas" do AIErrorState.
 * Como monetização ainda está pausada, exibimos instruções claras para o usuário
 * recarregar o Universal Key da Emergent (que alimenta todas as gerações IA).
 */
export function abrirUpgradePadrao() {
  const evt = new CustomEvent("lindart:open-upgrade-info");
  window.dispatchEvent(evt);
}

/**
 * Faz POST JSON com retry exponencial + timeout via AbortController.
 * @param {string} path — caminho relativo começando com '/' (ex.: '/ai/generate-palette')
 * @param {object} body — payload JSON
 * @param {object} opts — { maxTentativas, timeoutMs }
 */
export async function chamarIA(path, body, { maxTentativas = 3, timeoutMs = 60000 } = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      // 429 = rate-limit. Backoff e retry.
      if (resp.status === 429) {
        if (tentativa < maxTentativas - 1) {
          await espera(2000 * 2 ** tentativa);
          continue;
        }
        throw new ApiError("Muitas gerações ao mesmo tempo. Tente em alguns segundos.", {
          tipo: "limite",
          status: 429,
        });
      }

      // 402/403 = saldo Universal Key esgotado / sem autorização
      if (resp.status === 402 || resp.status === 403) {
        let detail;
        try {
          detail = (await resp.json())?.detail;
        } catch (_) {
          /* noop */
        }
        throw new ApiError("Saldo de gerações esgotado.", {
          tipo: "saldo",
          status: resp.status,
          detail,
        });
      }

      // 503 = recurso/integração indisponível (ex.: FAL_KEY ausente).
      // Erro terminal de configuração — NÃO faz retry, mostra mensagem direta.
      if (resp.status === 503) {
        let detail;
        try {
          detail = (await resp.json())?.detail;
        } catch (_) {
          /* noop */
        }
        const msg =
          typeof detail === "string"
            ? detail
            : "Integração indisponível. Verifique a configuração do servidor.";
        throw new ApiError(msg, {
          tipo: "config",
          status: 503,
          detail,
        });
      }

      if (resp.status >= 500) {
        // 5xx pode ser transitório → retry com backoff
        if (tentativa < maxTentativas - 1) {
          await espera(2000 * 2 ** tentativa);
          continue;
        }
        let detail;
        try {
          detail = (await resp.json())?.detail;
        } catch (_) {
          /* noop */
        }
        throw new ApiError("O servidor falhou. Tente novamente.", {
          tipo: "servidor",
          status: resp.status,
          detail,
        });
      }

      if (!resp.ok) {
        let detail;
        try {
          detail = (await resp.json())?.detail;
        } catch (_) {
          /* noop */
        }
        throw new ApiError("Não foi possível completar a geração.", {
          tipo: "servidor",
          status: resp.status,
          detail,
        });
      }

      return await resp.json();
    } catch (err) {
      clearTimeout(timer);

      if (err?.name === "AbortError") {
        throw new ApiError("A geração demorou demais. Tente novamente.", { tipo: "timeout" });
      }
      if (err instanceof ApiError) throw err;

      // Erro de rede genérico → retry com backoff
      if (tentativa < maxTentativas - 1) {
        await espera(2000 * 2 ** tentativa);
        continue;
      }
      throw new ApiError("Sem conexão. Verifique sua internet.", { tipo: "rede" });
    }
  }

  // Em teoria inalcançável (todos os caminhos retornam ou lançam dentro do for),
  // mas mantemos para satisfazer análise estática.
  throw new ApiError("Falha desconhecida.", { tipo: "servidor" });
}

// ============================================================
// authFetch — helper centralizado para chamadas autenticadas.
// Anexa automaticamente o Bearer token (mesma chave usada por AuthContext.jsx)
// e normaliza URLs relativas a /api. Em 401, dispara o evento global
// 'lindart:auth-expired' que o AuthContext escuta para deslogar a sessão.
// ============================================================
const TOKEN_KEY = "lindart.auth.token";

function buildUrl(path) {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/")) {
    // já vem com /api — usar mesmo origin do API_BASE
    const origin = API_BASE.replace(/\/api$/, "");
    return `${origin}${path}`;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

/**
 * Wrapper de fetch que injeta Authorization: Bearer <token> quando há sessão.
 * Mantém a mesma API do fetch nativo (mesmos argumentos, mesmo Response).
 *
 * @param {string} path  caminho relativo (ex.: '/feed') ou URL absoluta
 * @param {RequestInit} [options]  opções do fetch nativo
 * @returns {Promise<Response>}
 */
export async function authFetch(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Default JSON content-type se houver body objeto e o header não foi setado
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(buildUrl(path), {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  if (resp.status === 401 && token) {
    // Token inválido/expirado — limpa e notifica o app
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (_) {
      /* noop */
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lindart:auth-expired"));
    }
  }

  return resp;
}

/**
 * authFetchJson — atalho que já parseia JSON e lança Error com a detail do backend.
 */
export async function authFetchJson(path, options = {}) {
  const resp = await authFetch(path, options);
  let data = null;
  try {
    data = await resp.json();
  } catch (_) {
    /* sem corpo */
  }
  if (!resp.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d) => d?.msg || JSON.stringify(d)).join(" · ")
      : typeof detail === "string"
      ? detail
      : `HTTP ${resp.status}`;
    const err = new Error(msg);
    err.status = resp.status;
    err.detail = detail;
    throw err;
  }
  return data;
}
