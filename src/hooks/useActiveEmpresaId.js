import { useEffect, useState } from "react";
import { getActiveEmpresaId, onActiveEmpresaChange } from "../empresas/2AS-inteligencia-financeira/empresaAtiva";

/** Mantém o id da empresa ativa sincronizado com localStorage e com o menu (CustomEvent). */
export function useActiveEmpresaId() {
  const [empresaId, setEmpresaId] = useState(() => getActiveEmpresaId());
  useEffect(() => onActiveEmpresaChange(setEmpresaId), []);
  return empresaId;
}
