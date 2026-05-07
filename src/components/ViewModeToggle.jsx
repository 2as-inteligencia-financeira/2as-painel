import { T } from "../theme";

export default function ViewModeToggle({ value, onChange, modes = ["Executivo", "Analítico"] }) {
  return (
    <div style={{ display:"flex", gap:4, padding:3, border:`1px solid ${T.brd}`, borderRadius:7, background:T.bg }}>
      {modes.map(mode => {
        const active = value === mode;
        return (
          <button key={mode} type="button" onClick={() => onChange(mode)}
            style={{ padding:"5px 10px", borderRadius:5, border:"none", background:active ? T.surf : "transparent", color:active ? T.blue2 : T.muted, fontSize:11, fontWeight:active ? 700 : 500, cursor:"pointer", fontFamily:"inherit" }}>
            {mode}
          </button>
        );
      })}
    </div>
  );
}
