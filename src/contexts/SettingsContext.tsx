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

export interface GranularColors {
  windowFrame: string;
  windowHeader: string;
  windowTitle: string;
  windowBorder: string;
  contentBg: string;
  contentText: string;
  stringColor: string;
  keywordColor: string;
  numberColor: string;
  commentColor: string;
  accentColor: string;
}

export type ThemeMode = 'retro_dark' | 'retro_light' | 'glassy_dark' | 'glassy_light';

export interface ThemeConfig {
  mainColor: string;
  terminalColor: string;
  globalTheme: 'retro' | 'glassy';
  isDarkMode: boolean;
  glassyConfig: GlassyConfig;
  granularSettings: Record<ThemeMode, GranularColors>;
  useGranular: boolean;
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

export const defaultGranular: Record<ThemeMode, GranularColors> = {
  retro_dark: {
    windowFrame: '#050505',
    windowHeader: '#0a0a0a',
    windowTitle: '#00f2ff',
    windowBorder: '#00f2ff4D',
    contentBg: '#050505',
    contentText: '#00f2ff',
    stringColor: '#00ff9d',
    keywordColor: '#ff00ff',
    numberColor: '#ffcc00',
    commentColor: '#666666',
    accentColor: '#00f2ff'
  },
  retro_light: {
    windowFrame: '#e0f7fa',
    windowHeader: '#b2ebf2',
    windowTitle: '#006064',
    windowBorder: 'rgba(0, 96, 100, 0.4)',
    contentBg: '#e0f7fa',
    contentText: '#006064',
    stringColor: '#2e7d32',
    keywordColor: '#c2185b',
    numberColor: '#f57c00',
    commentColor: '#78909c',
    accentColor: '#006064'
  },
  glassy_dark: {
    windowFrame: 'rgba(5, 5, 5, 0.4)',
    windowHeader: 'rgba(20, 20, 20, 0.5)',
    windowTitle: '#ffffff',
    windowBorder: 'rgba(255, 255, 255, 0.1)',
    contentBg: 'rgba(0, 0, 0, 0.2)',
    contentText: '#ffffff',
    stringColor: '#a5d6a7',
    keywordColor: '#f48fb1',
    numberColor: '#ffcc80',
    commentColor: '#9e9e9e',
    accentColor: '#00f2ff'
  },
  glassy_light: {
    windowFrame: 'rgba(255, 255, 255, 0.4)',
    windowHeader: 'rgba(240, 240, 240, 0.5)',
    windowTitle: '#1a1a1a',
    windowBorder: 'rgba(0, 0, 0, 0.1)',
    contentBg: 'rgba(255, 255, 255, 0.2)',
    contentText: '#1a1a1a',
    stringColor: '#388e3c',
    keywordColor: '#d81b60',
    numberColor: '#f57c00',
    commentColor: '#757575',
    accentColor: '#006064'
  }
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
  granularSettings: defaultGranular,
  useGranular: false,
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
    const saved = localStorage.getItem('nexus_journal_profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('nexus_journal_theme');
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
    localStorage.setItem('nexus_journal_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('nexus_journal_theme', JSON.stringify(theme));
    
    // Save to server
    fetch('/api/settings/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme)
    }).catch(err => console.error("Failed to save theme to server", err));

    // Apply theme to document root
    const root = document.documentElement;
    
    const currentMode: ThemeMode = `${theme.globalTheme}_${theme.isDarkMode ? 'dark' : 'light'}` as ThemeMode;
    const g = theme.granularSettings[currentMode];

    if (theme.useGranular) {
      root.style.setProperty('--theme-main', g.accentColor);
      root.style.setProperty('--theme-terminal', g.accentColor);
      root.style.setProperty('--theme-panel-bg', g.windowFrame);
      root.style.setProperty('--theme-header-bg', g.windowHeader);
      root.style.setProperty('--theme-text', g.windowTitle);
      root.style.setProperty('--theme-border-color', g.windowBorder);
      root.style.setProperty('--theme-content-bg', g.contentBg);
      root.style.setProperty('--theme-content-text', g.contentText);
      root.style.setProperty('--theme-string', g.stringColor);
      root.style.setProperty('--theme-keyword', g.keywordColor);
      root.style.setProperty('--theme-number', g.numberColor);
      root.style.setProperty('--theme-comment', g.commentColor);
    } else {
      root.style.setProperty('--theme-main', theme.mainColor);
      root.style.setProperty('--theme-terminal', theme.terminalColor);
      root.style.setProperty('--theme-string', theme.isDarkMode ? '#00ff9d' : '#2e7d32');
      root.style.setProperty('--theme-keyword', theme.isDarkMode ? '#ff00ff' : '#c2185b');
      root.style.setProperty('--theme-number', theme.isDarkMode ? '#ffcc00' : '#f57c00');
      root.style.setProperty('--theme-comment', theme.isDarkMode ? '#666666' : '#78909c');
      
      if (theme.globalTheme === 'glassy') {
        const { opacity, blur, borderOpacity, saturation } = theme.glassyConfig || defaultTheme.glassyConfig;
        root.style.setProperty('--theme-backdrop-filter', `blur(${blur}px) saturate(${saturation}%)`);
        
        if (theme.isDarkMode) {
          root.style.setProperty('--theme-panel-bg', `rgba(5, 5, 5, ${opacity})`);
          root.style.setProperty('--theme-header-bg', `rgba(20, 20, 20, ${opacity + 0.1})`);
          root.style.setProperty('--theme-text', '#ffffff');
          root.style.setProperty('--theme-border-opacity', borderOpacity.toString());
          root.style.setProperty('--theme-border-color', `rgba(255, 255, 255, ${borderOpacity})`);
          root.style.setProperty('--theme-content-bg', 'transparent');
          root.style.setProperty('--theme-content-text', '#ffffff');
        } else {
          root.style.setProperty('--theme-panel-bg', `rgba(255, 255, 255, ${opacity})`);
          root.style.setProperty('--theme-header-bg', `rgba(240, 240, 240, ${opacity + 0.1})`);
          root.style.setProperty('--theme-text', '#1a1a1a');
          root.style.setProperty('--theme-border-opacity', borderOpacity.toString());
          root.style.setProperty('--theme-border-color', `rgba(0, 0, 0, ${borderOpacity})`);
          root.style.setProperty('--theme-content-bg', 'transparent');
          root.style.setProperty('--theme-content-text', '#1a1a1a');
        }
      } else {
        root.style.setProperty('--theme-backdrop-filter', 'none');
        if (theme.isDarkMode) {
          root.style.setProperty('--theme-panel-bg', '#050505');
          root.style.setProperty('--theme-header-bg', '#0a0a0a');
          root.style.setProperty('--theme-text', theme.mainColor);
          root.style.setProperty('--theme-border-opacity', '0.3');
          root.style.setProperty('--theme-border-color', `${theme.mainColor}4D`);
          root.style.setProperty('--theme-content-bg', '#050505');
          root.style.setProperty('--theme-content-text', theme.mainColor);
        } else {
          root.style.setProperty('--theme-panel-bg', '#e0f7fa');
          root.style.setProperty('--theme-header-bg', '#b2ebf2');
          root.style.setProperty('--theme-text', '#006064');
          root.style.setProperty('--theme-border-opacity', '0.4');
          root.style.setProperty('--theme-border-color', 'rgba(0, 96, 100, 0.4)');
          root.style.setProperty('--theme-content-bg', '#e0f7fa');
          root.style.setProperty('--theme-content-text', '#006064');
        }
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

  useEffect(() => {
    // Fetch theme from server
    fetch('/api/settings/theme')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setTheme(prev => ({
            ...prev,
            ...data,
            granularSettings: {
              ...defaultGranular,
              ...(data.granularSettings || {})
            }
          }));
        }
      })
      .catch(err => console.error("Failed to fetch theme from server", err));
  }, []);

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
