import React, { useState } from 'react';
import { User, Sliders, Monitor, Wifi, Bluetooth, Save, AlertCircle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { cn } from '../../lib/utils';

export const SettingsApp: React.FC = () => {
  const { profile, updateProfile, theme, updateTheme } = useSettings();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'serial' | 'network' | 'bluetooth'>('profile');

  // Profile State
  const [name, setName] = useState(profile.name);
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Theme State
  const [mainColor, setMainColor] = useState(theme.mainColor);
  const [terminalColor, setTerminalColor] = useState(theme.terminalColor);
  const [globalTheme, setGlobalTheme] = useState(theme.globalTheme);
  const [bgType, setBgType] = useState(theme.backgroundType);
  const [customBgUrl, setCustomBgUrl] = useState(theme.customBackgroundUrl || '');
  const [desktopIcons, setDesktopIcons] = useState(theme.desktopIcons || {
    'console': true,
    'eeprom': true,
    'rfid': true,
    'binary': true,
    'cyphonator': true,
    'flasher': true,
    'admin': true,
    'settings': true
  });

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
    updateTheme({
      mainColor,
      terminalColor,
      globalTheme,
      backgroundType: bgType,
      customBackgroundUrl: customBgUrl,
      desktopIcons
    });
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'User Profile' },
    { id: 'preferences', icon: Sliders, label: 'Preferences' },
    { id: 'serial', icon: Monitor, label: 'Serial' },
    { id: 'network', icon: Wifi, label: 'Network' },
    { id: 'bluetooth', icon: Bluetooth, label: 'Bluetooth' },
  ] as const;

  return (
    <div className="flex h-full bg-black/60">
      {/* Sidebar */}
      <div className="w-48 border-r border-hw-blue/20 bg-hw-blue/5 flex flex-col shrink-0">
        <div className="p-4 border-b border-hw-blue/20">
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
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'profile' && (
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest mb-6 flex items-center gap-2">
              <User className="w-5 h-5" /> User Profile
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs text-hw-blue outline-none focus:border-hw-blue"
                />
              </div>
              <div className="pt-4 border-t border-hw-blue/10">
                {profile.passwordHash && (
                  <>
                    <label className="block text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest mb-1">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs text-hw-blue outline-none focus:border-hw-blue mb-4"
                      required
                    />
                  </>
                )}
                <label className="block text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest mb-1">New Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs text-hw-blue outline-none focus:border-hw-blue mb-4"
                />
                <label className="block text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs text-hw-blue outline-none focus:border-hw-blue"
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
                <h3 className="text-[12px] font-bold text-hw-blue/80 uppercase tracking-widest border-b border-hw-blue/20 pb-2">Colors</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest mb-2">Main Shell Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={mainColor}
                        onChange={e => setMainColor(e.target.value)}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs font-mono text-hw-blue">{mainColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-hw-blue/60 uppercase tracking-widest mb-2">Serial Terminal Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={terminalColor}
                        onChange={e => setTerminalColor(e.target.value)}
                        className="w-10 h-10 bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs font-mono text-hw-blue">{terminalColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Style */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold text-hw-blue/80 uppercase tracking-widest border-b border-hw-blue/20 pb-2">Global Theme</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="globalTheme"
                      value="retro"
                      checked={globalTheme === 'retro'}
                      onChange={() => setGlobalTheme('retro')}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 group-hover:text-hw-blue">Retro Terminal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="globalTheme"
                      value="glassy"
                      checked={globalTheme === 'glassy'}
                      onChange={() => setGlobalTheme('glassy')}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 group-hover:text-hw-blue">Modern Glassy</span>
                  </label>
                </div>
              </div>

              {/* Background */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold text-hw-blue/80 uppercase tracking-widest border-b border-hw-blue/20 pb-2">Background</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="base1"
                      checked={bgType === 'base1'}
                      onChange={() => setBgType('base1')}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 group-hover:text-hw-blue">Base 1 (Dotted Grid)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="base2"
                      checked={bgType === 'base2'}
                      onChange={() => setBgType('base2')}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 group-hover:text-hw-blue">Base 2 (Line Grid)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="bgType"
                      value="custom"
                      checked={bgType === 'custom'}
                      onChange={() => setBgType('custom')}
                      className="accent-hw-blue"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 group-hover:text-hw-blue">Custom Image</span>
                  </label>
                  
                  {bgType === 'custom' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <input
                        type="text"
                        value={customBgUrl}
                        onChange={e => setCustomBgUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs text-hw-blue outline-none focus:border-hw-blue"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-hw-blue/40 uppercase">OR</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setCustomBgUrl(event.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-[10px] text-hw-blue file:mr-4 file:py-1 file:px-3 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-hw-blue/10 file:text-hw-blue hover:file:bg-hw-blue/20 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Icons */}
              <div className="space-y-4">
                <h3 className="text-[12px] font-bold text-hw-blue/80 uppercase tracking-widest border-b border-hw-blue/20 pb-2">Desktop Icons</h3>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(desktopIcons).map(([appId, isEnabled]) => (
                    <label key={appId} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => setDesktopIcons(prev => ({ ...prev, [appId]: e.target.checked }))}
                        className="accent-hw-blue"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-hw-blue/60 group-hover:text-hw-blue">
                        {appId}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="hw-button flex items-center gap-2">
                <Save className="w-4 h-4" /> Apply Preferences
              </button>
            </form>
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
