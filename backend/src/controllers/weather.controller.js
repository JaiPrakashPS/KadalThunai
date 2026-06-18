const asyncHandler = require('../middleware/asyncHandler');
const { getWeatherByCoords } = require('../services/weather.service');

// GET /api/v1/weather?lat=&lng=
const getWeather = asyncHandler(async (req, res) => {
  const lat = req.query.lat;
  const lng = req.query.lng || req.query.lon;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng (or lon) query parameters are required.' });
  }

  const rawData = await getWeatherByCoords(parseFloat(lat), parseFloat(lng));
  
  // Format data to expose flat keys directly for frontend weather cards/widgets
  const formatted = {
    temperature: rawData.current?.temp ?? 28,
    temp: rawData.current?.temp ?? 28,
    feelsLike: rawData.current?.feelsLike ?? 32,
    feels_like: rawData.current?.feelsLike ?? 32,
    condition: rawData.current?.weatherMain || rawData.current?.weatherDesc || 'Clear',
    description: rawData.current?.weatherDesc || 'clear sky',
    humidity: rawData.current?.humidity ?? 78,
    windSpeed: rawData.current?.windSpeed ?? 5.2,
    wind_speed: rawData.current?.windSpeed ?? 5.2,
    windDirection: rawData.current?.windDirection ?? 180,
    visibility: rawData.current?.visibility ?? 10000,
    pressure: rawData.current?.pressure ?? 1012,
    uvIndex: rawData.current?.uvIndex || 5,
    lastUpdated: rawData.fetchedAt,
    fetchedAt: rawData.fetchedAt,
    alerts: rawData.alerts || [],
    forecast: rawData.forecast || [],
    current: rawData.current,
  };

  res.json({ success: true, data: formatted });
});

module.exports = { getWeather };
