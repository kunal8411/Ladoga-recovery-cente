"use client";

import { createContext, useContext } from "react";

export const PendingPathContext = createContext<string | null>(null);

export function usePendingPath() {
  return useContext(PendingPathContext);
}
