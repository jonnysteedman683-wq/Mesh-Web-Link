import React, { useState, useEffect } from 'react';
import { WeatherReport, LinkedDevice, BiometricSessionState } from '../types';
import { weatherManager } from '../services/weatherManager';
import { deviceManager } from '../services/deviceManager';
import { meshFabric } from '../fabric/meshFabric';
import { 
  Sun, 
  CloudSun, 
  CloudRain, 
  Wind, 
  Compass, 
  Thermometer, 
  Gauge, 
  Droplets, 
  Radio, 
  Cpu, 
  ChevronDown, 
  Home as HomeIcon, 
  FileText, 
  Settings, 
  CheckCircle2, 
  Wifi, 
  Battery, 
  Server, 
  Tablet, 
  ShieldAlert, 
  Activity,
  Maximize2,
  Fingerprint,
  RefreshCw
} from 'lucide-react';

interface TopWeatherAndDevicesBarProps {
  onGoHome: () => void;
  onOpenLogs: () => void;
  onOpenDeviceModal: () => void;
  isCitadelMode?: boolean;
}

export const TopWeatherAndDevicesBar: React.FC<TopWeatherAndDevicesBarProps> = ({
  onGoHome,
  onOpenLogs,
  onOpenDeviceModal,
  isCitadelMode = false
}) => {
  const [weather, setWeather] = useState<WeatherReport>(weatherManager.getWeather());
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false);
  const [devices, setDevices] = useState<LinkedDevice[]>(deviceManager.getDevices());
  const [biometricSession, setBiometricSession] = useState<BiometricSessionState | null>(() => meshFabric.getBiometricSession());

  useEffect(() => {
    const unsubWeather = weatherManager.subscribe(w => setWeather(w));
    const unsubDevices = deviceManager.subscribe(d => setDevices(d));
    const unsubFabric = meshFabric.subscribe(() => setBiometricSession(meshFabric.getBiometricSession()));
    return () => {
      unsubWeather();
      unsubDevices();
      unsubFabric();
    };
  }, []);

  const stations = weatherManager.getAvailableStations();
  const connectedCount = devices.filter(d => d.status === 'CONNECTED').length;

  const getWeatherIcon = (cond: string) => {
    if (cond.includes('Clear')) return <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />;
    if (cond.includes('Cloud')) return <CloudSun className="w-3.5 h-3.5 text-sky-400" />;
    if (cond.includes('Rain') || cond.includes('Storm')) return <CloudRain className="w-3.5 h-3.5 text-indigo-400" />;
    return <Sun className="w-3.5 h-3.5 text-amber-400" />;
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'uav_recon': return <Radio className="w-3 h-3 text-cyan-400" />;
      case 'command_terminal': return <Server className="w-3 h-3 text-indigo-400" />;
      case 'field_tablet': return <Tablet className="w-3 h-3 text-emerald-400" />;
      case 'satellite_transceiver': return <Wifi className="w-3 h-3 text-purple-400" />;
      case 'rf_jammer_pod': return <ShieldAlert className="w-3 h-3 text-rose-400" />;
      case 'biometric_monitor': return <Activity className="w-3 h-3 text-amber-400" />;
      default: return <Cpu className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className={`w-full border-b text-xs transition-colors select-none z-40 ${
      isCitadelMode 
        ? 'bg-slate-100 border-slate-300 text-slate-800' 
        : 'bg-slate-950/95 border-slate-800/80 text-slate-300 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Section: Universal HOME button + Weather telemetry */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Universal HOME Button (Required on EVERY page) */}
          <button
            id="btn-universal-home"
            onClick={onGoHome}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all cursor-pointer group ${
              isCitadelMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950 font-mono tracking-wider'
            }`}
            title="Navigate to 4D Geometric Hexagonal Homepage"
          >
            <HomeIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>Home</span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
              isCitadelMode ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-950 text-cyan-300'
            }`}>
              4D SPACE
            </span>
          </button>

          <div className={`h-4 w-px ${isCitadelMode ? 'bg-slate-300' : 'bg-slate-800'}`} />

          {/* Local Weather Conditions & Temperature */}
          <div className="relative flex items-center space-x-2">
            <button
              onClick={() => setStationDropdownOpen(!stationDropdownOpen)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors cursor-pointer ${
                isCitadelMode
                  ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-200 shadow-inner'
              }`}
              title="Click to switch weather telemetry station"
            >
              {getWeatherIcon(weather.condition)}
              <span className="font-bold font-mono">
                {useFahrenheit ? `${weather.tempFahrenheit}°F` : `${weather.tempCelsius}°C`}
              </span>
              <span className="text-[11px] opacity-80 hidden md:inline">
                {weather.condition}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Quick °C / °F Toggle */}
            <button
              onClick={() => setUseFahrenheit(!useFahrenheit)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                isCitadelMode
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Toggle Celsius / Fahrenheit"
            >
              {useFahrenheit ? '°C' : '°F'}
            </button>

            {/* Extended Weather Metrics (Barometer, Wind, Humidity, RF) */}
            <div className="hidden lg:flex items-center space-x-3 text-[11px] font-mono opacity-90 pl-1">
              <div className="flex items-center space-x-1" title="Barometric Pressure">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>{weather.barometricPressureHpa} hPa</span>
              </div>
              <div className="flex items-center space-x-1" title="Wind Velocity">
                <Wind className="w-3 h-3 text-sky-400" />
                <span>{weather.windSpeedKts} kts {weather.windCompass}</span>
              </div>
              <div className="flex items-center space-x-1" title="Humidity">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span>{weather.humidityPercent}%</span>
              </div>
              <div className="flex items-center space-x-1" title="Tactical RF Propagation Index">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">RF: {weather.tacticalRfIndex}</span>
              </div>
            </div>

            {/* Station Dropdown Menu */}
            {stationDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1.5 w-72 rounded-xl border p-2 shadow-xl z-50 animate-in fade-in ${
                isCitadelMode 
                  ? 'bg-white border-slate-300 text-slate-900' 
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 font-mono flex items-center justify-between">
                  <span>Weather Telemetry Array</span>
                  <button
                    id="btn-sync-live-satellite"
                    onClick={(e) => {
                      e.stopPropagation();
                      weatherManager.fetchLiveRealWorldWeather();
                    }}
                    className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer flex items-center gap-1"
                    title="Fetch live GPS/satellite meteorological data from Open-Meteo"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                    <span>Sync Live Satellites</span>
                  </button>
                </div>
                {stations.map(st => (
                  <button
                    key={st.stationId}
                    onClick={() => {
                      weatherManager.switchStation(st.stationId);
                      setStationDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      weather.stationId === st.stationId
                        ? isCitadelMode ? 'bg-indigo-50 text-indigo-900 font-bold' : 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/60'
                        : isCitadelMode ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{st.stationName}</div>
                      <div className="text-[10px] opacity-70 font-mono">{st.coordinates}</div>
                    </div>
                    <div className="text-right font-mono font-bold">
                      {st.tempCelsius}°C
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Connected Devices Details + Set Devices We Need + Logs Section */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Connected / Linked Devices Section Details */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold">{connectedCount}/{devices.length} Devices Linked:</span>
            </div>

            {/* Quick device preview badges (First 3 devices) */}
            <div className="hidden sm:flex items-center gap-1.5">
              {devices.slice(0, 3).map(dev => (
                <div
                  key={dev.id}
                  onClick={onOpenDeviceModal}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-all hover:scale-105 ${
                    isCitadelMode
                      ? 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                  title={`${dev.name} (${dev.hardwareModel}) - ${dev.status}`}
                >
                  {getDeviceIcon(dev.type)}
                  <span className="font-semibold truncate max-w-[85px]">{dev.id}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${dev.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>
              ))}
              {devices.length > 3 && (
                <span 
                  onClick={onOpenDeviceModal}
                  className="text-[10px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 cursor-pointer hover:bg-cyan-900"
                >
                  +{devices.length - 3} more
                </span>
              )}
            </div>

            {/* "Set Devices" Button to configure / add / manage devices we need */}
            <button
              id="btn-set-devices"
              onClick={onOpenDeviceModal}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                isCitadelMode
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-800/60 hover:border-cyan-500 shadow-2xs'
              }`}
              title="Configure, link, and set devices we need for operations"
            >
              <Settings className="w-3 h-3 text-cyan-400" />
              <span>Set Devices</span>
            </button>

            {/* Cross-Fabric Biometric Sentinel Status */}
            <div
              className={`hidden md:flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] font-mono border transition-all ${
                biometricSession?.isVerified
                  ? isCitadelMode
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : isCitadelMode
                  ? 'bg-slate-200/80 text-slate-600 border-slate-300'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={
                biometricSession?.isVerified
                  ? `Biometric Clearance: ${biometricSession.operatorName} (${biometricSession.clearanceLevel})`
                  : 'Biometric Interlock: Standby. Pattern match required at Citadel Entrance.'
              }
            >
              <Fingerprint className={`w-3 h-3 ${biometricSession?.isVerified ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="font-bold">
                {biometricSession?.isVerified ? biometricSession.clearanceLevel.replace('LEVEL_', 'BIO LVL ') : 'BIO: LOCKED'}
              </span>
            </div>
          </div>

          <div className={`h-4 w-px ${isCitadelMode ? 'bg-slate-300' : 'bg-slate-800'}`} />

          {/* Dedicated Logs Section Button */}
          <button
            id="btn-open-logs"
            onClick={onOpenLogs}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              isCitadelMode
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
            }`}
            title="Open comprehensive system event, telemetry, and audit logs"
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span>Logs</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 font-mono font-bold border border-amber-800/40">
              STREAM
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
