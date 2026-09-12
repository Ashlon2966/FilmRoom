import React, { createContext, useContext } from 'react';
import { darkTheme } from '../styles/themes';

const ThemeContext = createContext({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: darkTheme, isDark: true, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);