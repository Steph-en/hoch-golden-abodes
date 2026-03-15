import { createContext, useContext, useState, ReactNode } from "react";
import { Property } from "@/data/properties";

interface ComparisonContextType {
  compareList: Property[];
  addToCompare: (property: Property) => void;
  removeFromCompare: (id: number) => void;
  isInCompare: (id: number) => boolean;
  clearCompare: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export const ComparisonProvider = ({ children }: { children: ReactNode }) => {
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addToCompare = (property: Property) => {
    if (compareList.length >= 3) return;
    if (compareList.find((p) => p.id === property.id)) return;
    setCompareList((prev) => [...prev, property]);
  };

  const removeFromCompare = (id: number) => {
    setCompareList((prev) => prev.filter((p) => p.id !== id));
  };

  const isInCompare = (id: number) => compareList.some((p) => p.id === id);

  const clearCompare = () => {
    setCompareList([]);
    setIsDrawerOpen(false);
  };

  return (
    <ComparisonContext.Provider
      value={{ compareList, addToCompare, removeFromCompare, isInCompare, clearCompare, isDrawerOpen, setIsDrawerOpen }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) throw new Error("useComparison must be used within ComparisonProvider");
  return context;
};
