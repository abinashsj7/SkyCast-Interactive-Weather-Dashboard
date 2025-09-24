SkyCast: Interactive Weather Dashboard

Author  : Abinash SJ  
College : Sri Sairam Institute of Technology, Chennai (CSE)

Description
SkyCast is an interactive weather dashboard that fetches **real-time weather** and **5-day forecasts** using the OpenWeatherMap API.  
Features include city search, geolocation, unit toggle, favorites, and a forecast chart.

Features
- Search weather by city  
- Use 📍 button for current location  
- 5-day forecast with chart (Chart.js)  
- Save favorite cities (LocalStorage)  
- Toggle units °C / °F  
- Responsive design  

Setup
1. Create a free API key at [OpenWeatherMap](https://openweathermap.org/).  
2. In `config.js`, paste your API key:
   ```js
   const OPENWEATHER_API_KEY = "YOUR_KEY_HERE";
