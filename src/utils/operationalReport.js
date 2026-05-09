import { fmt } from "../hooks/useSheets";
import { getEmpresaById } from "../empresas/2AS-inteligencia-financeira/empresas";
import { getActiveEmpresaId } from "../empresas/2AS-inteligencia-financeira/empresaAtiva";

const esc = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function currentReportBrand() {
  const empresa = getEmpresaById(getActiveEmpresaId());
  return {
    name: empresa.nome,
    brand: empresa.nome.toUpperCase(),
  };
}

export function downloadHtml(filename, html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function waitAssets(doc) {
  await doc.fonts?.ready?.catch?.(() => {});
  const images = Array.from(doc.images || []);
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return img.decode?.().catch(() => {}) || Promise.resolve();
  }));
}

function extractHtmlParts(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return {
    styles: Array.from(parsed.head.querySelectorAll("style")).map(style => style.textContent || "").join("\n"),
    page: parsed.querySelector(".page")?.outerHTML || parsed.body.innerHTML,
  };
}

export async function downloadPdf(filename, html, options = {}) {
  const { default: html2pdf } = await import("html2pdf.js");
  const { styles, page } = extractHtmlParts(html);
  const style = document.createElement("style");
  style.textContent = `${styles}
    .pdf-export .page { padding: 28px 32px 34px !important; }
    .pdf-export .financial-report .top { display: block !important; width: 100% !important; padding-bottom: 12px !important; margin-bottom: 16px !important; }
    .pdf-export .financial-report .top > div:first-child { display: block !important; width: 100% !important; max-width: none !important; min-width: 0 !important; }
    .pdf-export .financial-report .brand,
    .pdf-export .financial-report h1,
    .pdf-export .financial-report .meta div { white-space: nowrap !important; }
    .pdf-export .financial-report h1 { display: block !important; width: 100% !important; max-width: none !important; font-size: 14px !important; line-height: 1.15 !important; }
    .pdf-export .financial-report .meta {
      display: flex !important;
      justify-content: space-between !important;
      gap: 18px !important;
      min-width: 0 !important;
      margin-top: 8px !important;
      text-align: left !important;
      font-size: 7.8px !important;
    }
    .pdf-export .financial-report .meta div { flex: 0 0 auto !important; }
    .pdf-export .financial-report .meta div:last-child { margin-left: auto !important; }
    .pdf-export .financial-report .footer {
      margin-top: 12px !important;
      padding-top: 8px !important;
      font-size: 9px !important;
      gap: 18px !important;
      white-space: nowrap !important;
    }
    .pdf-export h2 { margin: 20px 0 8px !important; }
    .pdf-export table { font-size: 10px !important; line-height: 1.32 !important; }
    .pdf-export .analytic-relation table { font-size: 8.5px !important; line-height: 1.18 !important; }
    .pdf-export .analytic-relation th,
    .pdf-export .analytic-relation td { padding: 4px 5px !important; }
    .pdf-export th,
    .pdf-export td { padding-top: 6px !important; padding-bottom: 6px !important; }
    .pdf-export .card { padding: 10px !important; }
    .pdf-export .grid { gap: 10px !important; margin-bottom: 10px !important; }
    .pdf-export .payables-table { font-size: 10px !important; }
    .pdf-export .payables-table + .payables-table { margin-top: 10px !important; }
    .pdf-export .payables-table th,
    .pdf-export .payables-table td { padding: 5px 6px !important; line-height: 1.3 !important; }
    .pdf-export .financial-report .payables-section { break-before: page !important; page-break-before: always !important; }
    .pdf-export .financial-report .next-seven-section { break-before: page !important; page-break-before: always !important; }
    .pdf-export .financial-report .next-seven-section .chart-box { margin-top: 6px !important; }
    .pdf-export .financial-report .period-chart-section { break-before: page !important; page-break-before: always !important; }
    .pdf-export .financial-report .period-chart-section .chart-box { margin-top: 6px !important; }
    .pdf-export .financial-report .area-exec-section { break-before: page !important; page-break-before: always !important; }
    .pdf-export .financial-report .area-exec-table { font-size: 9px !important; line-height: 1.22 !important; }
    .pdf-export .financial-report .area-exec-table th,
    .pdf-export .financial-report .area-exec-table td { padding: 4px 6px !important; }
    .pdf-export .financial-report.synthetic-report .dre-detail-table {
      font-size: 8.5px !important;
      line-height: 1.16 !important;
    }
    .pdf-export .financial-report.synthetic-report .dre-detail-table th,
    .pdf-export .financial-report.synthetic-report .dre-detail-table td {
      padding: 3px 5px !important;
    }
  `;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "1120px";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.className = "pdf-export";
  host.setAttribute("aria-hidden", "true");
  // MEDIO-03: page vem de buildOperationalReportHtml() com todos os valores
  // escapados via esc(). Após DOMParser, scripts são removidos na serialização.
  host.innerHTML = page;

  document.head.appendChild(style);
  document.body.appendChild(host);

  try {
    await waitAssets(document);

    const element = host.querySelector(".page") || host;
    await html2pdf()
      .set({
        filename,
        margin: [8, 8, 8, 8],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: Math.max(element.scrollWidth, 980),
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".card", ".summary", ".grid3", ".comment", "tr"],
        },
        ...options,
      })
      .from(element)
      .save();
  } finally {
    host.remove();
    style.remove();
  }
}

function rowsToTable(rows = [], columns = []) {
  return `
    <table>
      <thead>
        <tr>${columns.map(col => `<th class="${col.num ? "num" : ""}">${esc(col.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.length ? rows.map(row => `
          <tr>
            ${columns.map(col => {
              const raw = typeof col.value === "function" ? col.value(row) : row[col.key];
              const value = col.money ? fmt.brl(raw || 0) : raw;
              return `<td class="${col.num ? "num" : ""} ${col.money ? "money" : ""}">${esc(value)}</td>`;
            }).join("")}
          </tr>
        `).join("") : `<tr><td colspan="${columns.length}">Sem dados para o filtro atual.</td></tr>`}
      </tbody>
    </table>
  `;
}

function simpleSection(section) {
  return `
    <section>
      <h2>${esc(section.title)}</h2>
      ${rowsToTable(section.rows, section.columns)}
    </section>
  `;
}

export function buildOperationalReportHtml({
  title,
  subtitle,
  generatedAt = new Date(),
  empresa = currentReportBrand(),
  filters = [],
  kpis = [],
  sections = [],
  rows = [],
  columns = [],
  totalLabel = "Total",
  totalValue = 0,
}) {
  const visibleFilters = filters.filter(f => {
    const label = String(f.label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const value = String(f.value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return !(label === "periodo" && value === "todo o periodo");
  });
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} - ${esc(empresa.name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f1ed; color: #17191f; font-family: 'Lato', system-ui, sans-serif; font-size: 12px; line-height: 1.45; }
    .page { max-width: 1060px; margin: 0 auto; padding: 34px 38px 46px; background: #fff; }
    .top { border-bottom: 3px solid #f59e0b; padding-bottom: 18px; margin-bottom: 18px; display: flex; justify-content: space-between; gap: 24px; }
    .brand { color: #f59e0b; font-size: 18px; font-weight: 700; margin: 0 0 4px; }
    h1 { margin: 0; font-size: 24px; font-weight: 600; color: #17191f; }
    h2 { margin: 24px 0 10px; font-size: 13px; font-weight: 700; color: #17191f; text-transform: uppercase; }
    .meta { color: #5f5852; text-align: right; }
    .note { color: #5f5852; margin-top: 5px; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 18px; }
    .pill { border: 1px solid #ddd7d1; border-radius: 8px; padding: 7px 10px; background: #faf8f6; color: #5f5852; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .card { border: 1px solid #ddd7d1; border-radius: 8px; padding: 12px; background: #faf8f6; }
    section, .card, .total { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .label { color: #5f5852; font-size: 10px; text-transform: uppercase; margin-bottom: 5px; }
    .value { font-size: 17px; font-weight: 700; color: #17191f; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 8px 9px; border-bottom: 1px solid #eee7e0; text-align: left; vertical-align: top; }
    th { color: #5f5852; font-size: 10px; text-transform: uppercase; font-weight: 700; background: #faf8f6; }
    .analytic-relation table { font-size: 10px; line-height: 1.28; }
    .analytic-relation th, .analytic-relation td { padding: 6px 7px; }
    .num { text-align: right; white-space: nowrap; }
    .money { color: #dc2626; font-weight: 700; }
    .total { display: flex; justify-content: space-between; gap: 16px; border: 1px solid #ddd7d1; border-radius: 8px; padding: 12px; background: #fff7ed; margin: 16px 0; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd7d1; color: #5f5852; font-size: 11px; display: flex; justify-content: space-between; }
    @page { size: A4; margin: 10mm; }
    @media print { body { background: #fff; } .page { padding: 20px; max-width: none; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div>
        <p class="brand">${esc(empresa.brand)}</p>
        <h1>${esc(title)}</h1>
        <p class="note">${esc(subtitle)}</p>
      </div>
      <div class="meta">
        <div>Emitido em ${generatedAt.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}</div>
        <div>Anderson Almeida • Head of Operations & Finance</div>
      </div>
    </section>

    <div class="filters">
      ${visibleFilters.map(f => `<span class="pill">${esc(f.label)}: <strong>${esc(f.value)}</strong></span>`).join("")}
    </div>

    <section class="grid">
      ${kpis.map(kpi => `
        <div class="card">
          <div class="label">${esc(kpi.label)}</div>
          <div class="value">${esc(kpi.value)}</div>
          ${kpi.sub ? `<div class="note">${esc(kpi.sub)}</div>` : ""}
        </div>
      `).join("")}
    </section>

    <div class="total">
      <strong>${esc(totalLabel)}</strong>
      <strong>${fmt.brl(totalValue)}</strong>
    </div>

    ${sections.map(simpleSection).join("")}

    <section class="analytic-relation">
      <h2>Relação analítica</h2>
      ${rowsToTable(rows, columns)}
    </section>

    <section class="footer">
      <span>${esc(empresa.name)} • Relatório operacional</span>
      <span>Fonte: filtros aplicados no painel</span>
    </section>
  </main>
</body>
</html>`;
}
