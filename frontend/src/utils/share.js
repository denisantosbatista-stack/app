// Serialização de paleta em URL — formato leve sem persistir no servidor.
// Ex: /studio?c=0D1B2A-1B263B-415A77-E0E1DD&n=Oceano%20Profundo&s=luxo

export function encodePaletteToUrl(palette, baseUrl) {
  const origin = baseUrl || window.location.origin;
  const colors = (palette.colors || [])
    .map((c) => (c.hex || "").replace("#", "").toUpperCase())
    .filter(Boolean)
    .join("-");
  const params = new URLSearchParams();
  if (colors) params.set("c", colors);
  if (palette.name) params.set("n", palette.name);
  if (palette.style) params.set("s", palette.style);
  return `${origin}/studio?${params.toString()}`;
}

export function decodePaletteFromSearch(search) {
  const sp = new URLSearchParams(search);
  const c = sp.get("c");
  if (!c) return null;
  const hexes = c.split("-").filter(Boolean).slice(0, 6);
  if (hexes.length < 2) return null;
  const roles = ["base", "accent", "highlight", "shadow", "extra1", "extra2"];
  const colors = hexes.map((h, i) => ({
    role: roles[i] || `c${i}`,
    hex: `#${h.replace(/[^0-9a-fA-F]/g, "").padEnd(6, "0").slice(0, 6)}`,
  }));
  return {
    id: `shared-${c}`,
    name: sp.get("n") || "Paleta Compartilhada",
    description: "Importada via link",
    colors,
    style: sp.get("s") || "luxo",
    tags: ["compartilhada"],
    source: "shared",
  };
}
