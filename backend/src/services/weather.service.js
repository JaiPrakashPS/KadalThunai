const axios = require('axios');
const { openWeather } = require('../config/env');

/**
 * Fetch current weather + forecast for given coordinates
 * Uses OpenWeatherMap One Call API 2.5
 */
const getWeatherByCoords = async (lat, lng) => {
  if (!openWeather.apiKey) {
    // Return mock data if no API key configured
    return getMockWeather(lat, lng);
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      axios.get(`${openWeather.baseUrl}/weather`, {
        params: { lat, lon: lng, appid: openWeather.apiKey, units: 'metric', lang: 'en' },
        timeout: 8000,
      }),
      axios.get(`${openWeather.baseUrl}/forecast`, {
        params: { lat, lon: lng, appid: openWeather.apiKey, units: 'metric', cnt: 24, lang: 'en' },
        timeout: 8000,
      }),
    ]);

    const current = currentRes.data;
    const forecast = forecastRes.data;

    return {
      current: {
        temp: current.main.temp,
        feelsLike: current.main.feels_like,
        humidity: current.main.humidity,
        pressure: current.main.pressure,
        windSpeed: current.wind.speed,
        windDirection: current.wind.deg,
        visibility: current.visibility,
        weatherMain: current.weather[0].main,
        weatherDesc: current.weather[0].description,
        weatherIcon: current.weather[0].icon,
        cloudiness: current.clouds.all,
        seaLevel: current.main.sea_level || null,
      },
      alerts: forecast.list
        .filter((f) => f.weather[0].main === 'Thunderstorm' || f.wind.speed > 10)
        .slice(0, 3)
        .map((f) => ({
          time: f.dt_txt,
          condition: f.weather[0].description,
          windSpeed: f.wind.speed,
        })),
      forecast: forecast.list.slice(0, 8).map((f) => ({
        time: f.dt_txt,
        temp: f.main.temp,
        windSpeed: f.wind.speed,
        condition: f.weather[0].description,
        icon: f.weather[0].icon,
        pop: f.pop, // probability of precipitation
      })),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    throw new Error('Failed to fetch weather data. Please try again later.');
  }
};

/**
 * Mock weather data for development without API key
 */
const getMockWeather = (lat, lng) => ({
  current: {
    temp: 28,
    feelsLike: 32,
    humidity: 78,
    pressure: 1012,
    windSpeed: 5.2,
    windDirection: 180,
    visibility: 10000,
    weatherMain: 'Clear',
    weatherDesc: 'clear sky',
    weatherIcon: '01d',
    cloudiness: 10,
    seaLevel: 1012,
  },
  alerts: [],
  forecast: [],
  fetchedAt: new Date().toISOString(),
  isMock: true,
  note: 'Set OPENWEATHER_API_KEY in .env for real data',
});

module.exports = { getWeatherByCoords };
