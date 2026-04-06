import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export interface SchoolBranch {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  principal: string;
}

interface SchoolContextValue {
  branches: SchoolBranch[];
  activeBranch: SchoolBranch | null;
  setActiveBranch: (branch: SchoolBranch) => void;
  addBranch: (branch: Omit<SchoolBranch, "id">) => void;
  updateBranch: (branch: SchoolBranch) => void;
  deleteBranch: (id: string) => void;
}

const BRANCHES_KEY = "erp_school_branches";
const ACTIVE_BRANCH_KEY = "erp_active_branch";

const SchoolContext = createContext<SchoolContextValue | null>(null);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<SchoolBranch[]>(() => {
    try {
      const stored = localStorage.getItem(BRANCHES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: "main",
        name: "Main Branch",
        address: "",
        contact: "",
        email: "",
        principal: "",
      },
    ];
  });

  const [activeBranch, setActiveBranchState] = useState<SchoolBranch | null>(
    () => {
      try {
        const stored = localStorage.getItem(ACTIVE_BRANCH_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
      return null;
    },
  );

  useEffect(() => {
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    if (activeBranch)
      localStorage.setItem(ACTIVE_BRANCH_KEY, JSON.stringify(activeBranch));
  }, [activeBranch]);

  useEffect(() => {
    if (!activeBranch && branches.length > 0) {
      setActiveBranchState(branches[0]);
    }
  }, [branches, activeBranch]);

  const setActiveBranch = (branch: SchoolBranch) =>
    setActiveBranchState(branch);

  const addBranch = (data: Omit<SchoolBranch, "id">) => {
    const newBranch = { ...data, id: Date.now().toString() };
    setBranches((prev) => [...prev, newBranch]);
  };

  const updateBranch = (updated: SchoolBranch) => {
    setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (activeBranch?.id === updated.id) setActiveBranchState(updated);
  };

  const deleteBranch = (id: string) => {
    setBranches((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeBranch?.id === id && next.length > 0)
        setActiveBranchState(next[0]);
      return next;
    });
  };

  return (
    <SchoolContext.Provider
      value={{
        branches,
        activeBranch,
        setActiveBranch,
        addBranch,
        updateBranch,
        deleteBranch,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}
