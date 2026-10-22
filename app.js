/**
 * EcoClima · Aplicativo Meteorológico e Ambiental Nativo
 * Dados reais via Open-Meteo (Previsão, Rio Itajaí-Açu, Mar & Qualidade do Ar)
 */

const LOCATIONS = {
  itajai: { name: 'Itajaí · SC', lat: -26.9078, lon: -48.6619 },
  navegantes: { name: 'Navegantes · SC', lat: -26.8856, lon: -48.6534 }
};

let currentLocation = LOCATIONS.itajai;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLocationPicker();
  initRefresh();
  loadData();
});

/* --------------------------------------------------------------------------
   1. Tema (Claro / Escuro)
   -------------------------------------------------------------------------- */
function initTheme() {
  const btn = document.getElementById('btn-theme');
  const saved = localStorage.getItem('ecoclima_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  btn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ecoclima_theme', next);
  });
}

/* --------------------------------------------------------------------------
   2. Seletor de Localização (Itajaí / Navegantes / GPS)
   -------------------------------------------------------------------------- */
function initLocationPicker() {
  const select = document.getElementById('sel-location');
  if (!select) return;

  select.addEventListener('change', () => {
    const val = select.value;
    if (val === 'gps') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            currentLocation = {
              name: 'Posição Atual',
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            };
            loadData();
          },
          () => {
            showNotice('GPS não autorizado. Mantendo Itajaí.');
            select.value = 'itajai';
            currentLocation = LOCATIONS.itajai;
            loadData();
          }
        );
      } else {
        showNotice('Geolocalização não suportada.');
        select.value = 'itajai';
      }
    } else if (LOCATIONS[val]) {
      currentLocation = LOCATIONS[val];
      loadData();
    }
  });
}

/* --------------------------------------------------------------------------
   3. Botão de Atualizar
   -------------------------------------------------------------------------- */
function initRefresh() {
  const btn = document.getElementById('btn-refresh');
  btn?.addEventListener('click', () => {
    btn.classList.add('rotating');
    loadData().finally(() => {
      setTimeout(() => btn.classList.remove('rotating'), 600);
    });
  });
}

/* --------------------------------------------------------------------------
   4. Carga e Conexão com as APIs Meteorológicas
   -------------------------------------------------------------------------- */
async function loadData() {
  hideNotice();
  const { lat, lon } = currentLocation;

  // Carrega cache prévio se disponível para exibição instantânea
  const cached = localStorage.getItem(`cache_${lat.toFixed(2)}_${lon.toFixed(2)}`);
  if (cached) {
    try {
      renderAll(JSON.parse(cached));
    } catch (e) {
      /* ignore */
    }
  }

  try {
    const [weatherRes, marineRes, floodRes, airRes] = await Promise.allSettled([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max&timezone=America%2FSao_Paulo&forecast_days=7`
      ),
      fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=-26.91&longitude=-48.58&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=America%2FSao_Paulo`
      ),
      fetch(
        `https://flood-api.open-meteo.com/v1/flood?latitude=-26.90&longitude=-48.70&daily=river_discharge,river_discharge_max&forecast_days=3`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,uv_index&timezone=America%2FSao_Paulo`
      )
    ]);

    const weather = weatherRes.status === 'fulfilled' && weatherRes.value.ok ? await weatherRes.value.json() : null;
    const marine = marineRes.status === 'fulfilled' && marineRes.value.ok ? await marineRes.value.json() : null;
    const flood = floodRes.status === 'fulfilled' && floodRes.value.ok ? await floodRes.value.json() : null;
    const air = airRes.status === 'fulfilled' && airRes.value.ok ? await airRes.value.json() : null;

    if (!weather) {
      throw new Error('Falha na resposta da API meteorológica.');
    }

    const payload = { weather, marine, flood, air, timestamp: Date.now() };
    localStorage.setItem(`cache_${lat.toFixed(2)}_${lon.toFixed(2)}`, JSON.stringify(payload));
    renderAll(payload);

    updateTimestamp();
  } catch (err) {
    console.warn('Erro ao atualizar dados:', err);
    showNotice('Não foi possível sincronizar novos dados. Exibindo dados locais.');
  }
}

/* --------------------------------------------------------------------------
   5. Renderização Completa
   -------------------------------------------------------------------------- */
function renderAll(payload) {
  const { weather, marine, flood, air } = payload;
  if (!weather || !weather.current) return;

  const cur = weather.current;
  const wmo = getWmoInfo(cur.weather_code);

  // Hero
  setText('now-temp', `${Math.round(cur.temperature_2m)}°`);
  setText('now-icon', wmo.icon);
  setText('now-cond', wmo.desc);
  setText('now-feels', `${Math.round(cur.apparent_temperature)}°`);

  if (weather.daily) {
    setText('now-min', `${Math.round(weather.daily.temperature_2m_min[0])}°`);
    setText('now-max', `${Math.round(weather.daily.temperature_2m_max[0])}°`);
  }

  // Métricas Compactas
  setText('val-rain', `${cur.precipitation.toFixed(1)}`);
  const popMax = weather.daily?.precipitation_probability_max?.[0] ?? 0;
  setText('sub-rain', `Probabilidade: ${popMax}%`);

  const windDir = degToCompass(cur.wind_direction_10m);
  setText('val-wind', `${Math.round(cur.wind_speed_10m)}`);
  setText('sub-wind', `Rumo: ${windDir} · Rajadas: ${Math.round(cur.wind_gusts_10m)} km/h`);

  setText('val-humidity', `${cur.relative_humidity_2m}`);
  const dewPoint = (cur.temperature_2m - (100 - cur.relative_humidity_2m) / 5).toFixed(0);
  setText('sub-humidity', `Ponto de orvalho: ${dewPoint}°C`);

  const uvVal = air?.current?.uv_index ?? weather.daily?.uv_index_max?.[0] ?? 0;
  setText('val-uv', uvVal.toFixed(1));
  setText('sub-uv', `Nível: ${getUvCategory(uvVal)}`);

  // Rio Itajaí-Açu
  const riverDischarge = flood?.daily?.river_discharge?.[0];
  if (riverDischarge) {
    const disVal = Math.round(riverDischarge);
    setText('val-river', `${disVal}`);
    setText('quick-river-val', `${disVal} m³/s`);
    const statusEl = document.getElementById('quick-river-status');
    if (statusEl) {
      if (disVal > 2500) {
        statusEl.textContent = 'Alerta';
        statusEl.style.color = '#ef4444';
      } else if (disVal > 1500) {
        statusEl.textContent = 'Atenção';
        statusEl.style.color = '#f59e0b';
      } else {
        statusEl.textContent = 'Normal';
        statusEl.style.color = '#34d399';
      }
    }
  }

  // Mar & Ondas
  const waveH = marine?.current?.wave_height;
  const seaTemp = marine?.current?.sea_surface_temperature;
  const wavePeriod = marine?.current?.wave_period;
  if (waveH !== undefined && waveH !== null) {
    setText('val-wave', `${waveH.toFixed(1)}`);
    setText('quick-wave-val', `${waveH.toFixed(1)} m`);
    setText('sub-wave', `Água: ${seaTemp ? seaTemp.toFixed(1) + '°C' : '--'} · Período: ${wavePeriod ? Math.round(wavePeriod) + 's' : '--'}`);
  }

  // Qualidade do Ar
  const aqiVal = air?.current?.european_aqi;
  const pm25 = air?.current?.pm2_5;
  if (aqiVal !== undefined && aqiVal !== null) {
    setText('val-aqi', `${Math.round(aqiVal)}`);
    setText('sub-aqi', `PM2.5: ${pm25 ? pm25.toFixed(1) : '--'} µg/m³ · ${getAqiDesc(aqiVal)}`);
  }

  setText('val-pressure', `${Math.round(cur.surface_pressure)}`);
  setText('sub-pressure', cur.surface_pressure > 1013 ? 'Alta pressão (estável)' : 'Baixa pressão');

  // Faixa Horária (24h)
  renderHourly(weather.hourly);

  // Previsão 7 Dias
  renderDaily(weather.daily);
}

/* --------------------------------------------------------------------------
   6. Faixa Horária (24h)
   -------------------------------------------------------------------------- */
function renderHourly(hourly) {
  const container = document.getElementById('hourly-strip');
  if (!container || !hourly || !hourly.time) return;

  const now = new Date();
  const currentHour = now.getHours();

  let startIndex = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]);
    if (t.getHours() === currentHour && t.getDate() === now.getDate()) {
      startIndex = i;
      break;
    }
  }

  const hoursToShow = 24;
  let html = '';

  for (let i = startIndex; i < startIndex + hoursToShow && i < hourly.time.length; i++) {
    const date = new Date(hourly.time[i]);
    const isNow = i === startIndex;
    const timeStr = isNow ? 'Agora' : `${date.getHours()}h`;
    const temp = Math.round(hourly.temperature_2m[i]);
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
    const wmo = getWmoInfo(hourly.weather_code[i]);

    html += `
      <div class="hourly-item ${isNow ? 'is-now' : ''}">
        <span class="hourly-time">${timeStr}</span>
        <span class="hourly-icon">${wmo.icon}</span>
        <span class="hourly-temp">${temp}°</span>
        <span class="hourly-pop">${pop > 10 ? pop + '%' : ''}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* --------------------------------------------------------------------------
   7. Previsão 7 Dias (Estilo Nativo)
   -------------------------------------------------------------------------- */
function renderDaily(daily) {
  const container = document.getElementById('daily-list');
  if (!container || !daily || !daily.time) return;

  // Encontra mín global e máx global para a escala visual das barras
  const minTempAll = Math.min(...daily.temperature_2m_min);
  const maxTempAll = Math.max(...daily.temperature_2m_max);
  const tempRange = Math.max(1, maxTempAll - minTempAll);

  let html = '';

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + 'T12:00:00');
    const isToday = i === 0;
    const dayName = isToday
      ? 'Hoje'
      : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

    const tMin = Math.round(daily.temperature_2m_min[i]);
    const tMax = Math.round(daily.temperature_2m_max[i]);
    const pop = daily.precipitation_probability_max?.[i] ?? 0;
    const wmo = getWmoInfo(daily.weather_code[i]);

    // Cálculo da posição da barra
    const leftPercent = Math.max(0, ((tMin - minTempAll) / tempRange) * 100);
    const widthPercent = Math.max(10, ((tMax - tMin) / tempRange) * 100);

    html += `
      <div class="daily-row">
        <span class="daily-day">${dayName}</span>
        <span class="daily-icon">${wmo.icon}</span>
        <span class="daily-pop">${pop > 10 ? pop + '%' : ''}</span>
        <div class="daily-bar-wrap">
          <div class="daily-bar-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
        </div>
        <div class="daily-temps">
          <span class="temp-min">${tMin}°</span>
          <span class="temp-max">${tMax}°</span>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* --------------------------------------------------------------------------
   8. Utilitários Meteorológicos (WMO, Bússola, UV, AQI)
   -------------------------------------------------------------------------- */
function getWmoInfo(code) {
  switch (code) {
    case 0:
      return { desc: 'Céu Limpo', icon: '☀️' };
    case 1:
      return { desc: 'Predom. Ensolarado', icon: '🌤️' };
    case 2:
      return { desc: 'Parcialmente Nublado', icon: '⛅' };
    case 3:
      return { desc: 'Nublado', icon: '☁️' };
    case 45:
    case 48:
      return { desc: 'Nevoeiro', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { desc: 'Garoa', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { desc: 'Chuva', icon: '🌧️' };
    case 80:
    case 81:
    case 82:
      return { desc: 'Pancadas de Chuva', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { desc: 'Trovoadas', icon: '⛈️' };
    default:
      return { desc: 'Tempo Firme', icon: '⛅' };
  }
}

function degToCompass(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'O', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx];
}

function getUvCategory(uv) {
  if (uv <= 2) return 'Baixo';
  if (uv <= 5) return 'Moderado';
  if (uv <= 7) return 'Alto';
  if (uv <= 10) return 'Muito Alto';
  return 'Extremo';
}

function getAqiDesc(aqi) {
  if (aqi <= 20) return 'Excelente';
  if (aqi <= 40) return 'Boa';
  if (aqi <= 60) return 'Moderada';
  if (aqi <= 80) return 'Ruim';
  return 'Muito Ruim';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showNotice(msg) {
  const banner = document.getElementById('notice-banner');
  if (banner) {
    banner.textContent = msg;
    banner.hidden = false;
  }
}

function hideNotice() {
  const banner = document.getElementById('notice-banner');
  if (banner) banner.hidden = true;
}

function updateTimestamp() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const liveEl = document.getElementById('live-time');
  const footerEl = document.getElementById('footer-update');
  if (liveEl) liveEl.textContent = `${timeStr}`;
  if (footerEl) footerEl.textContent = `Atualizado às ${timeStr}`;
}
