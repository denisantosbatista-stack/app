// api.js — função única que TODAS as gerações IA devem usar.
// Implementa: backoff exponencial (2s/4s/8s), AbortController com timeout,
// e ApiError com `tipo` categorizado para a UI distinguir erro de saldo,
// limite (rate-limit), timeout, rede e servidor.

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
