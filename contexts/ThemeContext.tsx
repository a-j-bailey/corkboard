import { useColorScheme } from 'nativewind';
import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

interface ThemeContextType {
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  
  // Initialize NativeWind to follow system theme on mount
  useEffect(() => {
    setColorScheme('system');
  }, [setColorScheme]);
  
  // Use NativeWind's colorScheme (which follows system) or fall back to system
  const themeColorScheme: 'light' | 'dark' = (colorScheme ?? systemColorScheme ?? 'light') as 'light' | 'dark';

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
