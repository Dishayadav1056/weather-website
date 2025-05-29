// OpenWeather API configuration
const API_KEY = 'YOUR_API_KEY'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const locationElement = document.querySelector('.location');
const temperatureElement = document.querySelector('.temperature');
const statusElement = document.querySelector('.status');
const dateElement = document.querySelector('.date');
const windElement = document.querySelector('.details div:nth-child(1)');
const humidityElement = document.querySelector('.details div:nth-child(2)');
const rainChanceElement = document.querySelector('.details div:nth-child(3)');
const timelineContainer = document.querySelector('.timeline');
const weekContainer = document.querySelector('.week');

// Check if all required elements are present
function checkDOMElements() {
    const elements = {
        location: locationElement,
        temperature: temperatureElement,
        status: statusElement,
        date: dateElement,
        wind: windElement,
        humidity: humidityElement,
        rainChance: rainChanceElement,
        timeline: timelineContainer,
        week: weekContainer
    };

    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Required DOM element not found: ${name}`);
            return false;
        }
    }
    return true;
}

// Weather icon mapping with more detailed conditions
const weatherIcons = {
    'Clear': '☀️',
    'Clouds': {
        'few clouds': '🌤️',
        'scattered clouds': '⛅',
        'broken clouds': '☁️',
        'overcast clouds': '☁️'
    },
    'Rain': {
        'light rain': '🌦️',
        'moderate rain': '🌧️',
        'heavy rain': '⛈️'
    },
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Drizzle': '🌦️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️'
};

// Get weather icon based on condition
function getWeatherIcon(weather, description) {
    if (typeof weatherIcons[weather] === 'object') {
        return weatherIcons[weather][description.toLowerCase()] || weatherIcons[weather][Object.keys(weatherIcons[weather])[0]];
    }
    return weatherIcons[weather] || '🌈';
}

// Initialize the app
async function initWeatherApp() {
    console.log('Initializing weather app...');
    
    // First check if DOM elements are present
    if (!checkDOMElements()) {
        handleError('Error: Some UI elements are missing. Please check the HTML structure.');
        return;
    }

    try {
        // Get user's location
        console.log('Getting user location...');
        const position = await getCurrentLocation();
        const { latitude, longitude } = position.coords;
        console.log('Location obtained:', { latitude, longitude });
        
        // Fetch all weather data
        console.log('Fetching weather data...');
        const [currentWeather, forecastData] = await Promise.all([
            fetchCurrentWeather(latitude, longitude),
            fetchOneCallData(latitude, longitude)
        ]);

        if (!currentWeather) {
            throw new Error('Failed to fetch current weather data');
        }
        if (!forecastData) {
            throw new Error('Failed to fetch forecast data');
        }

        console.log('Updating UI with weather data...');
        updateCurrentWeather(currentWeather);
        updateHourlyForecast(forecastData);
        updateWeeklyForecast(forecastData);
        console.log('Weather app initialized successfully');
    } catch (error) {
        console.error('Error in initWeatherApp:', error);
        handleError(`Unable to initialize weather app: ${error.message}`);
    }
}

// Get current location with timeout
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error('Location request timed out'));
        }, 10000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeout);
                resolve(position);
            },
            (error) => {
                clearTimeout(timeout);
                console.error('Geolocation error:', error);
                reject(new Error(`Location error: ${error.message}`));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

// Fetch current weather data
async function fetchCurrentWeather(lat, lon) {
    try {
        console.log('Fetching current weather for:', { lat, lon });
        const response = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Current weather data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching current weather:', error);
        return null;
    }
}

// Fetch One Call API data (includes hourly and daily forecast)
async function fetchOneCallData(lat, lon) {
    try {
        console.log('Fetching forecast data for:', { lat, lon });
        const response = await fetch(
            `${BASE_URL}/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Forecast data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
}

// Update current weather display
function updateCurrentWeather(data) {
    if (!data) {
        console.error('No weather data provided to updateCurrentWeather');
        return;
    }

    try {
        const city = data.name;
        const temp = Math.round(data.main.temp);
        const weather = data.weather[0].main;
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
        
        locationElement.textContent = `📍 ${city}`;
        temperatureElement.textContent = `${temp}°`;
        statusElement.textContent = description.charAt(0).toUpperCase() + description.slice(1);
        dateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        windElement.innerHTML = `${windSpeed} km/h<br><span>Wind</span>`;
        humidityElement.innerHTML = `${humidity}%<br><span>Humidity</span>`;
        
        // Update weather icon
        const weatherIconDiv = document.querySelector('.weather-icon');
        if (weatherIconDiv) {
            weatherIconDiv.textContent = getWeatherIcon(weather, description);
        }
        
        console.log('Current weather UI updated successfully');
    } catch (error) {
        console.error('Error updating current weather UI:', error);
        handleError('Error updating weather display');
    }
}

// Update hourly forecast
function updateHourlyForecast(data) {
    if (!data || !data.hourly) {
        console.error('Invalid hourly forecast data:', data);
        return;
    }
    
    try {
        timelineContainer.innerHTML = '';
        
        data.hourly.slice(1, 5).forEach((hour, index) => {
            const time = new Date(hour.dt * 1000).getHours() + ':00';
            const temp = Math.round(hour.temp);
            const weather = hour.weather[0].main;
            const description = hour.weather[0].description;
            
            const hourDiv = document.createElement('div');
            hourDiv.className = `hour ${index === 0 ? 'active' : ''}`;
            hourDiv.innerHTML = `${time}<br>${getWeatherIcon(weather, description)} ${temp}°`;
            timelineContainer.appendChild(hourDiv);
        });
        
        console.log('Hourly forecast UI updated successfully');
    } catch (error) {
        console.error('Error updating hourly forecast UI:', error);
        handleError('Error updating hourly forecast');
    }
}

// Update weekly forecast
function updateWeeklyForecast(data) {
    if (!data || !data.daily) {
        console.error('Invalid daily forecast data:', data);
        return;
    }
    
    try {
        weekContainer.innerHTML = '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        data.daily.slice(1, 8).forEach(day => {
            const date = new Date(day.dt * 1000);
            const dayName = days[date.getDay()];
            const maxTemp = Math.round(day.temp.max);
            const minTemp = Math.round(day.temp.min);
            const weather = day.weather[0].main;
            const description = day.weather[0].description;
            
            const dayDiv = document.createElement('div');
            dayDiv.innerHTML = `${dayName} ${getWeatherIcon(weather, description)} +${maxTemp}°/+${minTemp}°`;
            weekContainer.appendChild(dayDiv);
        });

        // Update tomorrow's forecast
        if (data.daily[1]) {
            const tomorrow = data.daily[1];
            const titleElement = document.querySelector('.forecast .title');
            const tempRangeElement = document.querySelector('.temp-range');
            const miniIconElement = document.querySelector('.mini-icon');
            const extraInfo = document.querySelector('.forecast .extra');

            if (titleElement) titleElement.textContent = '📅 Tomorrow';
            if (tempRangeElement) {
                tempRangeElement.textContent = `${Math.round(tomorrow.temp.max)}° / ${Math.round(tomorrow.temp.min)}°`;
            }
            if (miniIconElement) {
                miniIconElement.textContent = getWeatherIcon(tomorrow.weather[0].main, tomorrow.weather[0].description);
            }
            if (extraInfo) {
                extraInfo.children[0].innerHTML = `${Math.round(tomorrow.wind_speed * 3.6)} km/h<br><span>Wind</span>`;
                extraInfo.children[1].innerHTML = `${tomorrow.humidity}%<br><span>Humidity</span>`;
                extraInfo.children[2].innerHTML = `${Math.round(tomorrow.pop * 100)}%<br><span>Rain</span>`;
            }
        }
        
        console.log('Weekly forecast UI updated successfully');
    } catch (error) {
        console.error('Error updating weekly forecast UI:', error);
        handleError('Error updating weekly forecast');
    }
}

// Handle errors
function handleError(message) {
    console.error('Error:', message);
    alert(message);
}

// Add search functionality
function addSearchFunctionality() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search city...';
    searchInput.className = 'search-input';
    
    document.querySelector('.app').prepend(searchInput);
    
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        if (searchInput.value.length > 0) {
            searchInput.style.background = 'rgba(255, 255, 255, 0.2)';
        } else {
            searchInput.style.background = 'rgba(255, 255, 255, 0.1)';
        }
    });

    const performSearch = async () => {
        const city = searchInput.value.trim();
        if (!city) return;

        try {
            console.log('Searching for city:', city);
            searchInput.style.opacity = '0.7';
            
            // First get coordinates for the city
            const geoResponse = await fetch(
                `${GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
            );
            
            if (!geoResponse.ok) {
                throw new Error(`Geocoding error! status: ${geoResponse.status}`);
            }
            
            const geoData = await geoResponse.json();
            console.log('Geocoding data received:', geoData);

            if (geoData && geoData.length > 0) {
                const { lat, lon } = geoData[0];
                console.log('City coordinates:', { lat, lon });
                
                // Fetch weather data using coordinates
                const [currentWeather, forecastData] = await Promise.all([
                    fetchCurrentWeather(lat, lon),
                    fetchOneCallData(lat, lon)
                ]);

                if (currentWeather && forecastData) {
                    updateCurrentWeather(currentWeather);
                    updateHourlyForecast(forecastData);
                    updateWeeklyForecast(forecastData);
                    
                    searchInput.value = '';
                    searchInput.style.background = 'rgba(75, 181, 67, 0.2)';
                    setTimeout(() => {
                        searchInput.style.background = 'rgba(255, 255, 255, 0.1)';
                    }, 1000);
                    console.log('Search completed successfully');
                } else {
                    throw new Error('Failed to fetch weather data');
                }
            } else {
                throw new Error('City not found');
            }
        } catch (error) {
            console.error('Error during search:', error);
            searchInput.style.background = 'rgba(255, 0, 0, 0.2)';
            setTimeout(() => {
                searchInput.style.background = 'rgba(255, 255, 255, 0.1)';
            }, 1000);
            handleError(`Search failed: ${error.message}`);
        } finally {
            searchInput.style.opacity = '1';
        }
    };

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout);
            performSearch();
        }
    });

    searchInput.addEventListener('blur', () => {
        searchInput.style.background = 'rgba(255, 255, 255, 0.1)';
    });
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initWeatherApp();
    addSearchFunctionality();
});
