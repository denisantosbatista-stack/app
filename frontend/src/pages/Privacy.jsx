import { Link } from "react-router-dom";
import { ShieldCheck, Mail, Cookie, FileText, UserCheck, Globe2 } from "lucide-react";
import "./Privacy.css";

const SECTIONS = [
  {
    icon: FileText,
    title: "1. Quem somos",
    body: (
      <p>
        O <strong>LindArt</strong> é um estúdio digital dedicado à arte em resina,
        oferecendo ferramentas de paletas, calculadora de precificação, biblioteca
        criativa, mentoria com IA e visualização 3D. Esta Política descreve como
        coletamos, usamos e protegemos seus dados em conformidade com a{" "}
        <strong>LGPD (Lei nº 13.709/2018)</strong>.
      </p>
    ),
  },
  {
    icon: UserCheck,
    title: "2. Dados que coletamos",
    body: (
      <ul>
        <li><strong>Identificação:</strong> nome, e-mail e handle público (opcional).</li>
        <li><strong>Conteúdo gerado:</strong> paletas salvas, peças do estúdio, mockups e textos.</li>
        <li><strong>Uso técnico:</strong> IP, navegador, idioma e ações dentro do app, exclusivamente para segurança e melhorias.</li>
      </ul>
    ),
  },
  {
    icon: ShieldCheck,
    title: "3. Como usamos seus dados",
    body: (
      <ul>
        <li>Habilitar funcionalidades como salvar paletas, gerar mockups e mentoria IA.</li>
        <li>Prevenir abusos, fraudes e proteger a integridade do serviço.</li>
        <li>Comunicar atualizações relevantes do produto (com seu consentimento).</li>
        <li><strong>Nunca</strong> vendemos seus dados a terceiros.</li>
      </ul>
    ),
  },
  {
    icon: Globe2,
    title: "4. Compartilhamento com terceiros",
    body: (
      <p>
        Utilizamos parceiros tecnológicos sob acordos de confidencialidade para
        viabilizar geração de IA (Anthropic Claude, Google Gemini, OpenAI Whisper)
        e infraestrutura de nuvem. Cada parceiro processa apenas o necessário
        para executar a função solicitada e segue políticas próprias de privacidade.
      </p>
    ),
  },
  {
    icon: Cookie,
    title: "5. Cookies e armazenamento local",
    body: (
      <p>
        Usamos <strong>localStorage</strong> para preservar suas preferências,
        paletas salvas e sessões. Não utilizamos cookies de rastreamento publicitário
        de terceiros. Você pode limpar esses dados a qualquer momento pelo seu navegador.
      </p>
    ),
  },
  {
    icon: UserCheck,
    title: "6. Seus direitos (LGPD)",
    body: (
      <ul>
        <li>Acesso, correção e portabilidade dos seus dados.</li>
        <li>Eliminação dos dados quando não houver mais necessidade legal de retenção.</li>
        <li>Revogação do consentimento e oposição ao tratamento.</li>
        <li>Informação sobre uso compartilhado com terceiros.</li>
      </ul>
    ),
  },
  {
    icon: Mail,
    title: "7. Contato e encarregado de dados",
    body: (
      <p>
        Para exercer seus direitos ou tirar dúvidas sobre esta Política, escreva
        para <a href="mailto:contato@lindart.app" className="privacy-link">contato@lindart.app</a>.
        Respondemos em até <strong>15 dias úteis</strong>.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <div className="privacy-root" data-testid="privacy-page">
      <div className="privacy-hero">
        <span className="privacy-eyebrow">LindArt · Documento legal</span>
        <h1 className="privacy-title">
          Política de <span className="privacy-accent">Privacidade</span>
        </h1>
        <p className="privacy-lead">
          Transparência, segurança e respeito à sua autoria. Esta política está
          alinhada à Lei Geral de Proteção de Dados (LGPD) brasileira.
        </p>
        <div className="privacy-meta">
          <span>Última atualização: <strong>Fevereiro de 2026</strong></span>
          <span className="privacy-divider">·</span>
          <span>Versão 1.0</span>
        </div>
      </div>

      <div className="privacy-grid">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <article key={i} className="privacy-card" data-testid={`privacy-section-${i}`}>
              <div className="privacy-card-icon">
                <Icon className="w-4 h-4" />
              </div>
              <h2 className="privacy-card-title">{s.title}</h2>
              <div className="privacy-card-body">{s.body}</div>
            </article>
          );
        })}
      </div>

      <div className="privacy-footer">
        <Link to="/" className="privacy-link" data-testid="privacy-home-link">
          ← Voltar para o ateliê
        </Link>
        <span className="privacy-tag">LindArt © 2026 · Todos os direitos reservados</span>
      </div>
    </div>
  );
}
