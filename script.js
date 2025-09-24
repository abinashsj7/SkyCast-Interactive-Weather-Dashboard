
const API_BASE = "https://api.openweathermap.org/data/2.5";
const $ = id => document.getElementById(id);

let currentUnit = localStorage.getItem("owm_units") || "metric";
$("unitSelect").value = currentUnit;

let forecastChart = null;
let lastCity = localStorage.getItem("owm_lastCity") || null;
let favorites = JSON.parse(localStorage.getItem("owm_favs") || "[]");


async function fetchJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}


function currentWeatherUrlByCity(city, units){
  return `${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}
function forecastUrlByCity(city, units){
  return `${API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}
function currentWeatherUrlByCoords(lat, lon, units){
  return `${API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}
function forecastUrlByCoords(lat, lon, units){
  return `${API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
}


function showError(message){
  const card = $("currentCard");
  card.classList.remove("empty");
  card.innerHTML = `<p style="color:#b91c1c">${message}</p>`;
}
function renderCurrent(data){
  const card = $("currentCard");
  const icon = data.weather?.[0]?.icon || "01d";
  const desc = data.weather?.[0]?.description || "";
  const temp = Math.round(data.main.temp);
  const city = `${data.name}, ${data.sys?.country || ""}`;
  const humidity = data.main.humidity;
  const wind = data.wind.speed;
  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();

  card.classList.remove("empty");
  card.innerHTML = `
    <div class="current-left">
      <div class="city-name">${city}</div>
      <div class="desc small-muted">${desc}</div>
      <div class="temp">${temp}°${currentUnit === "metric" ? "C" : "F"}</div>
      <div class="small-muted">Humidity: ${humidity}% • Wind: ${wind} ${currentUnit === "metric" ? "m/s" : "mph"}</div>
    </div>
    <div class="current-right">
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
      <div class="small-muted">Sun: ${sunrise} • ${sunset}</div>
    </div>
  `;

  
  const dlist = $("detailsList");
  dlist.innerHTML = `
    <li>Humidity: ${humidity}%</li>
    <li>Wind: ${wind} ${currentUnit === "metric" ? "m/s" : "mph"}</li>
    <li>Sunrise: ${sunrise}</li>
    <li>Sunset: ${sunset}</li>
  `;
}


function processForecastList(list){
  const byDate = {};
  list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if(!byDate[date]) byDate[date] = [];
    byDate[date].push(item);
  });

 
  const days = Object.keys(byDate).slice(0, 6).map(date => {
    const arr = byDate[date];
    const temps = arr.map(i => i.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    
    const mid = arr.find(i => i.dt_txt.includes("12:00:00")) || arr[Math.floor(arr.length/2)];
    const icon = mid.weather?.[0]?.icon;
    return { date, min, max, icon, avg: Math.round(temps.reduce((a,b)=>a+b,0)/temps.length) };
  });


  return days.slice(0,5);
}

function renderForecast(days){
  const container = $("forecastList");
  container.innerHTML = "";
  const labels = [];
  const temps = [];
  days.forEach((d, idx) => {
    const el = document.createElement("div");
    el.className = "forecast-day";
    el.dataset.index = idx;
    el.innerHTML = `
      <div class="date">${new Date(d.date).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</div>
      <img src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="" />
      <div class="minmax">${d.max}° / ${d.min}°</div>
    `;
    el.addEventListener("click", () => highlightDay(idx));
    container.appendChild(el);
    labels.push(new Date(d.date).toLocaleDateString(undefined,{weekday:'short'}));
    temps.push(d.avg);
  });
  updateChart(labels, temps);
}

function highlightDay(index){
  const nodes = document.querySelectorAll(".forecast-day");
  nodes.forEach(n => n.classList.remove("active"));
  const node = Array.from(nodes)[index];
  if(node) node.classList.add("active");
  
  if(forecastChart){
    forecastChart.data.datasets[0].pointRadius = forecastChart.data.labels.map((_,i)=> i===index?7:3);
    forecastChart.update();
  }
}

function updateChart(labels, data){
  const ctx = $("forecastChart").getContext("2d");
  if(forecastChart) forecastChart.destroy();
  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `Avg Temp (${currentUnit === "metric" ? "°C" : "°F"})`,
        data,
        fill:false,
        tension:0.25,
        pointRadius:3,
      }]
    },
    options: {
      responsive:true,
      plugins: { legend:{display:false} },
      scales:{ y:{ beginAtZero:false } }
    }
  });
}


function loadFavoritesUI(){
  const fdiv = $("favorites");
  fdiv.innerHTML = "";
  favorites.forEach(city => {
    const btn = document.createElement("button");
    btn.className = "fav-btn";
    btn.textContent = city;
    btn.addEventListener("click", ()=> searchCity(city));
    btn.addEventListener("contextmenu", e => {
      e.preventDefault();
   
      if(confirm(`Remove ${city} from favorites?`)){
        favorites = favorites.filter(c=>c!==city);
        saveFavs();
        loadFavoritesUI();
      }
    });
    fdiv.appendChild(btn);
  });
}
function saveFavs(){ localStorage.setItem("owm_favs", JSON.stringify(favorites)); }

function addFavoriteFromInput(){
  const val = $("favInput").value.trim();
  if(!val) return alert("Enter city name");
  if(!favorites.includes(val)){
    favorites.push(val);
    saveFavs();
    loadFavoritesUI();
    $("favInput").value = "";
  } else alert("Already in favorites");
}

// Search flow
async function searchCity(city){
  try{
    showLoading();
    const units = currentUnit;
    const curr = await fetchJSON(currentWeatherUrlByCity(city, units));
    const fc = await fetchJSON(forecastUrlByCity(city, units));
    renderCurrent(curr);
    const days = processForecastList(fc.list);
    renderForecast(days);
    lastCity = curr.name;
    localStorage.setItem("owm_lastCity", lastCity);
  } catch(err){
    console.error(err);
    showError("Could not fetch weather. Check city name or your API key.");
  }
}

async function searchByCoords(lat, lon){
  try{
    showLoading();
    const units = currentUnit;
    const curr = await fetchJSON(currentWeatherUrlByCoords(lat, lon, units));
    const fc = await fetchJSON(forecastUrlByCoords(lat, lon, units));
    renderCurrent(curr);
    const days = processForecastList(fc.list);
    renderForecast(days);
    lastCity = curr.name;
    localStorage.setItem("owm_lastCity", lastCity);
  } catch(err){
    console.error(err);
    showError("Could not fetch weather by location.");
  }
}

function showLoading(){
  const card = $("currentCard");
  card.classList.remove("empty");
  card.innerHTML = `<p class="small-muted">Loading…</p>`;
}


$("searchBtn").addEventListener("click", ()=> {
  const val = $("cityInput").value.trim();
  if(val) searchCity(val);
});
$("cityInput").addEventListener("keypress", e => {
  if(e.key === "Enter") $("searchBtn").click();
});
$("geoBtn").addEventListener("click", ()=>{
  if(!navigator.geolocation) return alert("Geolocation not supported.");
  navigator.geolocation.getCurrentPosition(p=>{
    searchByCoords(p.coords.latitude, p.coords.longitude);
  }, err=>{
    alert("Location permission denied or unavailable.");
  });
});
$("addFavBtn").addEventListener("click", addFavoriteFromInput);
$("unitSelect").addEventListener("change", ()=>{
  currentUnit = $("unitSelect").value;
  localStorage.setItem("owm_units", currentUnit);
  // re-run last search
  if(lastCity) searchCity(lastCity);
});


(function init(){
  loadFavoritesUI();
  if(lastCity){
   
    searchCity(lastCity);
  } else {
    // optionally use geolocation automatically (commented)
    // navigator.geolocation.getCurrentPosition(p => searchByCoords(p.coords.latitude,p.coords.longitude));
  }
})();

