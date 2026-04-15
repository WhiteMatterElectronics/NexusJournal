import React, { useState, useEffect } from 'react';
import { User, Monitor, Save, Layout, Palette, RotateCcw, Box, Shield, Moon, Sun, EyeOff, Camera, Trash2, Layers, Plus, Clock, Globe, Cpu, Zap } from 'lucide-react';
import { useSettings, defaultGranular, ThemeMode, GranularColors } from '../../contexts/SettingsContext';
import { cn, adjustColor } from '../../lib/utils';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { ThemeConfig } from '../../contexts/SettingsContext';
import { ActiveWidget } from '../../types/widgets';
import { APPS } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsAppProps {
  initialTab?: 'profile' | 'desktop' | 'appearance' | 'taskbar' | 'widgets' | 'security' | 'time';
}

export const SettingsApp: React.FC<SettingsAppProps> = ({ initialTab = 'profile' }) => {
  const { profile, updateProfile, theme, updateTheme } = useSettings();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Profile State
  const [name, setName] = useState(profile.name);
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Local state for real-time preview
  const [localTheme, setLocalTheme] = useState<ThemeConfig>(theme);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    let hash = profile.passwordHash;
    if (profile.passwordHash) {
      const encoder = new TextEncoder();
      const data = encoder.encode(oldPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const oldHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      if (oldHash !== profile.passwordHash) {
        setProfileMsg('Incorrect current password.');
        return;
      }
    }
    if (password !== confirmPassword) {
      setProfileMsg('New passwords do not match.');
      return;
    }
    if (password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (oldPassword && !password) {
      hash = '';
    }
    updateProfile({ name, passwordHash: hash });
    setProfileMsg('Profile saved successfully.');
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => setProfileMsg(''), 3000);
  };

  // Sync local state when global theme changes
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  const handleUpdateLocalTheme = (updates: Partial<ThemeConfig>) => {
    let finalUpdates = { ...updates };

    // If enabling granular, sync current theme colors to granular settings
    if (updates.useGranular === true && !localTheme.useGranular) {
      const modes: ThemeMode[] = ['retro_dark', 'retro_light', 'glassy_dark', 'glassy_light'];
      const newGranular = { ...localTheme.granularSettings };

      modes.forEach(mode => {
        const isDark = mode.endsWith('dark');
        const isGlassy = mode.startsWith('glassy');
        
        if (isGlassy) {
          const { opacity, borderOpacity } = localTheme.glassyConfig;
          newGranular[mode] = {
            ...newGranular[mode],
            windowFrame: isDark ? `rgba(5, 5, 5, ${opacity})` : `rgba(255, 255, 255, ${opacity})`,
            windowHeader: isDark ? `rgba(20, 20, 20, ${opacity + 0.1})` : `rgba(240, 240, 240, ${opacity + 0.1})`,
            windowTitle: isDark ? '#ffffff' : '#1a1a1a',
            windowBorder: isDark ? `rgba(255, 255, 255, ${borderOpacity})` : `rgba(0, 0, 0, ${borderOpacity})`,
            contentBg: 'transparent',
            contentText: isDark ? '#ffffff' : '#1a1a1a',
            accentColor: localTheme.mainColor
          };
        } else {
          newGranular[mode] = {
            ...newGranular[mode],
            windowFrame: isDark ? '#050505' : '#e0f7fa',
            windowHeader: isDark ? '#0a0a0a' : '#b2ebf2',
            windowTitle: isDark ? localTheme.mainColor : '#006064',
            windowBorder: isDark ? `${localTheme.mainColor}4D` : 'rgba(0, 96, 100, 0.4)',
            contentBg: isDark ? '#050505' : '#e0f7fa',
            contentText: isDark ? localTheme.mainColor : '#006064',
            accentColor: localTheme.mainColor
          };
        }
      });
      
      finalUpdates.granularSettings = newGranular;
    }

    const newTheme = { ...localTheme, ...finalUpdates };
    setLocalTheme(newTheme);
    // Real-time application
    updateTheme(finalUpdates);
  };

  const handleSaveTheme = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await updateTheme(localTheme);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save theme:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'desktop', icon: Layout, label: 'Desktop' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'taskbar', icon: Monitor, label: 'Taskbar' },
    { id: 'time', icon: Clock, label: 'Date & Time' },
    { id: 'widgets', icon: Box, label: 'Widgets' },
    { id: 'security', icon: Shield, label: 'Security' },
  ] as const;

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--theme-panel-bg)' }}>
      {/* Sidebar */}
      <div className="w-48 border-r border-hw-blue/20 bg-hw-blue/5 flex flex-col shrink-0" style={{ borderColor: 'var(--theme-border-color)' }}>
        <div className="p-4 border-b border-hw-blue/20" style={{ borderColor: 'var(--theme-border-color)' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group",
                activeTab === tab.id ? "bg-hw-blue/20 border-r-2 border-hw-blue" : "hover:bg-hw-blue/10 border-r-2 border-transparent"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-hw-blue" : "text-hw-blue/60 group-hover:text-hw-blue")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", activeTab === tab.id ? "text-hw-blue" : "text-hw-blue/60 group-hover:text-hw-blue")}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" style={{ color: 'var(--theme-text)' }}>
        {activeTab === 'profile' && (
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <User className="w-5 h-5" /> User Profile
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs outline-none focus:border-hw-blue"
                  style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                />
              </div>
              <div className="pt-4 border-t border-hw-blue/10" style={{ borderColor: 'var(--theme-border-color)' }}>
                {profile.passwordHash && (
                  <>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs outline-none focus:border-hw-blue mb-4"
                      style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                      required
                    />
                  </>
                )}
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">New Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs outline-none focus:border-hw-blue mb-4"
                  style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                />
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs outline-none focus:border-hw-blue"
                  style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                />
              </div>
              
              {profileMsg && (
                <div className="text-[10px] text-hw-blue uppercase tracking-widest bg-hw-blue/10 p-2 border border-hw-blue/30">
                  {profileMsg}
                </div>
              )}

              <button type="submit" className="hw-button flex items-center gap-2 mt-4">
                <Save className="w-4 h-4" /> Save Profile
              </button>
            </form>
          </div>
        )}

        {activeTab === 'desktop' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layout className="w-5 h-5" /> Desktop Customization
            </h2>
            <div className="space-y-8">
              {/* Grid Size */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Grid Layout</h3>
                <div className="flex flex-col gap-6 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Grid Columns</span>
                      <span className="text-[8px] opacity-40 uppercase">Fixed number of vertical divisions</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold">{localTheme.gridCols}</span>
                      <input 
                        type="range" min="8" max="30" step="1"
                        value={localTheme.gridCols}
                        onChange={e => handleUpdateLocalTheme({ gridCols: parseInt(e.target.value) })}
                        className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Grid Rows</span>
                      <span className="text-[8px] opacity-40 uppercase">Fixed number of horizontal divisions</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold">{localTheme.gridRows}</span>
                      <input 
                        type="range" min="4" max="20" step="1"
                        value={localTheme.gridRows}
                        onChange={e => handleUpdateLocalTheme({ gridRows: parseInt(e.target.value) })}
                        className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Grid Scaling</span>
                      <span className="text-[8px] opacity-40 uppercase">Base size of desktop grid cells</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold">{localTheme.desktopGridSize}px</span>
                      <input 
                        type="range" min="60" max="150" step="5"
                        value={localTheme.desktopGridSize}
                        onChange={e => handleUpdateLocalTheme({ desktopGridSize: parseInt(e.target.value) })}
                        className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Icon Scale</span>
                      <span className="text-[8px] opacity-40 uppercase">Internal icon size multiplier</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold">{localTheme.iconScale || 1}x</span>
                      <input 
                        type="range" min="0.5" max="2" step="0.1"
                        value={localTheme.iconScale || 1}
                        onChange={e => handleUpdateLocalTheme({ iconScale: parseFloat(e.target.value) })}
                        className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Label Color */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Icon Labels</h3>
                <div className="flex flex-col gap-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Label Font Color</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={localTheme.desktopLabelColor}
                        onChange={e => handleUpdateLocalTheme({ desktopLabelColor: e.target.value })}
                        className="w-8 h-8 bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-[10px] font-mono opacity-60 uppercase">{localTheme.desktopLabelColor}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Label Scale</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold">{localTheme.labelScale || 1}x</span>
                      <input 
                        type="range" min="0.5" max="2" step="0.1"
                        value={localTheme.labelScale || 1}
                        onChange={e => handleUpdateLocalTheme({ labelScale: parseFloat(e.target.value) })}
                        className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Icons Visibility */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Desktop Icons</h3>
                <div className="grid grid-cols-2 gap-4">
                  {APPS.map((app) => (
                    <label key={app.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.desktopIcons[app.id] !== false}
                        onChange={(e) => handleUpdateLocalTheme({ 
                          desktopIcons: { ...localTheme.desktopIcons, [app.id]: e.target.checked } 
                        })}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">
                        {app.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Icon Themes */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Icon Themes</h3>
                <div className="flex flex-col gap-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Global Icon Style</span>
                      <span className="text-[8px] opacity-40 uppercase">Apply a consistent look to all icons</span>
                    </div>
                    <select 
                      value={localTheme.iconTheme}
                      onChange={e => handleUpdateLocalTheme({ iconTheme: e.target.value as any })}
                      className="bg-hw-black border border-hw-blue/30 text-[10px] font-bold uppercase tracking-widest p-2 outline-none focus:border-hw-blue transition-colors min-w-[120px]"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      <option value="classic" className="bg-hw-black">Classic</option>
                      <option value="neon" className="bg-hw-black">Neon Glow</option>
                      <option value="minimal" className="bg-hw-black">Minimalist</option>
                      <option value="glass" className="bg-hw-black">Glass Morph</option>
                      <option value="pixel" className="bg-hw-black">Pixel Retro</option>
                    </select>
                  </div>

                  <div className="h-[1px] bg-hw-blue/10 my-2" />
                  
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Per-App Overrides</span>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {APPS.map(app => (
                        <div key={app.id} className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-widest opacity-60">{app.label}</span>
                          <select 
                            value={localTheme.iconThemes?.[app.id] || 'default'}
                            onChange={e => {
                              const newThemes = { ...localTheme.iconThemes, [app.id]: e.target.value };
                              if (e.target.value === 'default') delete newThemes[app.id];
                              handleUpdateLocalTheme({ iconThemes: newThemes });
                            }}
                            className="bg-hw-black border-b border-hw-blue/20 text-[8px] font-bold uppercase tracking-widest outline-none focus:border-hw-blue p-1"
                            style={{ color: 'var(--theme-text)' }}
                          >
                            <option value="default" className="bg-hw-black">Default</option>
                            <option value="classic" className="bg-hw-black">Classic</option>
                            <option value="neon" className="bg-hw-black">Neon</option>
                            <option value="minimal" className="bg-hw-black">Minimal</option>
                            <option value="glass" className="bg-hw-black">Glass</option>
                            <option value="pixel" className="bg-hw-black">Pixel</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallpaper */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Wallpaper</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {['none', 'base1', 'base2', 'custom'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer group p-2 bg-hw-blue/5 border border-hw-blue/10 rounded hover:bg-hw-blue/10 transition-colors">
                        <input
                          type="radio"
                          name="bgType"
                          value={type}
                          checked={localTheme.backgroundType === type}
                          onChange={() => handleUpdateLocalTheme({ backgroundType: type as any })}
                          className="accent-hw-blue"
                        />
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">
                          {type === 'none' ? 'Solid Color' : type === 'base1' ? 'Dotted Grid' : type === 'base2' ? 'Line Grid' : 'Custom Image'}
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  {localTheme.backgroundType === 'custom' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <input
                        type="text"
                        value={localTheme.customBackgroundUrl || ''}
                        onChange={e => handleUpdateLocalTheme({ customBackgroundUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs outline-none focus:border-hw-blue"
                        style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                      />
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 opacity-40" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  handleUpdateLocalTheme({ customBackgroundUrl: event.target.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-[10px] file:mr-4 file:py-1 file:px-3 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-hw-blue/10 file:text-hw-blue hover:file:bg-hw-blue/20 cursor-pointer"
                          style={{ color: 'var(--theme-text)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 flex items-center gap-4">
                <button onClick={handleSaveTheme} disabled={isSaving} className="hw-button flex items-center gap-2 px-8 py-3">
                  <Save size={16} className={cn(isSaving && "animate-spin")} />
                  {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'success' ? 'SAVED!' : 'SAVE CONFIG'}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'appearance' && (
          <div className="max-w-4xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5" /> Appearance & Themes
            </h2>
            
            <div className="space-y-8">
              {/* Global Theme & Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-hw-blue mb-2">Global Style</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="globalTheme"
                        value="retro"
                        checked={localTheme.globalTheme === 'retro'}
                        onChange={() => handleUpdateLocalTheme({ globalTheme: 'retro' })}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Retro Terminal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="globalTheme"
                        value="glassy"
                        checked={localTheme.globalTheme === 'glassy'}
                        onChange={() => handleUpdateLocalTheme({ globalTheme: 'glassy' })}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Modern Glassy</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-hw-blue mb-2">Color Mode</h3>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.isDarkMode}
                        onChange={(e) => handleUpdateLocalTheme({ isDarkMode: e.target.checked })}
                        className="accent-hw-blue"
                      />
                      <div className="flex items-center gap-2">
                        {localTheme.isDarkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Dark Mode</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.useGranular}
                        onChange={(e) => handleUpdateLocalTheme({ useGranular: e.target.checked })}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Advanced Colors</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.animateIcons}
                        onChange={(e) => handleUpdateLocalTheme({ animateIcons: e.target.checked })}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Animated Icons</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Base Theme Color */}
              {!localTheme.useGranular && (
                <div className="space-y-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-hw-blue mb-4">Base Theme Color</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 p-2 bg-hw-blue/10 rounded-lg border border-hw-blue/20">
                      <input
                        type="color"
                        value={localTheme.mainColor}
                        onChange={e => handleUpdateLocalTheme({ mainColor: e.target.value, terminalColor: e.target.value })}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase">{localTheme.mainColor}</span>
                        <span className="text-[8px] opacity-40 uppercase tracking-widest">Primary Accent</span>
                      </div>
                    </div>
                    <div className="flex-1 text-[9px] opacity-40 uppercase tracking-widest leading-relaxed">
                      This color will be applied to borders, text, and primary UI elements across the entire system.
                    </div>
                  </div>
                </div>
              )}

              {/* Glassy Settings */}
              {localTheme.globalTheme === 'glassy' && (
                <div className="space-y-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-hw-blue mb-4">Glassy Effects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <label className="flex justify-between text-[9px] uppercase tracking-widest opacity-60 mb-1">
                        <span>Transparency</span>
                        <span>{Math.round(localTheme.glassyConfig.opacity * 100)}%</span>
                      </label>
                      <input 
                        type="range" min="0.05" max="0.95" step="0.05"
                        value={localTheme.glassyConfig.opacity}
                        onChange={e => handleUpdateLocalTheme({ glassyConfig: { ...localTheme.glassyConfig, opacity: parseFloat(e.target.value) } })}
                        className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-[9px] uppercase tracking-widest opacity-60 mb-1">
                        <span>Blur Strength</span>
                        <span>{localTheme.glassyConfig.blur}px</span>
                      </label>
                      <input 
                        type="range" min="0" max="40" step="1"
                        value={localTheme.glassyConfig.blur}
                        onChange={e => handleUpdateLocalTheme({ glassyConfig: { ...localTheme.glassyConfig, blur: parseInt(e.target.value) } })}
                        className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Granular Color Manager */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <h3 className="text-[12px] font-bold uppercase tracking-widest">Granular Color Manager</h3>
                  {!localTheme.useGranular && (
                    <span className="text-[9px] text-hw-blue/40 uppercase font-bold italic">Enable "Advanced Colors" above to use these</span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(['retro_dark', 'retro_light', 'glassy_dark', 'glassy_light'] as ThemeMode[]).map(mode => (
                    <div key={mode} className={cn(
                      "space-y-4 p-4 bg-hw-blue/5 border rounded-lg transition-opacity",
                      !localTheme.useGranular && "opacity-40 grayscale pointer-events-none"
                    )} style={{ borderColor: 'var(--theme-border-color)' }}>
                      <div className="flex items-center justify-between border-b border-hw-blue/10 pb-2 mb-4" style={{ borderColor: 'var(--theme-border-color)' }}>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">
                          {mode.replace('_', ' ')}
                        </h4>
                        <button 
                          onClick={() => {
                            const newGranular = { ...localTheme.granularSettings, [mode]: defaultGranular[mode] };
                            handleUpdateLocalTheme({ granularSettings: newGranular });
                          }}
                          className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <ColorInput 
                          label="Frame" 
                          value={localTheme.granularSettings[mode].windowFrame} 
                          onChange={val => {
                            const newGranular = { ...localTheme.granularSettings, [mode]: { ...localTheme.granularSettings[mode], windowFrame: val } };
                            handleUpdateLocalTheme({ granularSettings: newGranular });
                          }} 
                        />
                        <ColorInput 
                          label="Header" 
                          value={localTheme.granularSettings[mode].windowHeader} 
                          onChange={val => {
                            const newGranular = { ...localTheme.granularSettings, [mode]: { ...localTheme.granularSettings[mode], windowHeader: val } };
                            handleUpdateLocalTheme({ granularSettings: newGranular });
                          }} 
                        />
                        <ColorInput 
                          label="Content BG" 
                          value={localTheme.granularSettings[mode].contentBg} 
                          onChange={val => {
                            const newGranular = { ...localTheme.granularSettings, [mode]: { ...localTheme.granularSettings[mode], contentBg: val } };
                            handleUpdateLocalTheme({ granularSettings: newGranular });
                          }} 
                        />
                        <ColorInput 
                          label="Text" 
                          value={localTheme.granularSettings[mode].contentText} 
                          onChange={val => {
                            const newGranular = { ...localTheme.granularSettings, [mode]: { ...localTheme.granularSettings[mode], contentText: val } };
                            handleUpdateLocalTheme({ granularSettings: newGranular });
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom CSS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <h3 className="text-[12px] font-bold uppercase tracking-widest">Custom System CSS</h3>
                  <span className="text-[9px] text-hw-blue/40 uppercase font-bold italic">Inject custom styles into the OS</span>
                </div>
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <textarea
                    value={localTheme.customCss}
                    onChange={e => handleUpdateLocalTheme({ customCss: e.target.value })}
                    placeholder="/* Example: .desktop-icon { filter: drop-shadow(0 0 10px var(--theme-main)); } */"
                    className="w-full h-48 bg-hw-black/50 border border-hw-blue/20 p-4 text-xs font-mono outline-none focus:border-hw-blue custom-scrollbar resize-none"
                    style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                  />
                  <div className="mt-2 text-[8px] opacity-40 uppercase tracking-widest">
                    Changes are applied in real-time. Use with caution as invalid CSS can break the UI.
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-4">
                <button onClick={handleSaveTheme} disabled={isSaving} className="hw-button flex items-center gap-2 px-8 py-3">
                  <Save size={16} className={cn(isSaving && "animate-spin")} />
                  {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'success' ? 'SAVED!' : 'SAVE CONFIG'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taskbar' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Monitor className="w-5 h-5" /> Taskbar Settings
            </h2>
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Layout & Style</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-3 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg cursor-pointer hover:bg-hw-blue/10 transition-colors group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Classic Fixed</span>
                      <input
                        type="radio"
                        name="taskbarStyle"
                        value="fixed"
                        checked={localTheme.taskbarStyle === 'fixed'}
                        onChange={() => handleUpdateLocalTheme({ taskbarStyle: 'fixed' })}
                        className="accent-hw-blue"
                      />
                    </div>
                    <div className="h-2 w-full bg-hw-blue/20 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-hw-blue/40" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-3 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg cursor-pointer hover:bg-hw-blue/10 transition-colors group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Modern Panel</span>
                      <input
                        type="radio"
                        name="taskbarStyle"
                        value="panel"
                        checked={localTheme.taskbarStyle === 'panel'}
                        onChange={() => handleUpdateLocalTheme({ taskbarStyle: 'panel' })}
                        className="accent-hw-blue"
                      />
                    </div>
                    <div className="h-2 w-full flex justify-center">
                      <div className="h-full w-2/3 bg-hw-blue/40 rounded-full" />
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Behavior</h3>
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg space-y-6" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Intellihide</span>
                      <span className="text-[8px] opacity-40 uppercase">Automatically hide the taskbar</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localTheme.intellihide}
                      onChange={(e) => handleUpdateLocalTheme({ intellihide: e.target.checked })}
                      className="accent-hw-blue w-4 h-4"
                    />
                  </label>

                  {localTheme.intellihide && (
                    <div className="pt-4 border-t border-hw-blue/10 space-y-3" style={{ borderColor: 'var(--theme-border-color)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Hide Delay</span>
                        <span className="text-[10px] font-mono text-hw-blue">{localTheme.hideDelay}ms</span>
                      </div>
                      <input 
                        type="range" min="0" max="2000" step="100"
                        value={localTheme.hideDelay}
                        onChange={e => handleUpdateLocalTheme({ hideDelay: parseInt(e.target.value) })}
                        className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 flex items-center gap-4">
                <button onClick={handleSaveTheme} disabled={isSaving} className="hw-button flex items-center gap-2 px-8 py-3">
                  <Save size={16} className={cn(isSaving && "animate-spin")} />
                  {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'success' ? 'SAVED!' : 'SAVE CONFIG'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Date & Time
            </h2>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Time Source</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'system', label: 'System', icon: Cpu, desc: 'Use local OS time' },
                    { id: 'internet', label: 'Internet', icon: Globe, desc: 'Sync with NTP' },
                    { id: 'auto', label: 'Auto', icon: Zap, desc: 'Best available' }
                  ].map(source => (
                    <label 
                      key={source.id}
                      className={cn(
                        "flex flex-col gap-2 p-4 border rounded-lg cursor-pointer transition-all group",
                        localTheme.timeConfig.source === source.id 
                          ? "bg-hw-blue/20 border-hw-blue" 
                          : "bg-hw-blue/5 border-hw-blue/10 hover:border-hw-blue/40"
                      )}
                      style={{ borderColor: localTheme.timeConfig.source === source.id ? undefined : 'var(--theme-border-color)' }}
                    >
                      <div className="flex items-center justify-between">
                        <source.icon className={cn("w-4 h-4", localTheme.timeConfig.source === source.id ? "text-hw-blue" : "text-hw-blue/40")} />
                        <input
                          type="radio"
                          name="timeSource"
                          value={source.id}
                          checked={localTheme.timeConfig.source === source.id}
                          onChange={() => handleUpdateLocalTheme({ timeConfig: { ...localTheme.timeConfig, source: source.id as any } })}
                          className="accent-hw-blue"
                        />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{source.label}</span>
                      <span className="text-[8px] opacity-40 uppercase">{source.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Display Options</h3>
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg space-y-6" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Show Seconds</span>
                    <input
                      type="checkbox"
                      checked={localTheme.timeConfig.showSeconds}
                      onChange={(e) => handleUpdateLocalTheme({ timeConfig: { ...localTheme.timeConfig, showSeconds: e.target.checked } })}
                      className="accent-hw-blue w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-bold uppercase tracking-widest">24-Hour Format</span>
                    <input
                      type="checkbox"
                      checked={localTheme.timeConfig.is24Hour}
                      onChange={(e) => handleUpdateLocalTheme({ timeConfig: { ...localTheme.timeConfig, is24Hour: e.target.checked } })}
                      className="accent-hw-blue w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Manual Offset</h3>
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg space-y-4" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Time Offset (Minutes)</span>
                    <span className="text-[10px] font-mono text-hw-blue">{localTheme.timeConfig.manualOffset > 0 ? '+' : ''}{localTheme.timeConfig.manualOffset}m</span>
                  </div>
                  <input 
                    type="range" min="-1440" max="1440" step="15"
                    value={localTheme.timeConfig.manualOffset}
                    onChange={e => handleUpdateLocalTheme({ timeConfig: { ...localTheme.timeConfig, manualOffset: parseInt(e.target.value) } })}
                    className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                  />
                  <div className="flex justify-between text-[8px] uppercase opacity-40">
                    <span>-24h</span>
                    <span>0</span>
                    <span>+24h</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-4">
                <button onClick={handleSaveTheme} disabled={isSaving} className="hw-button flex items-center gap-2 px-8 py-3">
                  <Save size={16} className={cn(isSaving && "animate-spin")} />
                  {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'success' ? 'SAVED!' : 'SAVE CONFIG'}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'widgets' && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layout className="w-5 h-5" /> Desktop Widgets
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Available Widgets */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Available Widgets</h3>
                <div className="space-y-3">
                  {WIDGET_REGISTRY.map(widget => (
                    <div 
                      key={widget.id}
                      className="p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center justify-between group hover:border-hw-blue/40 transition-colors"
                      style={{ borderColor: 'var(--theme-border-color)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-hw-blue/10 rounded-lg">
                          <widget.icon className="w-4 h-4 text-hw-blue" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">{widget.name}</div>
                          <div className="text-[8px] opacity-60 uppercase tracking-wider">{widget.description}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const instanceId = `widget-${Date.now()}`;
                          const activeWidgets = theme.widgets || [];
                          
                          // Find free space (simple heuristic: find first non-overlapping spot)
                          let spawnX = 0;
                          let spawnY = 0;
                          let found = false;
                          
                          for (let y = 0; y < 10; y++) {
                            for (let x = 0; x < 16; x++) {
                              const overlaps = activeWidgets.some(w => 
                                x < w.x + w.w && x + widget.defaultSize.w > w.x &&
                                y < w.y + w.h && y + widget.defaultSize.h > w.y
                              );
                              // Also avoid left edge if possible (where icons usually are)
                              if (!overlaps && x > 2) {
                                spawnX = x;
                                spawnY = y;
                                found = true;
                                break;
                              }
                            }
                            if (found) break;
                          }

                          const newWidget: ActiveWidget = {
                            instanceId,
                            widgetId: widget.id,
                            x: spawnX,
                            y: spawnY,
                            w: widget.defaultSize.w,
                            h: widget.defaultSize.h,
                            isFloating: false
                          };
                          updateTheme(prev => ({
                            widgets: [...(prev.widgets || []), newWidget]
                          }));
                        }}
                        className="p-2 hover:bg-hw-blue/20 rounded-lg transition-colors text-hw-blue"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Widgets */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Active on Desktop</h3>
                <div className="space-y-3">
                  {(!theme.widgets || theme.widgets.length === 0) ? (
                    <div className="text-[10px] opacity-40 uppercase tracking-widest py-8 text-center border-2 border-dashed border-hw-blue/10 rounded-lg">
                      No active widgets
                    </div>
                  ) : (
                    theme.widgets.map(widget => {
                      const def = WIDGET_REGISTRY.find(w => w.id === widget.widgetId);
                      return (
                        <div 
                          key={widget.instanceId}
                          className="p-3 bg-hw-blue/5 border border-hw-blue/20 rounded-lg space-y-3"
                          style={{ borderColor: 'var(--theme-border-color)' }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {def && <def.icon className="w-3 h-3 text-hw-blue" />}
                              <span className="text-[10px] font-bold uppercase tracking-widest">{def?.name || 'Unknown Widget'}</span>
                            </div>
                            <button 
                              onClick={() => {
                                updateTheme(prev => ({
                                  widgets: prev.widgets.filter(w => w.instanceId !== widget.instanceId)
                                }));
                              }}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-hw-blue/10" style={{ borderColor: 'var(--theme-border-color)' }}>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={widget.isFloating}
                                onChange={(e) => {
                                  updateTheme(prev => ({
                                    widgets: prev.widgets.map(w => w.instanceId === widget.instanceId ? { ...w, isFloating: e.target.checked } : w)
                                  }));
                                }}
                                className="accent-hw-blue"
                              />
                              <div className="flex items-center gap-1">
                                <Layers className="w-3 h-3 opacity-60" />
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Float over windows</span>
                              </div>
                            </label>
                            <div className="text-[8px] opacity-40 uppercase tracking-widest">
                              Size: {widget.w}x{widget.h}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="flex flex-col items-center justify-center h-full text-hw-blue/40">
            <Shield className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-[10px] uppercase tracking-widest">Security Module</p>
            <p className="text-xs mt-2">Security settings and encryption keys management coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[8px] uppercase tracking-widest opacity-60">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6 rounded border border-hw-blue/20 overflow-hidden shrink-0">
          <input
            type="color"
            value={value.startsWith('rgba') ? '#000000' : value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-[-5px] w-[200%] h-[200%] cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-hw-blue/5 border border-hw-blue/20 px-2 py-1 text-[9px] font-mono outline-none focus:border-hw-blue"
          style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
        />
      </div>
    </div>
  );
};
