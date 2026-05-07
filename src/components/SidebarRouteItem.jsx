import { memo, useCallback } from "react";
import { T } from "../theme";
import NavGlyph from "./NavGlyph.jsx";

function SidebarRouteItem({
  r,
  ativo,
  sidebar,
  tema,
  compact,
  isFavorite,
  onNavigate,
  onPreload,
  onToggleFavorite,
}) {
  const label = r.label.includes("(Labs)") ? r.label.replace(" (Labs)", "") : r.label;
  const isLabs = r.label.includes("Labs") || (r.source === "Integração");
  const glyphSize = sidebar ? (compact ? 15 : 16) : 17;

  const onEnter = useCallback((e) => {
    onPreload(r);
    if (!ativo) {
      e.currentTarget.style.background = tema === "light" ? "rgba(217,119,6,0.06)" : "rgba(255,255,255,0.03)";
      e.currentTarget.style.color = T.sub;
    }
  }, [r, ativo, onPreload, tema]);

  const onLeave = useCallback((e) => {
    if (!ativo) {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = T.muted;
    }
  }, [ativo]);

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={() => onNavigate(r.id)}
        aria-current={ativo ? "page" : undefined}
        onFocus={() => onPreload(r)}
        title={r.label}
        style={{
          flex: 1,
          minWidth: 0,
          background: ativo ? "rgba(245,158,11,0.13)" : "transparent",
          border: "none",
          borderLeft: `2px solid ${ativo ? T.blue : "transparent"}`,
          color: ativo ? T.blue2 : T.muted,
          cursor: "pointer",
          padding: sidebar ? (compact ? "6px 8px 6px 10px" : "7px 8px 7px 10px") : "10px 0",
          textAlign: "left",
          fontSize: compact ? 10 : 10.5,
          fontWeight: ativo ? 600 : 400,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: sidebar ? "flex-start" : "center",
          gap: sidebar ? 8 : 0,
          transition: "background-color 0.1s, color 0.1s, border-color 0.1s",
          fontFamily: "inherit",
        }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <span style={{
          width: 22,
          minWidth: 22,
          height: 22,
          marginTop: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: ativo ? T.blue : T.dim,
          opacity: ativo ? 1 : 0.92,
        }}>
          <NavGlyph routeId={r.id} size={glyphSize} />
        </span>
        {sidebar && (
          <>
            <span style={{
              flex: 1,
              minWidth: 0,
              lineHeight: 1.28,
              whiteSpace: "normal",
              wordBreak: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: compact ? 2 : 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>{label}</span>
            {isLabs && (
              <span style={{
                alignSelf: "flex-start",
                marginTop: 1,
                flexShrink: 0,
                fontSize: 7,
                fontWeight: 700,
                color: T.dim,
                border: `1px solid ${T.brd}`,
                borderRadius: 4,
                padding: "2px 4px",
                letterSpacing: "0.04em",
              }}>API</span>
            )}
          </>
        )}
      </button>
      {sidebar && (
        <button
          type="button"
          onClick={() => onToggleFavorite(r.id)}
          title={isFavorite ? "Remover dos favoritos" : "Fixar nos favoritos"}
          style={{
            width: 28,
            border: "none",
            borderLeft: `1px solid ${T.brd}`,
            background: ativo ? "rgba(245,158,11,0.08)" : "transparent",
            color: isFavorite ? T.amb : T.dim,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}

export default memo(SidebarRouteItem);
