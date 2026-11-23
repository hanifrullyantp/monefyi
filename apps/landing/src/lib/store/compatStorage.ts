import { createJSONStorage, type StateStorage } from "zustand/middleware";

export function createCompatStorage<T = any>() {
  const stateStorage: StateStorage = {
    getItem: (name: string): string | null => {
      if (typeof window === "undefined") return null;
      try {
        let val = localStorage.getItem(name);
        if (!val) {
          const legacy = name.replace(/^froyek/, "monefyi");
          val = localStorage.getItem(legacy);
          if (val) {
            try {
              localStorage.setItem(name, val);
            } catch {}
          }
        }
        return val;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(name, value);
        const legacy = name.replace(/^froyek/, "monefyi");
        localStorage.setItem(legacy, value);
      } catch {}
    },
    removeItem: (name: string): void => {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(name);
        const legacy = name.replace(/^froyek/, "monefyi");
        localStorage.removeItem(legacy);
      } catch {}
    },
  };
  return createJSONStorage<T>(() => stateStorage);
}

