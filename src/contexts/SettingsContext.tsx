import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ActiveWidget } from '../types/widgets';
import { getContrastColor } from '../lib/utils';

export interface UserProfile {
  name: string;
  osName: string;
  dashName: string;
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

export type ThemeBase = 'retro' | 'glassy' | 'synthwave' | 'nord' | 'luxury' | 'matrix' | 'pastel';
export type ThemeMode = 
  | 'retro_dark' | 'retro_light' 
  | 'glassy_dark' | 'glassy_light' 
  | 'synthwave_dark' | 'synthwave_light'
  | 'nord_dark' | 'nord_light'
  | 'luxury_dark' | 'luxury_light'
  | 'matrix_dark' | 'matrix_light'
  | 'pastel_dark' | 'pastel_light';

export interface TimeConfig {
  source: 'system' | 'internet' | 'auto';
  manualOffset: number; // in minutes
  showSeconds: boolean;
  is24Hour: boolean;
}

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
  desktopGridSize: number;
  gridCols: number;
  gridRows: number;
  desktopLabelColor: string;
  iconStyle: 'retro' | 'glassy' | 'minimal' | 'isometric' | 'flat-outline' | 'neon' | 'sketch' | 'hologram' | 'pixel' | 'brutalist' | 'clay' | 'gradient' | 'monochrome' | 'skeuo' | 'glassmorphic' | 'liquid' | 'retrotv' | 'glitch';
  iconThemes: Record<string, string>;
  timeConfig: TimeConfig;
  customCss: string;
  animateIcons: boolean;
  iconScale: number;
  labelScale: number;
  shortcuts: Shortcut[];
  selectedMode?: ThemeBase;
}

export interface Shortcut {
  id: string;
  label: string;
  type: 'file' | 'folder';
  targetId: string;
  category?: string;
}

interface SettingsContextType {
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
  theme: ThemeConfig;
  updateTheme: (theme: Partial<ThemeConfig> | ((prev: ThemeConfig) => Partial<ThemeConfig>)) => void;
}

const defaultProfile: UserProfile = {
  name: 'Guest',
  osName: 'NEXUS_JOURNAL',
  dashName: 'Nexus Dash',
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
  },
  synthwave_dark: {
    windowFrame: 'rgba(20, 10, 40, 0.8)',
    windowHeader: 'rgba(40, 20, 80, 0.9)',
    windowTitle: '#ff00ff',
    windowBorder: 'rgba(0, 242, 255, 0.5)',
    contentBg: '#0d0221',
    contentText: '#00f2ff',
    stringColor: '#f706cf',
    keywordColor: '#3ef1f5',
    numberColor: '#ffee00',
    commentColor: '#624a9e',
    accentColor: '#ff00ff'
  },
  synthwave_light: {
    windowFrame: 'rgba(255, 220, 255, 0.8)',
    windowHeader: 'rgba(255, 180, 255, 0.9)',
    windowTitle: '#7a007a',
    windowBorder: 'rgba(0, 120, 150, 0.5)',
    contentBg: '#fff0ff',
    contentText: '#006080',
    stringColor: '#b00090',
    keywordColor: '#008090',
    numberColor: '#c0a000',
    commentColor: '#a080c0',
    accentColor: '#ff00ff'
  },
  nord_dark: {
    windowFrame: '#2e3440',
    windowHeader: '#3b4252',
    windowTitle: '#88c0d0',
    windowBorder: '#4c566a',
    contentBg: '#2e3440',
    contentText: '#eceff4',
    stringColor: '#a3be8c',
    keywordColor: '#81a1c1',
    numberColor: '#b48ead',
    commentColor: '#4c566a',
    accentColor: '#88c0d0'
  },
  nord_light: {
    windowFrame: '#eceff4',
    windowHeader: '#e5e9f0',
    windowTitle: '#5e81ac',
    windowBorder: '#d8dee9',
    contentBg: '#eceff4',
    contentText: '#2e3440',
    stringColor: '#4f6d45',
    keywordColor: '#434c5e',
    numberColor: '#b48ead',
    commentColor: '#d8dee9',
    accentColor: '#5e81ac'
  },
  luxury_dark: {
    windowFrame: '#0a0a0a',
    windowHeader: '#1a1a1a',
    windowTitle: '#d4af37',
    windowBorder: '#d4af37',
    contentBg: '#050505',
    contentText: '#ffffff',
    stringColor: '#d4af37',
    keywordColor: '#c5a028',
    numberColor: '#b8921e',
    commentColor: '#333333',
    accentColor: '#d4af37'
  },
  luxury_light: {
    windowFrame: '#ffffff',
    windowHeader: '#f5f5f5',
    windowTitle: '#b8921e',
    windowBorder: '#b8921e',
    contentBg: '#ffffff',
    contentText: '#1a1a1a',
    stringColor: '#b8921e',
    keywordColor: '#a6821b',
    numberColor: '#957218',
    commentColor: '#cccccc',
    accentColor: '#b8921e'
  },
  matrix_dark: {
    windowFrame: '#000000',
    windowHeader: '#050505',
    windowTitle: '#00ff41',
    windowBorder: '#003b00',
    contentBg: '#000000',
    contentText: '#00ff41',
    stringColor: '#00ff41',
    keywordColor: '#008f11',
    numberColor: '#00ff41',
    commentColor: '#003b00',
    accentColor: '#00ff41'
  },
  matrix_light: {
    windowFrame: '#e8f5e9',
    windowHeader: '#c8e6c9',
    windowTitle: '#1b5e20',
    windowBorder: '#81c784',
    contentBg: '#f1f8e9',
    contentText: '#1b5e20',
    stringColor: '#2e7d32',
    keywordColor: '#388e3c',
    numberColor: '#1b5e20',
    commentColor: '#a5d6a7',
    accentColor: '#2e7d32'
  },
  pastel_dark: {
    windowFrame: '#2d2d2d',
    windowHeader: '#3d3d3d',
    windowTitle: '#ffb7b2',
    windowBorder: '#ffdac1',
    contentBg: '#2d2d2d',
    contentText: '#e2f0cb',
    stringColor: '#b5ead7',
    keywordColor: '#c7ceea',
    numberColor: '#e2f0cb',
    commentColor: '#555555',
    accentColor: '#ffb7b2'
  },
  pastel_light: {
    windowFrame: '#ffffff',
    windowHeader: '#fff9f9',
    windowTitle: '#ff9aa2',
    windowBorder: '#ffb7b2',
    contentBg: '#ffffff',
    contentText: '#6b5b95',
    stringColor: '#feb2a8',
    keywordColor: '#d4a5a5',
    numberColor: '#ff7b89',
    commentColor: '#d8dee9',
    accentColor: '#ff9aa2'
  }
};

const defaultTheme: ThemeConfig = {
  mainColor: '#3b82f6',
  terminalColor: '#3b82f6',
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
    'bluetooth': true,
    'my_files': true,
    'properties': false
  },
  iconPositions: {},
  taskbarStyle: 'fixed',
  intellihide: false,
  hideDelay: 500,
  animationSpeed: 0.3,
  widgets: [],
  desktopGridSize: 100,
  gridCols: 15,
  gridRows: 7,
  desktopLabelColor: '#ffffff',
  iconStyle: 'retro',
  iconThemes: {},
  timeConfig: {
    source: 'auto',
    manualOffset: 0,
    showSeconds: true,
    is24Hour: true
  },
  customCss: '',
  animateIcons: true,
  iconScale: 1,
  labelScale: 1,
  shortcuts: [],
  selectedMode: 'retro'
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
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultProfile, ...parsed };
    }
    return defaultProfile;
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

    // Sync Title
    if (profile.osName) {
      document.title = profile.osName;
    }
    
    // Determine which mode settings to apply
    const base = theme.selectedMode || 'retro';
    const isDark = theme.isDarkMode;
    let modeKey: ThemeMode = `${base}_${isDark ? 'dark' : 'light'}` as ThemeMode;
    
    // Fallback if the selected mode doesn't exist
    if (!(modeKey in theme.granularSettings)) {
      modeKey = `${theme.globalTheme}_${isDark ? 'dark' : 'light'}` as ThemeMode;
    }

    const g = theme.granularSettings[modeKey] || theme.granularSettings['retro_dark'];

    root.style.setProperty('--desktop-grid-size', `${theme.desktopGridSize}px`);
    root.style.setProperty('--desktop-label-color', theme.desktopLabelColor);
    root.style.setProperty('--desktop-icon-scale', theme.iconScale?.toString() || '1');
    root.style.setProperty('--desktop-label-scale', theme.labelScale?.toString() || '1');

    // Helper for contrast safety
    const safeContrast = (bgColor: string, preferred: string) => {
       // Only force contrast if the theme doesn't look right, or always for safety?
       // Let's at least ensure minimum visibility. 
       // For now, let's trust the granular settings unless it's null
       return preferred || getContrastColor(bgColor);
    };

    if (theme.useGranular) {
      root.style.setProperty('--theme-main', g.accentColor);
      root.style.setProperty('--theme-terminal', g.accentColor);
      root.style.setProperty('--theme-panel-bg', g.windowFrame);
      root.style.setProperty('--theme-header-bg', g.windowHeader);
      root.style.setProperty('--theme-text', safeContrast(g.windowHeader, g.windowTitle));
      root.style.setProperty('--theme-border-color', g.windowBorder);
      root.style.setProperty('--theme-content-bg', g.contentBg);
      root.style.setProperty('--theme-content-text', safeContrast(g.contentBg, g.contentText));
      root.style.setProperty('--theme-string', g.stringColor);
      root.style.setProperty('--theme-keyword', g.keywordColor);
      root.style.setProperty('--theme-number', g.numberColor);
      root.style.setProperty('--theme-comment', g.commentColor);
      
      // Architecture still applies structural properties like blur even in granular mode
      if (theme.globalTheme === 'glassy') {
        const { blur, saturation } = theme.glassyConfig || defaultTheme.glassyConfig;
        root.style.setProperty('--theme-backdrop-filter', `blur(${blur}px) saturate(${saturation}%)`);
        root.style.setProperty('--theme-border-opacity', '0.2');
      } else {
        root.style.setProperty('--theme-backdrop-filter', 'none');
        root.style.setProperty('--theme-border-opacity', '1');
      }
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

    // Apply Custom CSS
    let styleTag = document.getElementById('nexus-custom-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'nexus-custom-css';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = theme.customCss;
    
  }, [theme, profile]);

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
