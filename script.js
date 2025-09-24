const API_BASE = "https://api.openweathermap.org/data/2.5";
const $ = id => document.getElementById(id);

let currentUnit = localStorage.getItem("units") || "metric";
$("unitSelect").value = currentUnit;

let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let lastCity = localStorage.getItem("lastCity") || null;
let forecastChart = null;

// API helpers
function currentWeatherUrl(city, units) {
  return `${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}
function forecastUrl(city, units) {
  return `${API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}
function coordsWeatherUrl(lat, lon, units) {
  return `${API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}
function coordsForecastUrl(lat, lon, units) {
  return `${API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// Render current weather
function renderCurrent(data) {
  const card = $("currentCard");
  const temp = Math.round(data.main.temp);
  const desc = data.weather[0].description;
  const icon = data.weather[0].icon;
  const city = `${data.name}, ${data.sys.country}`;

  card.classList.remove("empty");
  card.innerHTML = `
    <div>
      <div class="city-name">${city}</div>
      <div class="desc small-muted">${desc}</div>
      <div class="temp">${temp}°${currentUnit === "metric" ? "C" : "F"}</div>
    </div>
    <div>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="">
    </div>
  `;

  $("detailsList").innerHTML = `
    <li>Humidity: ${data.main.humidity}%</li>
    <li>Wind: ${data.wind.speed} ${currentUnit === "metric" ? "m/s" : "mph"}</li>
    <li>Sunrise: ${new Date(data.sys.sunrise * 1000).toLocaleTimeString()}</li>
    <li>Sunset: ${new Date(data.sys.sunset * 1000).toLocaleTimeString()}</li>
  `;
}

// Render forecast
function processForecast(list) {
  const byDate = {};
  list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(item);
  });

  return Object.keys(byDate).slice(0,5).map(date => {
    const temps = byDate[date].map(i => i.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const icon = byDate[date][0].weather[0].icon;
    return { date, min, max, icon };
  });
}

function renderForecast(days) {
  const container = $("forecastList");
  container.innerHTML = "";
  const labels = [];
  const avgs = [];

  days.forEach(d => {
    const avg = Math.round((d.min + d.max)/2);
    labels.push(new Date(d.date).toLocaleDateString(undefined,{weekday:"short"}));
    avgs.push(avg);

    container.innerHTML += `
      <div class="forecast-day">
        <div class="date">${new Date(d.date).toLocaleDateString()}</div>
        <img src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="">
        <div class="minmax">${d.max}° / ${d.min}°</div>
      </div>
    `;
  });

  updateChart(labels, avgs);
}

function updateChart(labels, data) {
  const ctx = $("forecastChart").getContext("2d");
  if (forecastChart) forecastChart.destroy();
  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{ data, label:"Avg Temp", fill:false, borderColor:"#2b8cff" }]
    }
  });
}

// Favorites
function loadFavorites() {
  $("favorites").innerHTML = favorites.map(c =>
    `<button class="fav-btn" onclick="searchCity('${c}')">${c}</button>`
  ).join("");
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

$("addFavBtn").onclick = () => {
  const val = $("favInput").value.trim();
  if (val && !favorites.includes(val)) {
    favorites.push(val);
    loadFavorites();
    $("favInput").value = "";
  }
};

// Search
async function searchCity(city) {
  try {
    const curr = await fetchJSON(currentWeatherUrl(city, currentUnit));
    const fc = await fetchJSON(forecastUrl(city, currentUnit));
    renderCurrent(curr);
    renderForecast(processForecast(fc.list));
    lastCity = curr.name;
    localStorage.setItem("lastCity", lastCity);
  } catch {
    $("currentCard").innerHTML = `<p style="color:red">City not found or API error</p>`;
  }
}

async function searchByCoords(lat, lon) {
  try {
    const curr = await fetchJSON(coordsWeatherUrl(lat, lon, currentUnit));
    const fc = await fetchJSON(coordsForecastUrl(lat, lon, currentUnit));
    renderCurrent(curr);
    renderForecast(processForecast(fc.list));
    lastCity = curr.name;
    localStorage.setItem("lastCity", lastCity);
  } catch {
    $("currentCard").innerHTML = `<p style="color:red">Location fetch failed</p>`;
  }
}

// Events
$("searchBtn").onclick = () => {
  const val = $("cityInput").value.trim();
  if (val) searchCity(val);
};
$("geoBtn").onclick = () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(p => {
    searchByCoords(p.coords.latitude, p.coords.longitude);
  });
};
$("unitSelect").onchange = () => {
  currentUnit = $("unitSelect").value;
  localStorage.setItem("units", currentUnit);
  if (lastCity) searchCity(lastCity);
};

// Init
loadFavorites();
if (lastCity) searchCity(lastCity);
