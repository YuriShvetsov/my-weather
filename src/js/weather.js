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
    hereBtn: app.querySelector('.js-location-here-btn')
  },
  widget: {
    container: app.querySelector('.js-widget-main'),
    icon: app.querySelector('.js-widget-icon'),
    temp: app.querySelector('.js-widget-temp'),
    desc: app.querySelector('.js-widget-desc'),
    date: app.querySelector('.js-widget-date'),
    loader: app.querySelector('.js-widget-loader')
  },
  more: {
    btn: app.querySelector('.js-more-btn'),
    container: app.querySelector('.js-more-container'),
    pressure: app.querySelector('.js-more-pressure'),
    humidity: app.querySelector('.js-more-humidity'),
    wind: app.querySelector('.js-more-wind'),
    windDir: app.querySelector('.js-more-wind-speed'),
    visibility: app.querySelector('.js-more-visibility'),
    uv: app.querySelector('.js-more-uv')
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

window.addEventListener('load', () => {
  initHandlers();
  preCacheImages(icons);
  getMyForecast();
});


/* Data. Data is written to a constant _state_ */

function getMyCoords() {
  if (navigator.geolocation) {
    return new Promise((resolve, reject) => {
      let error = null;
      // console.log('Getting my coordinates. Waiting...');
      navigator.geolocation.getCurrentPosition(pos => {
        state.myPosition = {
          lon: pos.coords.longitude,
          lat: pos.coords.latitude
        };
        // console.log('Getting my coordinates. Successfull!');
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

    // console.log('Getting my weather forecast. Waiting...');
    fetch(url)
      .then(response => {
        return response.json();
      })
      .then(data => {
        setForecastState(data.data[0]);
        setCountryState(data.data[0].country_code);
        setCityState(data.data[0].city_name);
        // console.log('Getting my weather forecast. Successfull!');
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

    // console.log('Getting city forecast. Waiting...');
    fetch(url)
      .then(res => {
        if (res.status === 200) {
          return res;
        } else if (res.status === 204) {
          showErrorUI('City is not found');
          console.error('Incorrect data');
        } else if (res.status === 400) {
          showErrorUI('Service unavailaible');
          console.error('Data error. Bad request');
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
        // console.log('Getting city forecast. Successfull!');
        resolve();
      })
      .catch(err => {
        console.error('Error of service!', err.message);
        reject();
      })
  })
}

function checkConnection() {
  if (!window.navigator.onLine) {
    showErrorUI('Please, checking connection');
    throw 'NO CONNECTION';
  }
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

function getTimezoneOffset() {
  // Return offset value
  let offset = timezones.find(t => t.utc.find(item => item.split('/').reverse()[0] == state.forecast.timezone.split('/').reverse()[0])).offset;
  return offset;
}

function getLastObTime() {
  const grinvichTime = {
    h: +state.forecast.ob_time.split(' ')[1].split(':')[0],
    m: +state.forecast.ob_time.split(' ')[1].split(':')[1]
  };
  const offset = getTimezoneOffset();

  if (offset === undefined) {
    console.error('Error! Timezone is not found');
    return null;
  }

  const utc = {
    h: (offset - parseInt(offset) !== 0) ? grinvichTime.h + parseInt(offset) + 1 : grinvichTime.h + offset,
    m: (offset - parseInt(offset) !== 0) ? grinvichTime.m + (offset - parseInt(offset)) * 60 : grinvichTime.m
  };

  if (utc.h > 24) utc.h -= 24;
  // console.log(`Last ob. time (${state.forecast.city_name}): ${utc.h}:${utc.m}`);
  // console.log(`Offset: ${offset}`);
  return utc;
}

function getTimesOfDay() {
  // Return boolean (day: true, night: false)
  const lastObTime = getLastObTime();
  const offset = getTimezoneOffset();
  if (!lastObTime) return true;

  const sun = {
    rise: {
      h: +state.forecast.sunrise.split(':')[0],
      m: +state.forecast.sunrise.split(':')[1],
    },
    set: {
      h: +state.forecast.sunset.split(':')[0],
      m: +state.forecast.sunset.split(':')[1],
    }
  };

  sun.rise.h += ((offset - parseInt(offset)) > 0) ? offset + 1 : offset;
  sun.rise.m += ((offset - parseInt(offset)) > 0) ? offset - parseInt(offset) * 60 : 0;

  sun.set.h += ((offset - parseInt(offset)) > 0) ? offset + 1 : offset;
  sun.set.m += ((offset - parseInt(offset)) > 0) ? offset - parseInt(offset) * 60 : 0;

  if (sun.rise.h > 23) sun.rise.h -= 24;
  if (sun.set.h < 0) sun.set.h += 24;

  // console.log(`Sunrise: ${sun.rise.h}:${sun.rise.m}`);
  // console.log(`Sunset: ${sun.set.h}:${sun.set.m}`);

  if (lastObTime.h > sun.rise.h && lastObTime.h < sun.set.h) {           // Day
    return true;
  } else if (lastObTime.h < sun.rise.h && lastObTime.h > sun.set.h) {   // Night
    return false;
  } else if (lastObTime.h == sun.rise.h && lastObTime.m >= sun.rise.m) { // Day
    return true;
  } else if (lastObTime.h == sun.set.h && lastObTime.m >= sun.set.m) { // Night
    return false;
  }
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
  setMoreInfoUI();
  unableMoreBtnUI();
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

function resetModeApp() {
  if (state.mode == 'more') {
    hideMoreContainerUI();
    changeMoreBtnOpenUI();
    disableMoreBtnUI();
  }

  disableMoreBtnUI();
  state.mode = 'default';
}

function setHeaderColorUI(color) {
  elements.header.style.backgroundColor = color;
}

function setIconUI(icon) {
  elements.widget.icon.style.backgroundImage = `url(assets/icons/${icon})`;
}

function setWeatherIconUI() {
  const weatherDesc = state.forecast.weather.description.toLowerCase();
  const isDay = getTimesOfDay();

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
  elements.widget.temp.textContent = Math.round(state.forecast.temp);
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

function setMoreInfoUI() {
  elements.more.pressure.textContent = Math.round(state.forecast.pres * 0.75);
  elements.more.humidity.textContent = state.forecast.rh;
  elements.more.wind.textContent = state.forecast.wind_cdir_full
  elements.more.windDir.textContent = Math.round(state.forecast.wind_spd);
  elements.more.visibility.textContent = Math.round(state.forecast.vis);
  elements.more.uv.textContent = Math.round(state.forecast.uv);
}

function showLoaderUI() {
  // console.log('Loader is visible');
  elements.widget.icon.classList.add('w-widget__icon_lighten');
  elements.widget.loader.classList.add('w-widget__loader_visible');
  elements.widget.desc.textContent = 'Loading';
  elements.widget.temp.textContent = '-';
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

function unableCityBtnUI() {
  elements.location.cityBtn.disabled = false;
}

function disableCityBtnUI() {
  elements.location.cityBtn.disabled = true;
}

function changeMoreBtnCloseUI() {
  elements.more.btn.classList.add('w-widget__more-btn_close');
}

function changeMoreBtnOpenUI() {
  elements.more.btn.classList.remove('w-widget__more-btn_close');
}

function unableMoreBtnUI() {
  elements.more.btn.disabled = false;
}

function disableMoreBtnUI() {
  elements.more.btn.disabled = true;
}

function showMoreContainerUI() {
  elements.more.container.classList.add('w-more__container_visible');
  elements.widget.container.classList.add('w-widget__main_shadow');
}

function hideMoreContainerUI() {
  elements.more.container.classList.add('w-more__container_hidden');
  elements.widget.container.classList.remove('w-widget__main_shadow');
  elements.more.container.classList.remove('w-more__container_visible');
  setTimeout(() => {
    elements.more.container.classList.remove('w-more__container_hidden');
  }, 500);
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

/* Controller */

async function getMyForecast() {
  try {
    // Rendering of something
    resetModeApp();
    showLoaderUI();

    // Checking connection
    checkConnection();

    // Getting data from server
    await getMyCoords();
    await fetchMyForecast();
    await delay(500);

    // Render with a new data
    unableMoreBtnUI();
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
    resetModeApp();
    showLoaderUI();

    // Checking connection
    checkConnection();

    // Getting data from server
    await fetchCityForecast();
    await delay(500);

    // Render with a new data
    unableMoreBtnUI();
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
  initHandlerCityInput();
  initHandlerCityBtn();
  initHandlerHereBtn();
  initHandlerMoreBtn();
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
        disableCityBtnUI();

      // Selecting another country
      } else if (newCountryCode !== 'empty' && newCountryCode !== state.city.countryCode) {
        setCountryState(newCountryCode);
        resetCityState();
        elements.location.countryInput.value = newCountryName;
        clearCityInputUI();
        setCurCityUI();
        unableCityBtnUI();
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

function initHandlerCityInput() {
  elements.location.cityInput.addEventListener('keydown', e => {
    if (e.code === 'Enter' || e.keyCode === 13) {
      setCityState(e.target.value);
      getCityForecast();
    }
  });
}

function initHandlerCityBtn() {
  elements.location.cityBtn.addEventListener('click', e => {
    if (elements.location.cityInput.value.length === 0) return;
    setCityState(elements.location.cityInput.value);
    getCityForecast();
  });
}

function initHandlerHereBtn() {
  elements.location.hereBtn.addEventListener('click', e => {
    getMyForecast();
  });
}

function initHandlerMoreBtn() {
  let isOpened = false;

  elements.more.btn.addEventListener('click', e => {
    if (state.mode == 'default' && isOpened) isOpened = false;

    if (isOpened) {
      state.mode = 'default';
      changeMoreBtnOpenUI()
      hideMoreContainerUI();
    } else {
      state.mode = 'more';
      changeMoreBtnCloseUI();
      showMoreContainerUI();
    }

    isOpened = !isOpened;
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

function preCacheImages(images) {
  let container = document.createElement('div');
  container.style = 'display: none; position: absolute; left: 0; top: 0; opacity: 0; visibility: hidden;';

  open(images);
  document.body.appendChild(container);

  function open(obj) {
    Object.values(obj).forEach(item => {
      if (typeof item === 'object') {
        open(item);
      } else if (typeof item === 'string') {
        let img = new Image();
        img.src = `assets/icons/${item}`;
        container.appendChild(img);
      }
    });
  }
}
