import pptxgen from "pptxgenjs";
import { Canvas, loadImage } from "skia-canvas";
import { mkdir } from "node:fs/promises";

const outDir = "docs";
const previewDir = "docs/2as-pitch-preview";
await mkdir(previewDir, { recursive: true });
const brandLogo = "public/brand/2as-logo-escuro.svg";

const W = 13.333;
const H = 7.5;
const PXW = 1920;
const PXH = 1080;
const S = PXW / W;

const C = {
  bg: "101114",
  surf: "17191F",
  card: "20232B",
  ink: "F4F1ED",
  sub: "C4B8AA",
  muted: "8D8379",
  dim: "5F5852",
  orange: "FF6600",
  orange2: "FF9A3D",
  cyan: "2FB7C6",
  green: "22C55E",
  red: "EF4444",
  amber: "FFC247",
};

const slides = [
  {
    kicker: "2AS INTELIGENCIA FINANCEIRA",
    title: "Clareza financeira para decidir antes do caixa apertar.",
    subtitle: "Marca, painel e metodologia comercial para transformar dados financeiros em agenda executiva.",
    kind: "cover",
  },
  {
    kicker: "POSICIONAMENTO",
    title: "A 2AS une consultoria financeira, dados e rotina de gestao.",
    subtitle: "O painel nao e apenas um dashboard: ele organiza o que precisa ser visto, explicado e decidido.",
    points: ["Caixa e runway", "DRE e margem", "Orcamento e desvios", "Operacao e riscos"],
  },
  {
    kicker: "PROBLEMA",
    title: "Empresas perdem velocidade quando o financeiro vira retrovisor.",
    subtitle: "Dados existem, mas ficam espalhados entre planilhas, sistema, banco e reunioes sem priorizacao.",
    points: ["Falta de previsao de liquidez", "Agenda de pagamentos sem hierarquia", "Resultado sem leitura operacional", "Decisoes tomadas tarde demais"],
  },
  {
    kicker: "SOLUCAO",
    title: "Um painel que converte dado em decisao.",
    subtitle: "A 2AS estrutura uma rotina executiva com sinais, diagnosticos e plano de acao.",
    flow: ["Capturar", "Consolidar", "Diagnosticar", "Decidir", "Acompanhar"],
  },
  {
    kicker: "PAINEL",
    title: "A pagina inicial vira a mesa de decisao financeira.",
    subtitle: "O executivo comeca pelas prioridades do dia e abre detalhes apenas quando precisa agir.",
    points: ["Prioridades financeiras de hoje", "Inteligencia de caixa e liquidez", "Diagnostico executivo 2AS", "Plano de acao financeiro"],
  },
  {
    kicker: "METODOLOGIA",
    title: "O trabalho se organiza em seis frentes conectadas.",
    subtitle: "Cada frente do painel responde uma pergunta de gestao.",
    matrix: [
      ["Executivo", "O que exige decisao hoje?"],
      ["Liquidez", "Quanto tempo o caixa sustenta?"],
      ["Governanca", "O que precisa ser pago, fechado ou controlado?"],
      ["Performance", "O resultado esta melhorando?"],
      ["Operacao", "Quais sinais explicam caixa e margem?"],
      ["Relatorios", "Como comunicar decisao e progresso?"],
    ],
  },
  {
    kicker: "COMERCIAL",
    title: "Pitch: inteligencia financeira como sistema operacional do negocio.",
    subtitle: "A oferta combina painel, diagnostico, ritual de gestao e relatorio executivo.",
    points: ["Implantacao do painel", "Diagnostico financeiro inicial", "Rotina semanal e mensal", "Relatorio para decisores"],
  },
  {
    kicker: "PROXIMO PASSO",
    title: "Implantar a 2AS como rotina de decisao.",
    subtitle: "A marca passa a assinar uma entrega clara: menos improviso financeiro, mais previsibilidade e acao.",
    points: ["Identidade aplicada ao painel", "Material comercial pronto", "Metodologia documentada", "Base para vender e operar"],
    kind: "closing",
  },
];

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "2AS Inteligencia Financeira";
pptx.company = "2AS Inteligencia Financeira";
pptx.subject = "Apresentacao da marca e pitch comercial";
pptx.title = "2AS Inteligencia Financeira";
pptx.lang = "pt-BR";
pptx.theme = {
  headFontFace: "Lato",
  bodyFontFace: "Lato",
  lang: "pt-BR",
};
pptx.defineLayout({ name: "LAYOUT_WIDE", width: W, height: H });

function hex(c) {
  return c.startsWith("#") ? c.slice(1) : c;
}

function logo(slide, x, y, scale = 1) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: 3.15 * scale,
    h: 0.88 * scale,
    rectRadius: 0.06,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF", transparency: 100 },
  });
  slide.addImage({ path: brandLogo, x: x + 0.08 * scale, y: y + 0.06 * scale, w: 2.98 * scale, h: 0.76 * scale });
}

function addFooter(slide, idx) {
  slide.addText("2AS Inteligencia Financeira", { x: 0.6, y: 7.05, w: 4, h: 0.16, fontSize: 7, color: C.dim, margin: 0 });
  slide.addText(String(idx).padStart(2, "0"), { x: 12.28, y: 7.02, w: 0.45, h: 0.18, fontSize: 8, color: C.dim, align: "right", margin: 0 });
}

function addBackground(slide, light = false) {
  slide.background = { color: light ? "F4F1ED" : C.bg };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: light ? "F4F1ED" : C.bg }, line: { transparency: 100 } });
  slide.addShape(pptx.ShapeType.rect, { x: 9.8, y: 0, w: 3.54, h: 7.5, fill: { color: light ? "FFFFFF" : C.surf, transparency: 8 }, line: { transparency: 100 } });
  slide.addShape(pptx.ShapeType.line, { x: 0.6, y: 6.78, w: 2.1, h: 0, line: { color: C.orange, width: 2 } });
}

function addTitle(slide, spec, light = false) {
  const ink = light ? C.bg : C.ink;
  const sub = light ? "403A35" : C.sub;
  slide.addText(spec.kicker, { x: 0.6, y: 0.58, w: 4.2, h: 0.18, fontSize: 7.5, bold: true, color: C.orange2, margin: 0, charSpace: 1.1 });
  slide.addText(spec.title, { x: 0.6, y: 0.98, w: 7.85, h: 1.28, fontSize: 29, bold: true, color: ink, margin: 0, breakLine: false, fit: "shrink" });
  slide.addText(spec.subtitle, { x: 0.62, y: 2.28, w: 7.35, h: 0.58, fontSize: 13.5, color: sub, margin: 0, breakLine: false, fit: "shrink" });
}

function drawBrandLine(slide) {
  slide.addShape(pptx.ShapeType.line, { x: 10.28, y: 1.02, w: 1.45, h: 0, line: { color: C.orange, width: 3 } });
  slide.addText("FINANCEIRO\nCOMO ROTINA\nDE DECISAO", { x: 10.24, y: 1.38, w: 1.75, h: 1.0, fontSize: 13, bold: true, color: C.ink, margin: 0, fit: "shrink" });
}

function createSlide(spec, idx) {
  const slide = pptx.addSlide();
  const light = idx === 6;
  addBackground(slide, light);
  if (spec.kind === "cover") {
    logo(slide, 0.62, 0.42, 1.18);
  } else {
    logo(slide, 10.05, 0.42, 0.64);
  }

  if (spec.kind === "cover") {
    slide.addText(spec.kicker, { x: 0.68, y: 1.64, w: 4.8, h: 0.2, fontSize: 8, bold: true, color: C.orange2, margin: 0, charSpace: 1.3 });
    slide.addText(spec.title, { x: 0.66, y: 2.07, w: 8.1, h: 1.72, fontSize: 36, bold: true, color: C.ink, margin: 0, fit: "shrink" });
    slide.addText(spec.subtitle, { x: 0.7, y: 4.08, w: 5.8, h: 0.62, fontSize: 14, color: C.sub, margin: 0, fit: "shrink" });
    slide.addShape(pptx.ShapeType.line, { x: 9.7, y: 0.76, w: 0, h: 5.95, line: { color: C.orange, width: 2, transparency: 15 } });
    slide.addText("INTELIGENCIA\nFINANCEIRA", { x: 10.1, y: 1.06, w: 2.55, h: 1.18, fontSize: 22, bold: true, color: C.ink, margin: 0, fit: "shrink" });
    slide.addText("Painel + diagnostico + rotina + relatorio", { x: 10.12, y: 2.6, w: 2.2, h: 0.35, fontSize: 10.5, color: C.sub, margin: 0 });
    slide.addShape(pptx.ShapeType.arc, { x: 10.1, y: 3.35, w: 1.95, h: 1.95, line: { color: C.orange, width: 5 }, adjustPoint: 0.24 });
    slide.addShape(pptx.ShapeType.arc, { x: 10.44, y: 3.7, w: 1.25, h: 1.25, line: { color: C.cyan, width: 4 }, adjustPoint: 0.24 });
  } else {
    addTitle(slide, spec, light);
    drawBrandLine(slide);
  }

  if (spec.points) {
    const startY = spec.kind === "cover" ? 5.25 : 3.35;
    const x = spec.kind === "closing" ? 0.78 : 0.72;
    spec.points.forEach((p, i) => {
      const y = startY + i * 0.55;
      slide.addShape(pptx.ShapeType.line, { x, y: y + 0.12, w: 0.28, h: 0, line: { color: [C.orange, C.cyan, C.green, C.amber][i % 4], width: 2 } });
      slide.addText(p, { x: x + 0.46, y, w: 5.8, h: 0.25, fontSize: 13.5, bold: i === 0, color: light ? C.bg : C.ink, margin: 0, fit: "shrink" });
    });
  }

  if (spec.flow) {
    spec.flow.forEach((p, i) => {
      const x = 0.76 + i * 1.72;
      slide.addShape(pptx.ShapeType.roundRect, { x, y: 3.7, w: 1.25, h: 0.64, rectRadius: 0.06, fill: { color: i % 2 ? C.card : C.surf }, line: { color: i === 3 ? C.orange : C.dim, transparency: i === 3 ? 0 : 35 } });
      slide.addText(p, { x: x + 0.12, y: 3.93, w: 1.02, h: 0.17, fontSize: 9.5, bold: true, color: C.ink, align: "center", margin: 0 });
      if (i < spec.flow.length - 1) slide.addShape(pptx.ShapeType.chevron, { x: x + 1.35, y: 3.91, w: 0.28, h: 0.22, fill: { color: C.orange, transparency: 20 }, line: { transparency: 100 } });
    });
    slide.addText("A entrega comercial da 2AS esta no ritual: toda semana o painel vira pauta, decisao e acompanhamento.", { x: 0.78, y: 4.9, w: 6.85, h: 0.46, fontSize: 13, color: C.sub, margin: 0, fit: "shrink" });
  }

  if (spec.matrix) {
    spec.matrix.forEach((row, i) => {
      const y = 3.15 + i * 0.52;
      slide.addText(row[0], { x: 0.75, y, w: 1.55, h: 0.18, fontSize: 10, bold: true, color: C.orange2, margin: 0 });
      slide.addShape(pptx.ShapeType.line, { x: 2.48, y: y + 0.1, w: 0.7, h: 0, line: { color: C.dim, width: 1 } });
      slide.addText(row[1], { x: 3.35, y: y - 0.02, w: 5.2, h: 0.24, fontSize: 11.8, color: C.bg, margin: 0, fit: "shrink" });
    });
  }

  addFooter(slide, idx);
  return slide;
}

slides.forEach((s, i) => createSlide(s, i + 1));
await pptx.writeFile({ fileName: `${outDir}/2as-inteligencia-financeira-pitch.pptx` });

function px(v) {
  return v * S;
}

function fillTextWrap(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

const previewLogo = await loadImage(brandLogo);

async function preview(spec, idx) {
  const canvas = new Canvas(PXW, PXH);
  const ctx = canvas.getContext("2d");
  const light = idx === 6;
  ctx.fillStyle = light ? "#f4f1ed" : "#101114";
  ctx.fillRect(0, 0, PXW, PXH);
  ctx.fillStyle = light ? "#ffffff" : "#17191f";
  ctx.globalAlpha = 0.92;
  ctx.fillRect(px(9.8), 0, px(3.54), PXH);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ff6600";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(px(0.6), px(6.78));
  ctx.lineTo(px(2.7), px(6.78));
  ctx.stroke();
  const logoX = px(spec.kind === "cover" ? 0.62 : 10.05);
  const logoY = px(0.42);
  const logoW = px(spec.kind === "cover" ? 3.7 : 2.02);
  const logoH = px(spec.kind === "cover" ? 1.04 : 0.56);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(logoX, logoY, logoW, logoH, 12);
  ctx.fill();
  ctx.drawImage(previewLogo, logoX + px(0.08), logoY + px(0.06), logoW - px(0.16), logoH - px(0.12));
  ctx.fillStyle = "#ff9a3d";
  ctx.font = "700 20px Lato, Arial";
  ctx.fillText(spec.kicker, px(0.68), px(spec.kind === "cover" ? 1.82 : 0.76));
  ctx.fillStyle = light ? "#101114" : "#f4f1ed";
  ctx.font = `700 ${spec.kind === "cover" ? 70 : 54}px Lato, Arial`;
  fillTextWrap(ctx, spec.title, px(0.66), px(spec.kind === "cover" ? 2.58 : 1.35), px(8.0), spec.kind === "cover" ? 78 : 62);
  ctx.fillStyle = light ? "#403a35" : "#c4b8aa";
  ctx.font = "400 28px Lato, Arial";
  fillTextWrap(ctx, spec.subtitle, px(0.7), px(spec.kind === "cover" ? 4.46 : 2.55), px(7.2), 38);
  if (spec.points) {
    const startY = px(spec.kind === "cover" ? 5.25 : 3.35);
    spec.points.forEach((p, i) => {
      const y = startY + i * px(0.55);
      ctx.strokeStyle = ["#ff6600", "#2fb7c6", "#22c55e", "#ffc247"][i % 4];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px(0.72), y + px(0.12));
      ctx.lineTo(px(1.0), y + px(0.12));
      ctx.stroke();
      ctx.fillStyle = light ? "#101114" : "#f4f1ed";
      ctx.font = `${i === 0 ? "700" : "400"} 28px Lato, Arial`;
      ctx.fillText(p, px(1.18), y + px(0.18));
    });
  }
  ctx.fillStyle = "#5f5852";
  ctx.font = "400 16px Lato, Arial";
  ctx.fillText("2AS Inteligencia Financeira", px(0.6), px(7.1));
  ctx.fillText(String(idx).padStart(2, "0"), px(12.34), px(7.1));
  await canvas.toFile(`${previewDir}/slide-${String(idx).padStart(2, "0")}.png`);
}

for (let i = 0; i < slides.length; i++) {
  await preview(slides[i], i + 1);
}

console.log(`Deck: ${outDir}/2as-inteligencia-financeira-pitch.pptx`);
console.log(`Previews: ${previewDir}/slide-01.png ... slide-${String(slides.length).padStart(2, "0")}.png`);
