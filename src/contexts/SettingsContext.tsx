import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ActiveWidget } from '../types/widgets';

export interface UserProfile {
  name: string;
  passwordHash: string; // Stored locally
}

export interface GlassyConfig {
  opacity: number;
  blur: number;
  borderOpacity: number;
  saturation: number;
}

export interface ThemeConfig {
  mainColor: string;
  terminalColor: string;
  globalTheme: 'retro' | 'glassy';
  isDarkMode: boolean;
  glassyConfig: GlassyConfig;
  backgroundType: 'base1' | 'base2' | 'custom' | 'none';
  customBackgroundUrl: string | null;
  desktopIcons: Record<string, boolean>;
  iconPositions: Record<string, { x: number, y: number }>;
  taskbarStyle: 'fixed' | 'panel';
  intellihide: boolean;
  hideDelay: number;
  animationSpeed: number;
  widgets: ActiveWidget[];
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
  isDarkMode: true,
  glassyConfig: {
    opacity: 0.4,
    blur: 12,
    borderOpacity: 0.1,
    saturation: 100
  },
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
    'settings': true,
    'bluetooth': true
  },
  iconPositions: {},
  taskbarStyle: 'fixed',
  intellihide: false,
  hideDelay: 500,
  animationSpeed: 0.3,
  widgets: []
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
      const { opacity, blur, borderOpacity, saturation } = theme.glassyConfig || defaultTheme.glassyConfig;
      root.style.setProperty('--theme-backdrop-filter', `blur(${blur}px) saturate(${saturation}%)`);
      
      if (theme.isDarkMode) {
        root.style.setProperty('--theme-panel-bg', `rgba(5, 5, 5, ${opacity})`);
        root.style.setProperty('--theme-text', '#ffffff');
        root.style.setProperty('--theme-border-opacity', borderOpacity.toString());
        root.style.setProperty('--theme-border-color', `rgba(255, 255, 255, ${borderOpacity})`);
      } else {
        // macOS style light
        root.style.setProperty('--theme-panel-bg', `rgba(255, 255, 255, ${opacity})`);
        root.style.setProperty('--theme-text', '#1a1a1a');
        root.style.setProperty('--theme-border-opacity', borderOpacity.toString());
        root.style.setProperty('--theme-border-color', `rgba(0, 0, 0, ${borderOpacity})`);
      }
    } else {
      root.style.setProperty('--theme-backdrop-filter', 'none');
      if (theme.isDarkMode) {
        root.style.setProperty('--theme-panel-bg', '#050505');
        root.style.setProperty('--theme-text', theme.mainColor);
        root.style.setProperty('--theme-border-opacity', '0.3');
        root.style.setProperty('--theme-border-color', `${theme.mainColor}4D`); // 30% opacity
      } else {
        // Retro light blueish
        root.style.setProperty('--theme-panel-bg', '#e0f7fa');
        root.style.setProperty('--theme-text', '#006064');
        root.style.setProperty('--theme-border-opacity', '0.4');
        root.style.setProperty('--theme-border-color', 'rgba(0, 96, 100, 0.4)');
      }
    }

    if (theme.backgroundType === 'base1') {
      const dotColor = theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      root.style.setProperty('--theme-bg-image', `radial-gradient(circle at 2px 2px, ${dotColor} 1px, transparent 0)`);
      root.style.setProperty('--theme-bg-size', '24px 24px');
      root.style.setProperty('--theme-bg-color', theme.isDarkMode ? '#020202' : '#f5f7f8');
    } else if (theme.backgroundType === 'base2') {
      const gridColor = theme.isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
      root.style.setProperty('--theme-bg-image', `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`);
      root.style.setProperty('--theme-bg-size', '30px 30px');
      root.style.setProperty('--theme-bg-color', theme.isDarkMode ? '#020202' : '#f5f7f8');
    } else if (theme.backgroundType === 'custom' && theme.customBackgroundUrl) {
      root.style.setProperty('--theme-bg-image', `url(${theme.customBackgroundUrl})`);
      root.style.setProperty('--theme-bg-size', 'cover');
      root.style.setProperty('--theme-bg-color', '#000000');
    } else {
      root.style.setProperty('--theme-bg-image', 'none');
      root.style.setProperty('--theme-bg-color', theme.isDarkMode ? '#020202' : '#f5f7f8');
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
