import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getJson } from "./api";
import type { SeasonSnapshot } from "./types";

type SeasonsState = {
  seasons: SeasonSnapshot[];
  loading: boolean;
};

const SeasonsContext = createContext<SeasonsState>({ seasons: [], loading: true });

export function SeasonsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SeasonsState>({ seasons: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    getJson<{ seasons: SeasonSnapshot[] }>("/api/seasons")
      .then((data) => {
        if (!cancelled) setState({ seasons: data.seasons, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ seasons: [], loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SeasonsContext.Provider value={state}>{children}</SeasonsContext.Provider>;
}

export function useSeasons(): SeasonsState {
  return useContext(SeasonsContext);
}
