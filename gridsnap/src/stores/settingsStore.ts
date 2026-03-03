import { create } from "zustand";

interface SettingsStore {
  theme: string;
  setTheme: (theme: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: "carbon",
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
