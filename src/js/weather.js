/* My weather app by Yuri Shvetsov
Source of forecast weather : https://www.weatherbit.io/
API key: 05029a9a68664ba3a2868840054ed716 */

import countries from '../data/countries.json';
import icons from '../data/weather-icons.json';
import dateNames from '../data/date-names.json';
import timezones from '../data/timezones.json';

const app = document.querySelector('#app');
const elements = {
  header: app.querySelector('.js-header'),
  location: {
    country: app.querySelector('.js-location-country'),
    countryInput: app.querySelector('.js-location-country-input'),
    countryList: app.querySelector('.js-location-country-list'),
    countryInner: app.querySelector('.js-location-country-inner'),
    cityInput: app.querySelector('.js-location-city-input'),
    cityBtn: app.querySelector('.js-location-city-btn'),
  },
  widget: {
    icon: app.querySelector('.js-widget-icon'),
    temp: app.querySelector('.js-widget-temp'),
    desc: app.querySelector('.js-widget-desc'),
    date: app.querySelector('.js-widget-date'),
    loader: app.querySelector('.js-widget-loader')
  }
};
const colors = {
  black: '#333333',       // default text color
  blue: '#0075C4',        // rain, snow
  lightBlue: '#1A8FE3',   // partilly cloudy
  darkBlue: '#0267C1',    // rain (day, night)
  darkestBlue: '#014785', // night (rain, storm)
  yellow: '#fcc418',      // clear day
  black: '#111d28',       // clear night
  red: '#e2574c'          // error
};
const state = {
  city: {
    country: null,
    countryCode: null,
    name: null
  },
  curDate: new Date(),
  forecast: null,
  mode: 'default',
  myPosition: null,
};

/* Initialization app */

renderDom();
initHandlers();
getMyForecast();

/* Data. Data is written to a constant _state_ */

function getMyCoords() {
  if (navigator.geolocation) {
    return new Promise((resolve, reject) => {
      let error = null;
      console.log('Getting my coordinates. Waiting...');
      navigator.geolocation.getCurrentPosition(pos => {
        state.myPosition = {
          lon: pos.coords.longitude,
          lat: pos.coords.latitude
        };
        console.log('Getting my coordinates. Successfull!');
        resolve();
      }, err => {
        if (err.code === 1) {
          setDescUI('Geolocation disabled', colors.red);
        } else if (err.code === 2) {
          setDescUI('Connection error', colors.red);
        }
        resetWeatherTempUI();
        setHeaderColorUI(colors.red);
        setIconUI(icons.error);
        hideLoaderUI();
        console.error(err.message);
      }, {
        enableHighAccuracy: true,
        timeout: Infinity,
        maximumAge: 0
      });
    })
  } else {
    console.error('Geolocation is not supported');
  }
}

function fetchMyForecast() {
  return new Promise((resolve, reject) => {
    const url = `https://api.weatherbit.io/v2.0/current?&lat=${state.myPosition.lat}&lon=${state.myPosition.lon}&key=05029a9a68664ba3a2868840054ed716`;

    console.log('Getting my weather forecast. Waiting...');
    fetch(url)
      .then(response => {
        return response.json();
      })
      .then(data => {
        setForecastState(data.data[0]);
        setCountryState(data.data[0].country_code);
        setCityState(data.data[0].city_name);
        console.log('Getting my weather forecast. Successfull!');
        resolve();
      })
      .catch(err => {
        reject();
      })
  })
}

function fetchCityForecast() {
  return new Promise((resolve, reject) => {
    const url = `https://api.weatherbit.io/v2.0/current?&city=${state.city.name}&country=${state.city.countryCode}&key=05029a9a68664ba3a2868840054ed716`;

    console.log('Getting city forecast. Waiting...');
    fetch(url)
      .then(res => {
        if (res.status === 200) {
          return res;
        } else if (res.status === 204) {
          showErrorUI('City is not found');
          console.error('Incorrect data');
        } else if (res.status === 503) {
          showErrorUI('Service unavailaible');
          console.error('Service unavailaible');
        } else {
          let error = new Error(res.statusText);
          error.response = res;
          throw error;
        }
      })
      .then(res => res.json())
      .then(data => {
        setForecastState(data.data[0]);
        setCountryState(data.data[0].country_code);
        setCityState(data.data[0].city_name);
        console.log('Getting city forecast. Successfull!');
        resolve();
      })
      .catch(err => {
        console.error('Error of service!', err.message);
        reject();
      })
  })
}

function setCountryState(code) {
  const country = countries.find(item => item.abbreviation === code).country;

  state.city.country = country;
  state.city.countryCode = code;
}

function resetCountryState() {
  state.city.country = null;
  state.city.countryCode = null;
}

function setCityState(name) {
  state.city.name = name;
}

function resetCityState() {
  state.city.name = null;
}

function setForecastState(forecast) {
  state.forecast = forecast;
}

function resetForecastState() {
  state.forecast = null;
}

/* View. Rendering of DOM */

function renderDom() {
  setCurDateUI();
  renderCountryListUI();
}

function setWeatherUI() {
  setWeatherIconUI();
  setWeatherTempUI();
  setWeatherDescUI();
}

function renderCountryListUI() {
  const container = elements.location.countryInner;
  const div = document.createElement('div');
  div.classList.add('w-location__country-item');

  countries.forEach(i => {
    let newItem = div.cloneNode(true);
    newItem.textContent = i.country;
    newItem.setAttribute('name', i.abbreviation);
    container.appendChild(newItem);
  });
}

function setHeaderColorUI(color) {
  elements.header.style.backgroundColor = color;
}

function setIconUI(icon) {
  elements.widget.icon.style.backgroundImage = `url(assets/icons/${icon})`;
}

function setWeatherIconUI() {
  const weatherDesc = state.forecast.weather.description.toLowerCase();
  let isDay = true;

  if (weatherDesc.includes('clear') && isDay) {
    setIconUI(icons.day.sunny);
    setHeaderColorUI(colors.yellow);
  } else if (weatherDesc.includes('rain') && !weatherDesc.includes('snow') && isDay) {
    setIconUI(icons.day.rain);
    setHeaderColorUI(colors.blue);
  } else if (weatherDesc.includes('cloud') && weatherDesc.includes('overcast') && isDay) {
    setIconUI(icons.day.overcast);
    setHeaderColorUI(colors.lightBlue);
  } else if (weatherDesc.includes('cloud') && !weatherDesc.includes('overcast') && isDay) {
    setIconUI(icons.day.partCloudy);
    setHeaderColorUI(colors.yellow);
  } else if (weatherDesc.includes('rain') && weatherDesc.includes('light') && isDay) {
    setIconUI(icons.day.sunnyRain);
    setHeaderColorUI(colors.yellow);
  } else if (weatherDesc.includes('snow') && isDay) {
    setIconUI(icons.day.snow);
    setHeaderColorUI(colors.blue);
  } else if (weatherDesc.includes('thunderstorm') && isDay) {
    setIconUI(icons.day.storm);
    setHeaderColorUI(colors.darkBlue);
  } else if (weatherDesc.includes('hail') && !weatherDesc.includes('thunderstorm') && isDay) {
    setIconUI(icons.day.haily);
    setHeaderColorUI(colors.blue);
  } else if (isDay) {
    setIconUI(icons.day.sunny);
    setHeaderColorUI(colors.yellow);
  }

  if (weatherDesc.includes('clear') && !isDay) {
    setIconUI(icons.night.clear);
    setHeaderColorUI(colors.darkBlue);
  } else if (weatherDesc.includes('rain') && !weatherDesc.includes('snow') && !isDay) {
    setIconUI(icons.night.rain);
    setHeaderColorUI(colors.darkBlue);
  } else if (weatherDesc.includes('cloud') && weatherDesc.includes('overcast') && !isDay) {
    setIconUI(icons.day.overcast);
    setHeaderColorUI(colors.darkBlue);
  } else if (weatherDesc.includes('cloud') && !weatherDesc.includes('overcast') && !isDay) {
    setIconUI(icons.night.partCloudy);
    setHeaderColorUI(colors.darkBlue);
  } else if (weatherDesc.includes('snow') && !isDay) {
    setIconUI(icons.day.snow);
    setHeaderColorUI(colors.darkBlue);
  } else if (weatherDesc.includes('thunderstorm') && !isDay) {
    setIconUI(icons.day.storm);
    setHeaderColorUI(colors.darkestBlue);
  } else if (weatherDesc.includes('hail') && !weatherDesc.includes('thunderstorm') && !isDay) {
    setIconUI(icons.day.haily);
    setHeaderColorUI(colors.darkestBlue);
  } else if (!isDay) {
    setIconUI(icons.night.clear);
    setHeaderColorUI(colors.darkestBlue);
  }
}

function setDescUI(text, color) {
  elements.widget.desc.textContent = text;
  elements.widget.desc.style.color = color;
}

function showErrorUI(text) {
  setHeaderColorUI(colors.red);
  setIconUI(icons.error);
  setDescUI(text, colors.red);
}

function setWeatherDescUI() {
  setDescUI(state.forecast.weather.description, colors.lightBlue);
}

function setWeatherTempUI() {
  elements.widget.temp.textContent = Math.floor(state.forecast.temp);
}

function resetWeatherTempUI() {
  elements.widget.temp.textContent = '-';
}

function setCurDateUI() {
  const date = {
    weekday: dateNames.weekdays[state.curDate.getDay()],
    month: dateNames.months.full[state.curDate.getMonth()],
    day: state.curDate.getDate()
  };

  elements.widget.date.textContent = `${date.weekday}, ${date.month} ${date.day}`;
}

function showLoaderUI() {
  // console.log('Loader is visible');
  elements.widget.icon.classList.add('w-widget__icon_lighten');
  elements.widget.loader.classList.add('w-widget__loader_visible');
}

function hideLoaderUI() {
  // console.log('Loader is hidden');
  elements.widget.icon.classList.remove('w-widget__icon_lighten');
  elements.widget.loader.classList.remove('w-widget__loader_visible');
}

function enableCityInputUI() {
  elements.location.cityInput.removeAttribute('disabled');
}

function disableCityInputUI() {
  elements.location.cityInput.setAttribute('disabled', true);
}

function showCountryListUI() {
  elements.location.countryList.classList.add('w-location__country-list_visible');
}

function hideCountryListUI() {
  elements.location.countryList.classList.remove('w-location__country-list_visible');
}

function setCurCityUI() {
  elements.location.countryInput.value = state.city.country;
  elements.location.cityInput.value = state.city.name;
  enableCityInputUI();
}

function clearCountryInputUI() {
  elements.location.countryInput.value = '';
}

function clearCityInputUI() {
  elements.location.cityInput.value = '';
}

/* Controller. Controlling of processes */

async function getMyForecast() {
  try {
    // Rendering of something
    showLoaderUI();

    // Getting data from server
    await delay(500);
    await getMyCoords();
    await fetchMyForecast();
    await delay(500);

    // Render with a new data
    setWeatherUI();
    setCurCityUI();
  } catch (e) {
    // code
  } finally {
    hideLoaderUI();
    // console.log(state);
  }
}

async function getCityForecast() {
  try {
    // Rendering of something
    showLoaderUI();

    // Getting data from server
    await delay(500);
    // await getMyCoords();
    await fetchCityForecast();
    await delay(500);

    // Render with a new data
    setWeatherUI();
  } catch(e) {
    // code
  } finally {
    hideLoaderUI();
    // console.log(state);
  }
}

function initHandlers() {
  initHandlerCountry();
  initHandlerCity();
}

function initHandlerCountry() {
  let isOpened = false;

  // Click on country select
  elements.location.countryInput.addEventListener('click', e => {
    if (!isOpened) {
      showCountryListUI();
      isOpened = true;
      elements.location.country.classList.add('w-location__country_active');
      elements.location.country.focus();
    } else {
      hideCountryListUI();
      isOpened = false;
      elements.location.country.classList.remove('w-location__country_active');
      e.target.blur();
      elements.location.country.blur();
    }
  });

  // Click on items of country list
  elements.location.countryList.addEventListener('click', e => {
    if (e.target.classList.contains('w-location__country-item')) {
      let newCountryCode = e.target.getAttribute('name');
      let newCountryName = e.target.value;

      // Selecting empty item
      if (newCountryCode === 'empty') {
        resetCountryState();
        resetCityState();
        clearCountryInputUI();
        clearCityInputUI();
        disableCityInputUI();

      // Selecting another country
      } else if (newCountryCode !== 'empty' && newCountryCode !== state.city.countryCode) {
        setCountryState(newCountryCode);
        resetCityState();
        elements.location.countryInput.value = newCountryName;
        clearCityInputUI();
        setCurCityUI();
        elements.location.cityInput.focus();

      // Selecting the same country
      } else if (newCountryCode !== 'empty' && newCountryCode === state.city.countryCode) {
        resetCityState();
        clearCityInputUI();
        elements.location.cityInput.focus();
      }

      hideCountryListUI();
      isOpened = false;
      elements.location.country.classList.remove('w-location__country_active');
      elements.location.country.blur();
    }
  });

  // Click on the document...
  document.addEventListener('click', e => {
    if (!isOpened) return;

    if (e.target !== elements.location.countryInput && !elements.location.countryList.contains(e.target)) {
      hideCountryListUI();
      isOpened = false;
      elements.location.country.classList.remove('w-location__country_active');
      elements.location.country.blur();
    }
  });
}

function initHandlerCity() {
  elements.location.cityInput.addEventListener('keydown', e => {
    if (e.code === 'Enter' || e.keyCode === 13) {
      setCityState(e.target.value);
      getCityForecast();
    }
  });
}

/* Other functions */

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}




