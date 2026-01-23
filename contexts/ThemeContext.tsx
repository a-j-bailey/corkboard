import React, { createContext, ReactNode, useContext } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const themeColorScheme: 'light' | 'dark' = (systemColorScheme ?? 'light') as 'light' | 'dark';

  return (
    <ThemeContext.Provider value={{ colorScheme: themeColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
