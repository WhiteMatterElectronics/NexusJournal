import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudLightning, Sun, Wind, Thermometer, MapPin, Search, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  forecast: { day: string, temp: number, condition: string }[];
}

const MOCK_WEATHER: WeatherData = {
  temp: 22,
  condition: 'Partly Cloudy',
  humidity: 45,
  windSpeed: 12,
  location: 'Bucharest, RO',
  forecast: [
    { day: 'MON', temp: 24, condition: 'Sunny' },
    { day: 'TUE', temp: 21, condition: 'Rain' },
    { day: 'WED', temp: 19, condition: 'Cloudy' },
    { day: 'THU', temp: 23, condition: 'Partly Cloudy' },
    { day: 'FRI', temp: 25, condition: 'Sunny' },
  ]
};

export const WeatherApp: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData>(MOCK_WEATHER);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hw_weather_api_key') || '');

  const refreshWeather = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setWeather(MOCK_WEATHER);
    setLoading(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('hw_weather_api_key', apiKey);
    setShowSettings(false);
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny': return <Sun className="text-yellow-400" />;
      case 'rain': return <CloudRain className="text-blue-400" />;
      case 'cloudy': return <Cloud className="text-gray-400" />;
      case 'partly cloudy': return <Cloud className="text-blue-200" />;
      case 'lightning': return <CloudLightning className="text-purple-400" />;
      default: return <Cloud />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-hw-black text-hw-blue font-mono overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-hw-blue/20 bg-hw-blue/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{weather.location}</span>
          </div>
          <button onClick={refreshWeather} className={cn("p-1 hover:bg-hw-blue/20 rounded transition-all", loading && "animate-spin")}>
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" size={12} />
            <input 
              type="text"
              placeholder="SEARCH LOCATION..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-hw-blue/10 border border-hw-blue/20 rounded px-8 py-1 text-[10px] focus:outline-none focus:border-hw-blue/50 w-48"
            />
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1 hover:bg-hw-blue/20 rounded">
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {showSettings ? (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] border-b border-hw-blue/20 pb-2">Weather Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase opacity-60">OpenWeather API Key</label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="ENTER API KEY..."
                  className="w-full bg-hw-blue/10 border border-hw-blue/20 rounded px-3 py-2 text-[10px] focus:outline-none focus:border-hw-blue/50"
                />
                <p className="text-[8px] opacity-40 uppercase">Leave empty to use default mock data</p>
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full hw-button py-2 text-[10px]"
              >
                SAVE CONFIGURATION
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Weather */}
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="text-6xl font-bold tracking-tighter flex items-start">
                  {weather.temp}
                  <span className="text-2xl mt-2">°C</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-bold uppercase tracking-widest">{weather.condition}</div>
                  <div className="text-[10px] opacity-60 uppercase">Feels like {weather.temp - 2}°C</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center gap-4">
                  <Thermometer className="opacity-40" />
                  <div>
                    <div className="text-[8px] uppercase opacity-40">Humidity</div>
                    <div className="text-sm font-bold">{weather.humidity}%</div>
                  </div>
                </div>
                <div className="p-4 bg-hw-blue/5 border border-hw-blue/10 rounded-lg flex items-center gap-4">
                  <Wind className="opacity-40" />
                  <div>
                    <div className="text-[8px] uppercase opacity-40">Wind Speed</div>
                    <div className="text-sm font-bold">{weather.windSpeed} km/h</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60">5-Day Forecast</h3>
              <div className="space-y-2">
                {weather.forecast.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-hw-blue/5 border border-hw-blue/10 rounded-lg hover:bg-hw-blue/10 transition-colors">
                    <span className="text-[10px] font-bold w-12">{f.day}</span>
                    <div className="flex items-center gap-3">
                      {getWeatherIcon(f.condition)}
                      <span className="text-[10px] uppercase opacity-60">{f.condition}</span>
                    </div>
                    <span className="text-[10px] font-bold">{f.temp}°C</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 242, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};
