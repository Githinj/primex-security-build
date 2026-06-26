"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Company } from "@/lib/types";

interface ScopeContextValue {
  scope: string;
  scopeCompanyId: string | null;
  setScope: (companyId: string | null, name: string) => void;
  companies: Company[];
}

const ScopeContext = createContext<ScopeContextValue>({
  scope: "All Companies",
  scopeCompanyId: null,
  setScope: () => {},
  companies: [],
});

export function ScopeProvider({
  companies,
  children,
}: {
  companies: Company[];
  children: ReactNode;
}) {
  const [scope, setScopeName] = useState("All Companies");
  const [scopeCompanyId, setScopeCompanyId] = useState<string | null>(null);

  function setScope(companyId: string | null, name: string) {
    setScopeCompanyId(companyId);
    setScopeName(name);
  }

  return (
    <ScopeContext.Provider value={{ scope, scopeCompanyId, setScope, companies }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  return useContext(ScopeContext);
}
