import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  passwordHash: string; // Stored locally
}

export interface ThemeConfig {
  mainColor: string;
  terminalColor: string;
  globalTheme: 'retro' | 'glassy';
  backgroundType: 'base1' | 'base2' | 'custom';
  customBackgroundUrl: string | null;
  desktopIcons: Record<string, boolean>;
  iconPositions: Record<string, { x: number, y: number }>;
}

interface SettingsContextType {
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
  theme: ThemeConfig;
  updateTheme: (theme: Partial<ThemeConfig> | ((prev: ThemeConfig) => Partial<ThemeConfig>)) => void;
}

const defaultProfile: UserProfile = {
  name: 'Guest',
  passwordHash: ''
};

const defaultTheme: ThemeConfig = {
  mainColor: '#00f2ff',
  terminalColor: '#00f2ff',
  globalTheme: 'retro',
  backgroundType: 'base1',
  customBackgroundUrl: null,
  desktopIcons: {
    'console': true,
    'eeprom': true,
    'rfid': true,
    'binary': true,
    'cyphonator': true,
    'tutorials': true,
    'flasher': true,
    'notes': true,
    'admin': true,
    'settings': true
  },
  iconPositions: {}
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('electron_os_profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('electron_os_theme');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge missing desktop icons
      return {
        ...defaultTheme,
        ...parsed,
        desktopIcons: {
          ...defaultTheme.desktopIcons,
          ...(parsed.desktopIcons || {})
        }
      };
    }
    return defaultTheme;
  });

  useEffect(() => {
    localStorage.setItem('electron_os_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('electron_os_theme', JSON.stringify(theme));
    
    // Apply theme to document root
    const root = document.documentElement;
    root.style.setProperty('--theme-main', theme.mainColor);
    root.style.setProperty('--theme-terminal', theme.terminalColor);
    
    if (theme.globalTheme === 'glassy') {
      root.style.setProperty('--theme-panel-bg', 'rgba(5, 5, 5, 0.4)');
      root.style.setProperty('--theme-backdrop-filter', 'blur(12px)');
      root.style.setProperty('--theme-border-opacity', '0.1');
    } else {
      root.style.setProperty('--theme-panel-bg', '#050505');
      root.style.setProperty('--theme-backdrop-filter', 'none');
      root.style.setProperty('--theme-border-opacity', '0.3');
    }

    if (theme.backgroundType === 'base1') {
      root.style.setProperty('--theme-bg-image', 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)');
      root.style.setProperty('--theme-bg-size', '24px 24px');
    } else if (theme.backgroundType === 'base2') {
      root.style.setProperty('--theme-bg-image', 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)');
      root.style.setProperty('--theme-bg-size', '30px 30px');
    } else if (theme.backgroundType === 'custom' && theme.customBackgroundUrl) {
      root.style.setProperty('--theme-bg-image', `url(${theme.customBackgroundUrl})`);
      root.style.setProperty('--theme-bg-size', 'cover');
    } else {
      root.style.setProperty('--theme-bg-image', 'none');
    }
    
  }, [theme]);

  const updateProfile = useCallback((newProfile: UserProfile) => setProfile(newProfile), []);
  
  const updateTheme = useCallback((newTheme: Partial<ThemeConfig> | ((prev: ThemeConfig) => Partial<ThemeConfig>)) => {
    setTheme(prev => {
      const updates = typeof newTheme === 'function' ? newTheme(prev) : newTheme;
      
      // If no updates, return the exact same reference to prevent re-renders
      if (Object.keys(updates).length === 0) {
        return prev;
      }
      
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ profile, updateProfile, theme, updateTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};
