import { fmt } from "../../hooks/useSheets";
import { CA, MONO } from "../../theme";
import { CartesianGrid } from "recharts";

export const money = fmt.brl0;
export const AX = { fill: CA.tick, fontSize: 9, fontFamily: MONO };
export const GRD = <CartesianGrid strokeDasharray="2 4" stroke={CA.grid} vertical={false} />;
