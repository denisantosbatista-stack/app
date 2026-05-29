import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function paletteToCSS(palette) {
  const vars = palette.colors
    .map((c, i) => `  --color-${c.role || `c${i + 1}`}: ${c.hex};`)
    .join("\n");
  return `:root {\n${vars}\n}\n\n/* ${palette.name} — ${palette.description || ""} */`;
}

export function paletteToTailwind(palette) {
  const colors = palette.colors.reduce((acc, c, i) => {
    acc[c.role || `c${i + 1}`] = c.hex;
    return acc;
  }, {});
  const json = JSON.stringify({ colors }, null, 2);
  return `// tailwind.config.js (extend.colors)\nmodule.exports = {\n  theme: {\n    extend: {\n      ${json
    .split("\n")
    .map((l, i) => (i === 0 ? l : "      " + l))
    .join("\n")}\n    }\n  }\n}`;
}

export function paletteToJSON(palette) {
  return JSON.stringify(
    {
      name: palette.name,
      description: palette.description,
      style: palette.style,
      tags: palette.tags,
      colors: palette.colors,
    },
    null,
    2
  );
}

export function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPNG(element, filename) {
  if (!element) throw new Error("Elemento de captura indisponível");
  const canvas = await html2canvas(element, {
    backgroundColor: "#0A0A0A",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadPDF(palette, element) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Background
  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, pageW, pageH, "F");

  // Title
  pdf.setTextColor(212, 175, 55);
  pdf.setFontSize(28);
  pdf.text(palette.name, 20, 30);

  pdf.setTextColor(200, 200, 200);
  pdf.setFontSize(12);
  pdf.text(palette.description || "", 20, 40);

  // Color swatches
  const startY = 60;
  const swatchW = (pageW - 40 - 30) / palette.colors.length;
  palette.colors.forEach((c, i) => {
    const x = 20 + i * (swatchW + 10);
    const { r, g, b } = hexToRgb(c.hex);
    pdf.setFillColor(r, g, b);
    pdf.rect(x, startY, swatchW, 60, "F");
    pdf.setTextColor(247, 247, 247);
    pdf.setFontSize(10);
    pdf.text(c.hex.toUpperCase(), x, startY + 75);
    pdf.setFontSize(9);
    pdf.setTextColor(160, 160, 160);
    pdf.text(c.name || "", x, startY + 82);
    pdf.text(c.role || "", x, startY + 89);
  });

  // Footer
  pdf.setTextColor(120, 120, 120);
  pdf.setFontSize(9);
  pdf.text(`LindArt — Studio de Resina Premium · ${new Date().toLocaleDateString("pt-BR")}`, 20, pageH - 12);

  pdf.save(`${palette.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

function hexToRgb(hex) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
}
