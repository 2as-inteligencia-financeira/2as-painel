import { T } from "../theme";

export default function ReportActions({
  onHtml,
  onPdf,
  pdfLoading = false,
  htmlLabel = "Exportar HTML",
  pdfLabel = "Baixar PDF",
}) {
  return (
    <>
      {onHtml && (
        <button onClick={onHtml}
          style={{ padding:"7px 12px", borderRadius:6, border:`1px solid ${T.brd2}`, background:T.blue, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          {htmlLabel}
        </button>
      )}
      {onPdf && (
        <button onClick={onPdf} disabled={pdfLoading}
          style={{ padding:"7px 12px", borderRadius:6, border:`1px solid ${pdfLoading ? T.brd : T.red}`, background:pdfLoading ? T.surf : T.red, color:pdfLoading ? T.muted : "#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          {pdfLoading ? "Gerando PDF..." : pdfLabel}
        </button>
      )}
    </>
  );
}
