import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilityState {
  dyslexicFont: boolean;
  highContrast: boolean;
  toggleDyslexicFont: () => void;
  toggleHighContrast: () => void;
}

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const savedDyslexic = localStorage.getItem('abelup_dyslexicFont') === 'true';
    const savedContrast = localStorage.getItem('abelup_highContrast') === 'true';
    if (savedDyslexic) setDyslexicFont(true);
    if (savedContrast) setHighContrast(true);
  }, []);

  useEffect(() => {
    if (dyslexicFont) {
      document.body.classList.add('font-dyslexic');
    } else {
      document.body.classList.remove('font-dyslexic');
    }
    localStorage.setItem('abelup_dyslexicFont', String(dyslexicFont));
  }, [dyslexicFont]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('theme-high-contrast');
    } else {
      document.body.classList.remove('theme-high-contrast');
    }
    localStorage.setItem('abelup_highContrast', String(highContrast));
  }, [highContrast]);

  const toggleDyslexicFont = () => setDyslexicFont(prev => !prev);
  const toggleHighContrast = () => setHighContrast(prev => !prev);

  return (
    <AccessibilityContext.Provider
      value={{ dyslexicFont, highContrast, toggleDyslexicFont, toggleHighContrast }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
