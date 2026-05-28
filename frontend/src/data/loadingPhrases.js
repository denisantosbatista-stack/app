// Frases motivacionais para estados de loading da IA
export const LOADING_PHRASES = [
  "Misturando pigmentos cósmicos…",
  "Pintando com luz dourada…",
  "Capturando a essência da resina…",
  "Refinando harmonia cromática…",
  "Dissolvendo cores em poesia…",
  "Polindo cada nuance ao limite…",
  "Convidando o ouro à festa…",
  "Esculpindo gradientes invisíveis…",
  "Atravessando o espectro premium…",
  "Despertando paleta dos cristais…",
  "Tecendo veios líquidos de cor…",
  "Selando luxo em quatro tons…",
];

export function randomPhrase() {
  return LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
}
