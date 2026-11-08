
/* =====================================
   SKYCAST WEATHER DASHBOARD
   Open-Meteo API
===================================== */

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const errorMessage = document.getElementById("errorMessage");
const themeToggle = document.getElementById("themeToggle");
const locationBtn = document.getElementById("locationBtn");

const WEATHER_CODES = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    71: ["Light snowfall", "🌨️"],
    73: ["Snowfall", "❄️"],
    75: ["Heavy snowfall", "❄️"],
    80: ["Rain showers", "🌦️"],
    81: ["Moderate showers", "🌧️"],
    82: ["Heavy showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Severe thunderstorm", "⛈️"]
};

function getWeather(code) {
    return WEATHER_CODES[code] || ["Unknown conditions", "🌡️"];
}

function formatTime(time) {
    if (!time) return "--:--";

    const [hour, minute] = time.split("T")[1].split(":");
    const h = Number(hour);
    const suffix = h >= 12 ? "PM" : "AM";

    return `${h % 12 || 12}:${minute} ${suffix}`;
}

function formatDay(date, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";

    return new Date(`${date}T12:00:00`).toLocaleDateString(
        "en-US",
        { weekday: "short" }
    );
}

/* =====================================
   CITY SEARCH
===================================== */

async function getCityCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to search for this city.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Please check the spelling.");
    }

    return data.results[0];
}

/* =====================================
   FETCH WEATHER
===================================== */

async function getWeatherData(latitude, longitude) {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m` +
        `&hourly=temperature_2m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
        `&timezone=auto&forecast_days=5`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to load weather data.");
    }

    return await response.json();
}

/* =====================================
   MAIN SEARCH FUNCTION
===================================== */

async function searchCity(city) {
    const cleanedCity = city.trim();

    if (!cleanedCity) {
        errorMessage.textContent = "Please enter a city name.";
        return;
    }

    errorMessage.textContent = "";
    errorMessage.classList.add("loading");
    errorMessage.textContent = "Loading weather data...";

    document.getElementById("cityName").textContent = cleanedCity;
    document.getElementById("weatherCondition").textContent = "Please wait...";

    try {
        const place = await getCityCoordinates(cleanedCity);

        const weather = await getWeatherData(
            place.latitude,
            place.longitude
        );

        displayCurrentWeather(place, weather);
        displayWeatherDetails(weather);
        displayHourlyForecast(weather);
        displaySunTimes(weather);
        displayFiveDayForecast(weather);

        errorMessage.textContent = "";
        saveRecentSearch(place.name);

    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        errorMessage.classList.remove("loading");
    }
}

/* =====================================
   CURRENT WEATHER
===================================== */

function displayCurrentWeather(place, data) {
    const current = data.current;
    const [condition, icon] = getWeather(current.weather_code);

    document.getElementById("cityName").textContent =
        `${place.name}, ${place.country}`;

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    document.getElementById("weatherCondition").textContent = condition;
    document.getElementById("weatherIcon").textContent = icon;

    document.getElementById("temperature").textContent =
        `${Math.round(current.temperature_2m)}°`;

    document.getElementById("feelsLike").textContent =
        `${Math.round(current.apparent_temperature)}°C`;

    document.getElementById("dayNight").textContent =
        current.is_day ? "☀️ Daytime" : "🌙 Nighttime";
}

/* =====================================
   WEATHER DETAILS
===================================== */

function displayWeatherDetails(data) {
    const current = data.current;

    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}%`;

    document.getElementById("windSpeed").textContent =
        `${current.wind_speed_10m} km/h`;

    document.getElementById("pressure").textContent =
        `${Math.round(current.pressure_msl)} hPa`;

    document.getElementById("precipitation").textContent =
        `${current.precipitation} mm`;
}

/* =====================================
   HOURLY FORECAST
===================================== */

function displayHourlyForecast(data) {
    const grid = document.getElementById("hourlyGrid");
    const times = data.hourly.time;
    const currentTime = data.current.time;

    let startIndex = times.findIndex(time => time >= currentTime);

    if (startIndex === -1) startIndex = 0;

    const nextHours = times.slice(startIndex, startIndex + 6);

    grid.innerHTML = "";

    nextHours.forEach((time, offset) => {
        const index = startIndex + offset;
        const [condition, icon] =
            getWeather(data.hourly.weather_code[index]);

        const card = document.createElement("article");
        card.className = "hour-card";

        card.innerHTML = `
            <p>${offset === 0 ? "Now" : formatTime(time)}</p>
            <div class="hour-icon">${icon}</div>
            <h3>${Math.round(data.hourly.temperature_2m[index])}°</h3>
            <p>${condition}</p>
        `;

        grid.appendChild(card);
    });
}

/* =====================================
   SUNRISE & SUNSET
===================================== */

function displaySunTimes(data) {
    document.getElementById("sunrise").textContent =
        formatTime(data.daily.sunrise[0]);

    document.getElementById("sunset").textContent =
        formatTime(data.daily.sunset[0]);
}

/* =====================================
   FIVE DAY FORECAST
===================================== */

function displayFiveDayForecast(data) {
    const grid = document.getElementById("forecastGrid");
    grid.innerHTML = "";

    data.daily.time.forEach((date, index) => {
        const [condition, icon] =
            getWeather(data.daily.weather_code[index]);

        const card = document.createElement("article");
        card.className = "forecast-card";

        card.innerHTML = `
            <p>${formatDay(date, index)}</p>
            <div class="forecast-icon">${icon}</div>
            <p class="forecast-condition">${condition}</p>
            <div class="temp-range">
                <span>${Math.round(data.daily.temperature_2m_max[index])}°</span>
                <span style="color:var(--muted)">
                    ${Math.round(data.daily.temperature_2m_min[index])}°
                </span>
            </div>
        `;

        grid.appendChild(card);
    });
}

/* =====================================
   RECENT SEARCHES
===================================== */

function saveRecentSearch(city) {
    let recent = JSON.parse(
        localStorage.getItem("skycastRecent") || "[]"
    );

    recent = recent.filter(
        item => item.toLowerCase() !== city.toLowerCase()
    );

    recent.unshift(city);
    recent = recent.slice(0, 5);

    localStorage.setItem("skycastRecent", JSON.stringify(recent));

    displayRecentSearches();
}

function displayRecentSearches() {
    const container = document.getElementById("recentSearches");

    const recent = JSON.parse(
        localStorage.getItem("skycastRecent") || "[]"
    );

    container.innerHTML = "";

    if (recent.length === 0) {
        container.innerHTML =
            '<p class="empty-message">Your recent cities will appear here.</p>';
        return;
    }

    recent.forEach(city => {
        const button = document.createElement("button");

        button.className = "recent-city";
        button.textContent = `📍 ${city}`;

        button.addEventListener("click", () => {
            cityInput.value = city;
            searchCity(city);
        });

        container.appendChild(button);
    });
}

/* =====================================
   THEME SWITCH
===================================== */

function updateThemeButton() {
    const isLight = document.body.classList.contains("light");

    themeToggle.textContent = isLight
        ? "🌙 Dark Mode"
        : "☀️ Light Mode";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");

    const isLight = document.body.classList.contains("light");

    localStorage.setItem("skycastTheme", isLight ? "light" : "dark");

    updateThemeButton();
});

if (localStorage.getItem("skycastTheme") === "light") {
    document.body.classList.add("light");
}

updateThemeButton();

/* =====================================
   MY LOCATION
===================================== */

locationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
        errorMessage.textContent =
            "Location is not supported by your browser.";
        return;
    }

    errorMessage.textContent = "Finding your location...";

    navigator.geolocation.getCurrentPosition(
        async position => {
            try {
                const { latitude, longitude } = position.coords;

                const data = await getWeatherData(latitude, longitude);

                const place = {
                    name: "My Location",
                    country: data.timezone
                };

                displayCurrentWeather(place, data);
                displayWeatherDetails(data);
                displayHourlyForecast(data);
                displaySunTimes(data);
                displayFiveDayForecast(data);

                errorMessage.textContent = "";
            } catch (error) {
                errorMessage.textContent = error.message;
            }
        },
        () => {
            errorMessage.textContent =
                "Location permission denied. Please allow location access.";
        },
        { enableHighAccuracy: false, timeout: 10000 }
    );
});

/* =====================================
   FORM EVENT
===================================== */

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchCity(cityInput.value);
});

/* =====================================
   INITIALIZE APP
===================================== */

displayRecentSearches();
searchCity("Bengaluru");
