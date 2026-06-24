import { useContext } from "react";
import { WmsContext } from "./Contexts_type_provider/index";
import type { WmsContextProps } from "./Contexts_type_provider/index";

export const useWms = (): WmsContextProps => {
  const context = useContext(WmsContext);
  if (!context) throw new Error("useWms harus digunakan di dalam WmsProvider");
  return context;
};
