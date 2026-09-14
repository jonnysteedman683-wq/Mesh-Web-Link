import { WeatherReport } from '../types';
import { systemLogManager } from './systemLogManager';

export type WeatherListener = (report: WeatherReport) => void;

class WeatherManager {
  private report: WeatherReport;
  private listeners: WeatherListener[] = [];
  private readonly STORAGE_KEY = 'mesh_citadel_weather_v1';
  private isFetchingLive: boolean = false;

  private predefinedStations: WeatherReport[] = [
    {
      stationId: 'STA-LIVE-GEO',
      stationName: 'Live Sensor Array (Open-Meteo Satellite Feeds)',
      coordinates: 'Real-time GPS / IP Geolocation',
      tempCelsius: 18.5,
      tempFahrenheit: 65.3,
      condition: 'Live Satellite Telemetry',
      humidityPercent: 50,
      barometricPressureHpa: 1013.2,
      windSpeedKts: 9,
      windDirectionDeg: 270,
      windCompass: 'W',
      dewPointCelsius: 8.0,
      visibilityKm: 35.0,
      tacticalRfIndex: 'OPTIMAL',
      updatedAt: Date.now()
    },
    {
      stationId: 'STA-ALPHA-01',
      stationName: 'Tactical Recon Station Alpha',
      coordinates: '46.5197° N, 6.6323° E (Alt: 1,420m)',
      tempCelsius: 19.4,
      tempFahrenheit: 66.9,
      condition: 'Clear Skies',
      humidityPercent: 46,
      barometricPressureHpa: 1014.2,
      windSpeedKts: 11,
      windDirectionDeg: 315,
      windCompass: 'NW',
      dewPointCelsius: 7.8,
      visibilityKm: 45.0,
      tacticalRfIndex: 'OPTIMAL',
      updatedAt: Date.now()
    },
    {
      stationId: 'STA-CITADEL-ALPINE',
      stationName: 'Alpine Citadel Hardened Enclave',
      coordinates: '46.0207° N, 7.7491° E (Alt: 2,850m)',
      tempCelsius: 12.1,
      tempFahrenheit: 53.8,
      condition: 'High-Altitude Cirrus',
      humidityPercent: 38,
      barometricPressureHpa: 982.5,
      windSpeedKts: 18,
      windDirectionDeg: 280,
      windCompass: 'WNW',
      dewPointCelsius: -1.2,
      visibilityKm: 60.0,
      tacticalRfIndex: 'OPTIMAL',
      updatedAt: Date.now()
    },
    {
      stationId: 'STA-ORBITAL-RELAY',
      stationName: 'SATCOM Ground Link Site Gamma',
      coordinates: '37.4220° N, 122.0841° W (Alt: 32m)',
      tempCelsius: 22.8,
      tempFahrenheit: 73.0,
      condition: 'Partly Cloudy',
      humidityPercent: 54,
      barometricPressureHpa: 1016.8,
      windSpeedKts: 8,
      windDirectionDeg: 225,
      windCompass: 'SW',
      dewPointCelsius: 13.0,
      visibilityKm: 30.0,
      tacticalRfIndex: 'OPTIMAL',
      updatedAt: Date.now()
    }
  ];

  constructor() {
    this.report = this.predefinedStations[0];
    this.loadWeather();
    // Fetch real weather immediately on launch
    this.fetchLiveRealWorldWeather();
  }

  /**
   * Fetches real live weather from Open-Meteo free API without needing API keys
   */
  public async fetchLiveRealWorldWeather(latitude?: number, longitude?: number): Promise<boolean> {
    if (this.isFetchingLive) return false;
    this.isFetchingLive = true;

    try {
      let lat = latitude;
      let lon = longitude;

      // If coordinates not provided, check browser geolocation
      if (lat === undefined || lon === undefined) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          } catch {
            // Default to Geneva / Alps coordinates
            lat = 46.2044;
            lon = 6.1432;
          }
        } else {
          lat = 46.2044;
          lon = 6.1432;
        }
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kn`;
      const res = await fetch(url);
      if (!res.ok) {
        this.isFetchingLive = false;
        return false;
      }

      const data = await res.json();
      if (data && data.current) {
        const cur = data.current;
        const tempC = cur.temperature_2m;
        const tempF = parseFloat(((tempC * 9/5) + 32).toFixed(1));
        const pressure = cur.surface_pressure || 1013.2;
        const windKts = Math.round(cur.wind_speed_10m || 0);
        const windDeg = cur.wind_direction_10m || 0;
        const humidity = cur.relative_humidity_2m || 50;

        // Interpret WMO weather code
        const code = cur.weather_code || 0;
        let cond = 'Clear Skies';
        if (code === 1 || code === 2) cond = 'Partly Cloudy';
        else if (code === 3) cond = 'Overcast';
        else if (code >= 45 && code <= 48) cond = 'Fog / Mist';
        else if (code >= 51 && code <= 67) cond = 'Precipitation / Rain';
        else if (code >= 71 && code <= 77) cond = 'Snow Fall';
        else if (code >= 95) cond = 'Thunderstorm';

        const degToCompass = (deg: number) => {
          const val = Math.floor((deg / 45) + 0.5);
          const arr = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          return arr[val % 8];
        };

        this.report = {
          stationId: 'STA-LIVE-GEO',
          stationName: `Live Ground Station (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
          coordinates: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
          tempCelsius: tempC,
          tempFahrenheit: tempF,
          condition: cond,
          humidityPercent: humidity,
          barometricPressureHpa: parseFloat(pressure.toFixed(1)),
          windSpeedKts: windKts,
          windDirectionDeg: windDeg,
          windCompass: degToCompass(windDeg),
          dewPointCelsius: parseFloat((tempC - ((100 - humidity) / 5)).toFixed(1)),
          visibilityKm: cond.includes('Fog') ? 4.0 : 40.0,
          tacticalRfIndex: pressure > 1010 ? 'OPTIMAL' : 'DEGRADED',
          updatedAt: Date.now()
        };

        this.saveWeather();
        this.notify();

        systemLogManager.log(
          'INFO',
          'METEOROLOGY',
          `Live real-world Open-Meteo satellite feed updated: ${tempC}°C, ${pressure} hPa, Wind: ${windKts} kts ${degToCompass(windDeg)}.`,
          { lat, lon, tempC, pressure }
        );
        this.isFetchingLive = false;
        return true;
      }
    } catch (err) {
      console.warn('Live weather fetch notice:', err);
    }

    this.isFetchingLive = false;
    return false;
  }

  private loadWeather() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.stationId) {
            this.report = parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private saveWeather() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.report));
      }
    } catch (e) {
      // ignore
    }
  }

  public subscribe(cb: WeatherListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb({ ...this.report });
      } catch (err) {
        console.error('Weather listener error', err);
      }
    });
  }

  public getWeather(): WeatherReport {
    return { ...this.report };
  }

  public getAvailableStations(): WeatherReport[] {
    return [...this.predefinedStations];
  }

  public switchStation(stationId: string) {
    const found = this.predefinedStations.find(s => s.stationId === stationId);
    if (found) {
      this.report = { ...found, updatedAt: Date.now() };
      this.saveWeather();
      this.notify();
      systemLogManager.log(
        'INFO',
        'WEATHER',
        `Switched active weather telemetry station to ${found.stationName} (${found.tempCelsius}°C, ${found.condition}).`,
        { stationId, tempC: found.tempCelsius }
      );
    }
  }

  public updateWeather(updates: Partial<WeatherReport>) {
    this.report = {
      ...this.report,
      ...updates,
      updatedAt: Date.now()
    };
    if (updates.tempCelsius !== undefined && updates.tempFahrenheit === undefined) {
      this.report.tempFahrenheit = parseFloat(((this.report.tempCelsius * 9/5) + 32).toFixed(1));
    } else if (updates.tempFahrenheit !== undefined && updates.tempCelsius === undefined) {
      this.report.tempCelsius = parseFloat(((this.report.tempFahrenheit - 32) * 5/9).toFixed(1));
    }

    this.saveWeather();
    this.notify();
  }
}

export const weatherManager = new WeatherManager();
