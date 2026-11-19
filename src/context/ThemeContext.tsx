import { createContext, useContext, useEffect } from "react";
import { useLocalStorageState } from "./useLocalStorage";

interface themeprops{
  isDarkMode: boolean,
  toggleDarkMode: () => void,
}

const DarkModeContext = createContext();

export function DarkModeProvider({children}) {
  const [isDarkMode, setIsDarkMode] = useLocalStorageState(window.matchMedia("(prefers-color-scheme: dark)").matches, "isDarkMode");

  function toggleThemeMode() {
    setIsDarkMode((isDark: boolean) => !isDark);
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-mode");
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
      document.documentElement.classList.add("light-mode");
    }
  }, [isDarkMode]);

  return (
    <DarkModeContext.Provider value={{isDarkMode, toggleThemeMode}}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useThemeMode() {
  const context = useContext(DarkModeContext);

  if (context === "undefined") {
    throw new Error("Dark Mode context was used outside of dark mode provider")
  }

  return context;
}

