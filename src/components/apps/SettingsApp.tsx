import React, { useState } from 'react';
import { User, Sliders, Monitor, Wifi, Bluetooth, Save, AlertCircle, Layout, Plus, Trash2, Layers, Palette, RotateCcw } from 'lucide-react';
import { useSettings, defaultGranular, ThemeMode, GranularColors } from '../../contexts/SettingsContext';
import { cn } from '../../lib/utils';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { ActiveWidget } from '../../types/widgets';
import { APPS } from '../../constants';

interface SettingsAppProps {
  initialTab?: 'profile' | 'preferences' | 'appearance' | 'widgets' | 'serial' | 'network' | 'bluetooth';
}

export const SettingsApp: React.FC<SettingsAppProps> = ({ initialTab = 'profile' }) => {
  const { profile, updateProfile, theme, updateTheme } = useSettings();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile State
  const [name, setName] = useState(profile.name);
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Theme State (Local copy for editing)
  const [localTheme, setLocalTheme] = useState(theme);
  const [themeMsg, setThemeMsg] = useState('');

  // Sync localTheme when theme changes (e.g. from context menu)
  React.useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let hash = profile.passwordHash;

    // Check old password if one exists
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
      // If they entered old password correctly but left new password blank, remove password
      hash = '';
    }

    updateProfile({ name, passwordHash: hash });
    setProfileMsg('Profile saved successfully.');
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const handleSaveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    updateTheme(localTheme);
    setThemeMsg('Theme settings applied.');
    setTimeout(() => setThemeMsg(''), 3000);
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'User Profile' },
    { id: 'preferences', icon: Sliders, label: 'Preferences' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'widgets', icon: Layout, label: 'Widgets' },
    { id: 'serial', icon: Monitor, label: 'Serial' },
    { id: 'network', icon: Wifi, label: 'Network' },
    { id: 'bluetooth', icon: Bluetooth, label: 'Bluetooth' },
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

        {activeTab === 'preferences' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Sliders className="w-5 h-5" /> Preferences
            </h2>
            <form onSubmit={handleSaveTheme} className="space-y-8">
              
              {/* Colors */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Colors</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Main Shell Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={localTheme.mainColor}
                        onChange={e => setLocalTheme(prev => ({ ...prev, mainColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs font-mono">{localTheme.mainColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Serial Terminal Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={localTheme.terminalColor}
                        onChange={e => setLocalTheme(prev => ({ ...prev, terminalColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs font-mono">{localTheme.terminalColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Style */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Global Theme</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="globalTheme"
                        value="retro"
                        checked={localTheme.globalTheme === 'retro'}
                        onChange={() => setLocalTheme(prev => ({ ...prev, globalTheme: 'retro' }))}
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
                        onChange={() => setLocalTheme(prev => ({ ...prev, globalTheme: 'glassy' }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Modern Glassy</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.isDarkMode}
                        onChange={(e) => setLocalTheme(prev => ({ ...prev, isDarkMode: e.target.checked }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Dark Mode</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.useGranular}
                        onChange={(e) => setLocalTheme(prev => ({ ...prev, useGranular: e.target.checked }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Use Advanced Colors</span>
                    </label>
                  </div>

                  {localTheme.globalTheme === 'glassy' && (
                    <div className="mt-2 space-y-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-hw-blue mb-2">Glassy Sub-settings</h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {/* Opacity */}
                        <div>
                          <label className="flex justify-between text-[9px] uppercase tracking-widest opacity-60 mb-1">
                            <span>Transparency</span>
                            <span>{Math.round(localTheme.glassyConfig.opacity * 100)}%</span>
                          </label>
                          <input 
                            type="range" min="0.05" max="0.95" step="0.05"
                            value={localTheme.glassyConfig.opacity}
                            onChange={e => setLocalTheme(prev => ({ ...prev, glassyConfig: { ...prev.glassyConfig, opacity: parseFloat(e.target.value) } }))}
                            className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                          />
                        </div>
                        {/* Blur */}
                        <div>
                          <label className="flex justify-between text-[9px] uppercase tracking-widest opacity-60 mb-1">
                            <span>Blur Strength</span>
                            <span>{localTheme.glassyConfig.blur}px</span>
                          </label>
                          <input 
                            type="range" min="0" max="40" step="1"
                            value={localTheme.glassyConfig.blur}
                            onChange={e => setLocalTheme(prev => ({ ...prev, glassyConfig: { ...prev.glassyConfig, blur: parseInt(e.target.value) } }))}
                            className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                          />
                        </div>
                        {/* Border Opacity */}
                        <div>
                          <label className="flex justify-between text-[9px] uppercase tracking-widest opacity-60 mb-1">
                            <span>Border Intensity</span>
                            <span>{Math.round(localTheme.glassyConfig.borderOpacity * 100)}%</span>
                          </label>
                          <input 
                            type="range" min="0" max="1" step="0.05"
                            value={localTheme.glassyConfig.borderOpacity}
                            onChange={e => setLocalTheme(prev => ({ ...prev, glassyConfig: { ...prev.glassyConfig, borderOpacity: parseFloat(e.target.value) } }))}
                            className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                          />
                        </div>
                        {/* Saturation */}
                        <div>
                          <label className="flex justify-between text-[9px] uppercase tracking-widest opacity-60 mb-1">
                            <span>Saturation</span>
                            <span>{localTheme.glassyConfig.saturation}%</span>
                          </label>
                          <input 
                            type="range" min="0" max="200" step="10"
                            value={localTheme.glassyConfig.saturation}
                            onChange={e => setLocalTheme(prev => ({ ...prev, glassyConfig: { ...prev.glassyConfig, saturation: parseInt(e.target.value) } }))}
                            className="w-full h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Background */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Background</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="none"
                      checked={localTheme.backgroundType as any === 'none'}
                      onChange={() => setLocalTheme(prev => ({ ...prev, backgroundType: 'none' as any }))}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">None (Solid Color)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="base1"
                      checked={localTheme.backgroundType === 'base1'}
                      onChange={() => setLocalTheme(prev => ({ ...prev, backgroundType: 'base1' }))}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Base 1 (Dotted Grid)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="base2"
                      checked={localTheme.backgroundType === 'base2'}
                      onChange={() => setLocalTheme(prev => ({ ...prev, backgroundType: 'base2' }))}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Base 2 (Line Grid)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="custom"
                      checked={localTheme.backgroundType === 'custom'}
                      onChange={() => setLocalTheme(prev => ({ ...prev, backgroundType: 'custom' }))}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Custom Image</span>
                  </label>
                  
                  {localTheme.backgroundType === 'custom' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <input
                        type="text"
                        value={localTheme.customBackgroundUrl || ''}
                        onChange={e => setLocalTheme(prev => ({ ...prev, customBackgroundUrl: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs outline-none focus:border-hw-blue"
                        style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border-color)' }}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] opacity-40 uppercase">OR</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setLocalTheme(prev => ({ ...prev, customBackgroundUrl: event.target.result as string }));
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

              {/* Desktop Icons */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Desktop Icons</h3>

                <div className="grid grid-cols-2 gap-4">
                  {APPS.map((app) => (
                    <label key={app.id} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.desktopIcons[app.id] !== false}
                        onChange={(e) => setLocalTheme(prev => ({ 
                          ...prev, 
                          desktopIcons: { ...prev.desktopIcons, [app.id]: e.target.checked } 
                        }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">
                        {app.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* TaskBar Style */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>TaskBar</h3>
                <div className="flex flex-col gap-6">
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="taskbarStyle"
                        value="fixed"
                        checked={localTheme.taskbarStyle === 'fixed'}
                        onChange={() => setLocalTheme(prev => ({ ...prev, taskbarStyle: 'fixed' }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Fixed (Classic)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="taskbarStyle"
                        value="panel"
                        checked={localTheme.taskbarStyle === 'panel'}
                        onChange={() => setLocalTheme(prev => ({ ...prev, taskbarStyle: 'panel' }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Panel (Modern)</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={localTheme.intellihide}
                        onChange={(e) => setLocalTheme(prev => ({ ...prev, intellihide: e.target.checked }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">Intellihide (Auto-hide)</span>
                    </label>

                    {localTheme.intellihide && (
                      <div className="flex items-center justify-between pt-2 border-t border-hw-blue/10" style={{ borderColor: 'var(--theme-border-color)' }}>
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Hide Delay</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono">{localTheme.hideDelay}ms</span>
                          <input 
                            type="range" min="0" max="2000" step="100"
                            value={localTheme.hideDelay}
                            onChange={e => setLocalTheme(prev => ({ ...prev, hideDelay: parseInt(e.target.value) }))}
                            className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold uppercase tracking-widest border-b border-hw-blue/20 pb-2" style={{ borderColor: 'var(--theme-border-color)' }}>Performance</h3>
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center justify-between" style={{ borderColor: 'var(--theme-border-color)' }}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Animation Speed</span>
                    <span className="text-[8px] opacity-40 uppercase">Lower is faster</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold">{localTheme.animationSpeed}s</span>
                    <input 
                      type="range" min="0" max="1" step="0.1"
                      value={localTheme.animationSpeed}
                      onChange={e => setLocalTheme(prev => ({ ...prev, animationSpeed: parseFloat(e.target.value) }))}
                      className="w-32 h-1 bg-hw-blue/20 rounded-lg appearance-none cursor-pointer accent-hw-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 flex items-center gap-4">
                <button type="submit" className="hw-button flex items-center gap-2 px-8 py-3">
                  <Save size={16} />
                  SAVE PREFERENCES
                </button>
                {themeMsg && (
                  <span className="text-[10px] text-hw-blue uppercase tracking-widest animate-pulse">{themeMsg}</span>
                )}
              </div>
            </form>
          </div>
        )}
        {activeTab === 'appearance' && (
          <div className="max-w-4xl">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5" /> Advanced Color Manager
            </h2>
            
            <div className="space-y-8">
              <div className="bg-hw-blue/5 border border-hw-blue/20 p-4 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">
                  Customize granular colors for each theme mode. These settings are applied when "Use Advanced Colors" is enabled in Preferences.
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localTheme.useGranular}
                      onChange={(e) => setLocalTheme(prev => ({ ...prev, useGranular: e.target.checked }))}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue">Enable Advanced Colors</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {(['retro_dark', 'retro_light', 'glassy_dark', 'glassy_light'] as ThemeMode[]).map(mode => (
                  <div key={mode} className="space-y-4 p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg" style={{ borderColor: 'var(--theme-border-color)' }}>
                    <div className="flex items-center justify-between border-b border-hw-blue/20 pb-2 mb-4" style={{ borderColor: 'var(--theme-border-color)' }}>
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-hw-blue">
                        {mode.replace('_', ' ')}
                      </h3>
                      <button 
                        onClick={() => {
                          setLocalTheme(prev => ({
                            ...prev,
                            granularSettings: {
                              ...prev.granularSettings,
                              [mode]: defaultGranular[mode]
                            }
                          }));
                        }}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Window Controls */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Window Frame</span>
                        <div className="grid grid-cols-2 gap-4">
                          <ColorInput 
                            label="Frame BG" 
                            value={localTheme.granularSettings[mode].windowFrame} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], windowFrame: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Header BG" 
                            value={localTheme.granularSettings[mode].windowHeader} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], windowHeader: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Title Text" 
                            value={localTheme.granularSettings[mode].windowTitle} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], windowTitle: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Border" 
                            value={localTheme.granularSettings[mode].windowBorder} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], windowBorder: val }
                              }
                            }))} 
                          />
                        </div>
                      </div>

                      {/* Content Controls */}
                      <div className="space-y-3 pt-2 border-t border-hw-blue/5" style={{ borderColor: 'var(--theme-border-color)' }}>
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Content Area</span>
                        <div className="grid grid-cols-2 gap-4">
                          <ColorInput 
                            label="Content BG" 
                            value={localTheme.granularSettings[mode].contentBg} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], contentBg: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Content Text" 
                            value={localTheme.granularSettings[mode].contentText} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], contentText: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Accent Color" 
                            value={localTheme.granularSettings[mode].accentColor} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], accentColor: val }
                              }
                            }))} 
                          />
                        </div>
                      </div>

                      {/* Code/String Controls */}
                      <div className="space-y-3 pt-2 border-t border-hw-blue/5" style={{ borderColor: 'var(--theme-border-color)' }}>
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Syntax Highlighting</span>
                        <div className="grid grid-cols-2 gap-4">
                          <ColorInput 
                            label="Strings" 
                            value={localTheme.granularSettings[mode].stringColor} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], stringColor: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Keywords" 
                            value={localTheme.granularSettings[mode].keywordColor} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], keywordColor: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Numbers" 
                            value={localTheme.granularSettings[mode].numberColor} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], numberColor: val }
                              }
                            }))} 
                          />
                          <ColorInput 
                            label="Comments" 
                            value={localTheme.granularSettings[mode].commentColor} 
                            onChange={val => setLocalTheme(prev => ({
                              ...prev,
                              granularSettings: {
                                ...prev.granularSettings,
                                [mode]: { ...prev.granularSettings[mode], commentColor: val }
                              }
                            }))} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 flex items-center gap-4">
                <button onClick={handleSaveTheme} className="hw-button flex items-center gap-2 px-8 py-3">
                  <Save size={16} />
                  APPLY ALL COLORS
                </button>
                {themeMsg && (
                  <span className="text-[10px] text-hw-blue uppercase tracking-widest animate-pulse">{themeMsg}</span>
                )}
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

        {(activeTab === 'serial' || activeTab === 'network' || activeTab === 'bluetooth') && (
          <div className="flex flex-col items-center justify-center h-full text-hw-blue/40">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-[10px] uppercase tracking-widest">Module Not Implemented</p>
            <p className="text-xs mt-2">This configuration panel is under construction.</p>
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
