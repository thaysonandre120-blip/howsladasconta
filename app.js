/**
 * EcoClima — Sistema de Monitoramento Hidrometeorológico
 * Projeto Acadêmico — Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas (TADS)
 * Consumo de dados via Open-Meteo, GloFAS / Copernicus e CAMS
 */

const LOCATIONS = {
  itajai: { name: 'Itajaí (SC)', lat: -26.9078, lon: -48.6619 },
  navegantes: { name: 'Navegantes (SC)', lat: -26.8856, lon: -48.6534 }
};

let currentLocation = LOCATIONS.itajai;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initLocationPicker();
  initRefresh();
  loadData();
});

/* --------------------------------------------------------------------------
   1. Navegação por Módulos / Abas do Menu
   -------------------------------------------------------------------------- */
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.view-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const viewId = tab.getAttribute('data-view');

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      panels.forEach(panel => {
        if (panel.id === `view-${viewId}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   2. Suporte a Tema (Mantido para compatibilidade)
   -------------------------------------------------------------------------- */
function initTheme() {
  const btn = document.getElementById('btn-theme');
  btn?.addEventListener('click', () => {
    /* mantido para compatibilidade com event listener */
  });
}

/* --------------------------------------------------------------------------
   3. Seletor de Município (Itajaí / Navegantes / GPS)
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
              name: 'Coordenadas Locais (GPS)',
              lat: pos.coords.latitude,
              lon: pos.coords.longitude
            };
            updateRadarMap();
            loadData();
          },
          () => {
            showNotice('Não foi possível obter a geolocalização. O sistema manterá o município de Itajaí.');
            select.value = 'itajai';
            currentLocation = LOCATIONS.itajai;
            loadData();
          }
        );
      } else {
        showNotice('Navegador não possui suporte para geolocalização.');
        select.value = 'itajai';
      }
    } else if (LOCATIONS[val]) {
      currentLocation = LOCATIONS[val];
      updateRadarMap();
      loadData();
    }
  });
}

function updateRadarMap() {
  const radarIframe = document.getElementById('radar-iframe');
  if (radarIframe) {
    radarIframe.src = `https://www.rainviewer.com/map.html?loc=${currentLocation.lat.toFixed(4)},${currentLocation.lon.toFixed(4)},9&oFa=0&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=1&o=83&lm=1&layer=radar&sm=1&sn=1`;
  }
}

/* --------------------------------------------------------------------------
   4. Botão de Atualização de Dados
   -------------------------------------------------------------------------- */
function initRefresh() {
  const btn = document.getElementById('btn-refresh');
  btn?.addEventListener('click', () => {
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Carregando...';
    loadData().finally(() => {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    });
  });
}

/* --------------------------------------------------------------------------
   5. Requisição Assíncrona dos Dados Meteorológicos
   -------------------------------------------------------------------------- */
async function loadData() {
  hideNotice();
  const { lat, lon } = currentLocation;

  // Carregamento de dados em cache se disponível
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
        `https://marine-api.open-meteo.com/v1/marine?latitude=-26.91&longitude=-48.58&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature&timezone=America%2FSao_Paulo`
      ),
      fetch(
        `https://flood-api.open-meteo.com/v1/flood?latitude=-26.90&longitude=-48.70&daily=river_discharge,river_discharge_max&forecast_days=3`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,uv_index&timezone=America%2FSao_Paulo`
      )
    ]);

    const weather = weatherRes.status === 'fulfilled' && weatherRes.value.ok ? await weatherRes.value.json() : null;
    const marine = marineRes.status === 'fulfilled' && marineRes.value.ok ? await marineRes.value.json() : null;
    const flood = floodRes.status === 'fulfilled' && floodRes.value.ok ? await floodRes.value.json() : null;
    const air = airRes.status === 'fulfilled' && airRes.value.ok ? await airRes.value.json() : null;

    if (!weather) {
      throw new Error('Falha na resposta do servidor meteorológico.');
    }

    const payload = { weather, marine, flood, air, timestamp: Date.now() };
    localStorage.setItem(`cache_${lat.toFixed(2)}_${lon.toFixed(2)}`, JSON.stringify(payload));
    renderAll(payload);

    updateTimestamp();
  } catch (err) {
    console.warn('Erro ao atualizar dados:', err);
    showNotice('Não foi possível conectar ao serviço de dados meteorológicos. Exibindo dados locais pré-armazenados.');
  }
}

/* --------------------------------------------------------------------------
   6. Renderização de Dados nas Tabelas e Painéis
   -------------------------------------------------------------------------- */
function renderAll(payload) {
  const { weather, marine, flood, air } = payload;
  if (!weather || !weather.current) return;

  const cur = weather.current;
  const wmo = getWmoInfo(cur.weather_code);

  /* --- 1. VISÃO GERAL: RESUMO E TABELA PRINCIPAL --- */
  setText('now-temp', `${Math.round(cur.temperature_2m)}°C`);
  setText('now-icon', '');
  setText('now-cond', wmo.desc);
  setText('now-feels', `${Math.round(cur.apparent_temperature)} °C`);

  if (weather.daily) {
    setText('now-min', `${Math.round(weather.daily.temperature_2m_min[0])} °C`);
    setText('now-max', `${Math.round(weather.daily.temperature_2m_max[0])} °C`);
  }

  setText('val-rain', `${cur.precipitation.toFixed(1)}`);
  const popMax = weather.daily?.precipitation_probability_max?.[0] ?? 0;
  setText('sub-rain', `Probabilidade máxima para hoje: ${popMax}%`);

  const windDir = degToCompass(cur.wind_direction_10m);
  setText('val-wind', `${Math.round(cur.wind_speed_10m)}`);
  setText('sub-wind', `Direção: ${windDir} · Rajadas máximas: ${Math.round(cur.wind_gusts_10m)} km/h`);

  setText('val-humidity', `${cur.relative_humidity_2m}`);
  const dewPoint = (cur.temperature_2m - (100 - cur.relative_humidity_2m) / 5).toFixed(0);
  setText('sub-humidity', `Ponto de orvalho calculado: ${dewPoint} °C`);

  const uvVal = air?.current?.uv_index ?? weather.daily?.uv_index_max?.[0] ?? 0;
  setText('val-uv', uvVal.toFixed(1));
  setText('sub-uv', `Classificação de risco: ${getUvCategory(uvVal)}`);

  setText('val-pressure', `${Math.round(cur.surface_pressure)}`);
  setText('sub-pressure', cur.surface_pressure > 1013 ? 'Pressão alta (estabilidade atmosférica)' : 'Pressão baixa (instabilidade)');

  /* --- 2. RIO ITAJAÍ-AÇU (HIDROLOGIA) --- */
  const riverDischarge = flood?.daily?.river_discharge?.[0];
  const riverPeak = flood?.daily?.river_discharge_max?.[1] || flood?.daily?.river_discharge_max?.[0];
  if (riverDischarge) {
    const disVal = Math.round(riverDischarge);
    setText('val-river', `${disVal}`);
    setText('quick-river-val', `${disVal} m³/s`);
    setText('river-detail-now', `${disVal}`);
    if (riverPeak) {
      setText('river-detail-peak', `${Math.round(riverPeak)}`);
    }

    const statusEl = document.getElementById('quick-river-status');
    if (statusEl) {
      if (disVal > 2500) {
        statusEl.textContent = 'Alerta';
        statusEl.style.color = '#b91c1c';
      } else if (disVal > 1500) {
        statusEl.textContent = 'Atenção';
        statusEl.style.color = '#b45309';
      } else {
        statusEl.textContent = 'Normal';
        statusEl.style.color = '#15803d';
      }
    }
  }

  /* --- 3. MAR E NAVEGAÇÃO --- */
  const waveH = marine?.current?.wave_height;
  const seaTemp = marine?.current?.sea_surface_temperature;
  const wavePeriod = marine?.current?.wave_period;
  const waveDir = marine?.current?.wave_direction;
  const swellH = marine?.current?.swell_wave_height;
  const swellP = marine?.current?.swell_wave_period;

  if (waveH !== undefined && waveH !== null) {
    const wH = waveH.toFixed(1);
    setText('val-wave', `${wH}`);
    setText('quick-wave-val', `${wH} m`);
    setText('marine-wave-h', `${wH}`);
    setText('sub-wave', `Temperatura da água: ${seaTemp ? seaTemp.toFixed(1) + ' °C' : '--'} · Período: ${wavePeriod ? Math.round(wavePeriod) + ' s' : '--'}`);

    if (wavePeriod) setText('marine-wave-p', `${Math.round(wavePeriod)}`);
    if (waveDir) {
      setText('marine-wave-d', `${Math.round(waveDir)}`);
      setText('marine-wave-dir-text', `Quadrante ${degToCompass(waveDir)} (${Math.round(waveDir)}°)`);
    }
    if (swellH !== undefined && swellH !== null) {
      setText('marine-swell-h', `${swellH.toFixed(1)}`);
      setText('marine-swell-p', swellP ? `Período do swell: ${Math.round(swellP)} s` : 'Ondulação de fundo');
    }
    if (seaTemp) setText('marine-sst', `${seaTemp.toFixed(1)}`);

    const waveStatusEl = document.getElementById('quick-wave-status');
    if (waveStatusEl) {
      waveStatusEl.textContent = parseFloat(wH) > 2.5 ? 'Ressaca' : parseFloat(wH) > 1.5 ? 'Agitado' : 'Normal';
    }
  }

  /* --- 4. QUALIDADE DO AR E POLUENTES --- */
  const aqiVal = air?.current?.european_aqi;
  const pm25 = air?.current?.pm2_5;
  const pm10 = air?.current?.pm10;
  const no2 = air?.current?.nitrogen_dioxide;
  const o3 = air?.current?.ozone;
  const so2 = air?.current?.sulphur_dioxide;

  if (aqiVal !== undefined && aqiVal !== null) {
    const aqiNum = Math.round(aqiVal);
    setText('val-aqi', `${aqiNum}`);
    setText('air-aqi-num', `${aqiNum}`);
    setText('sub-aqi', `PM2.5: ${pm25 ? pm25.toFixed(1) : '--'} µg/m³ · Situação: ${getAqiDesc(aqiVal)}`);
    setText('air-aqi-status', `Classificação oficial: ${getAqiDesc(aqiVal)}`);
  }

  if (pm25) setText('air-pm25', `${pm25.toFixed(1)}`);
  if (pm10) setText('air-pm10', `${pm10.toFixed(1)}`);
  if (no2) setText('air-no2', `${no2.toFixed(1)}`);
  if (o3) setText('air-o3', `${o3.toFixed(1)}`);
  if (so2) setText('air-so2', `${so2.toFixed(1)}`);

  setText('air-uv-large', uvVal.toFixed(1));
  setText('air-uv-title', `Índice ${uvVal.toFixed(1)} (${getUvCategory(uvVal)})`);
  setText('air-uv-desc', getUvAdvice(uvVal));

  /* --- 5. LIMIARES OPERACIONAIS E ALERTAS --- */
  const gusts = cur.wind_gusts_10m || 0;
  setText('alert-val-wind', `${Math.round(gusts)} km/h`);
  setAlertBadge('alert-status-wind', gusts > 65 ? 'Alerta' : gusts > 45 ? 'Atenção' : 'Normal');

  const rainSum = weather.daily?.precipitation_sum?.[0] || cur.precipitation || 0;
  setText('alert-val-rain', `${rainSum.toFixed(1)} mm`);
  setAlertBadge('alert-status-rain', rainSum > 70 ? 'Alerta' : rainSum > 30 ? 'Atenção' : 'Normal');

  const waveVal = waveH || 0;
  setText('alert-val-wave', `${waveVal.toFixed(1)} m`);
  setAlertBadge('alert-status-wave', waveVal > 3.0 ? 'Alerta' : waveVal > 2.0 ? 'Atenção' : 'Normal');

  const riverVal = riverDischarge || 0;
  setText('alert-val-river', `${Math.round(riverVal)} m³/s`);
  setAlertBadge('alert-status-river', riverVal > 2500 ? 'Alerta' : riverVal > 1500 ? 'Atenção' : 'Normal');

  /* --- 6. TABELAS DE PREVISÃO (HORÁRIA E DIÁRIA) --- */
  renderHourly(weather.hourly);
  renderDaily(weather.daily);
}

function setAlertBadge(id, status) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = status;
  el.style.fontWeight = status === 'Normal' ? 'normal' : 'bold';
  el.style.color = status === 'Alerta' ? '#b91c1c' : status === 'Atenção' ? '#b45309' : '#15803d';
}

/* --------------------------------------------------------------------------
   7. Tabela de Previsão Horária (24h)
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
    const timeStr = isNow ? 'Agora (Hora atual)' : `${String(date.getHours()).padStart(2, '0')}:00`;
    const temp = Math.round(hourly.temperature_2m[i]);
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;
    const wmo = getWmoInfo(hourly.weather_code[i]);

    html += `
      <tr class="${isNow ? 'linha-destaque' : ''}">
        <td><strong>${timeStr}</strong></td>
        <td>${temp} °C</td>
        <td>${wmo.desc}</td>
        <td>${pop > 0 ? pop + '%' : '0%'}</td>
      </tr>
    `;
  }

  container.innerHTML = html;
}

/* --------------------------------------------------------------------------
   8. Tabela de Previsão Diária (7 Dias)
   -------------------------------------------------------------------------- */
function renderDaily(daily) {
  const container = document.getElementById('daily-list');
  if (!container || !daily || !daily.time) return;

  let html = '';

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + 'T12:00:00');
    const isToday = i === 0;
    const dayName = isToday
      ? 'Hoje'
      : date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    const tMin = Math.round(daily.temperature_2m_min[i]);
    const tMax = Math.round(daily.temperature_2m_max[i]);
    const pop = daily.precipitation_probability_max?.[i] ?? 0;
    const wmo = getWmoInfo(daily.weather_code[i]);

    html += `
      <tr>
        <td><strong>${capitalizeFirstLetter(dayName)}</strong> (${formattedDate})</td>
        <td>${wmo.desc}</td>
        <td>${tMin} °C</td>
        <td>${tMax} °C</td>
        <td>${pop > 0 ? pop + '%' : '0%'}</td>
      </tr>
    `;
  }

  container.innerHTML = html;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/* --------------------------------------------------------------------------
   9. Funções Auxiliares e Decodificadores
   -------------------------------------------------------------------------- */
function getWmoInfo(code) {
  switch (code) {
    case 0:
      return { desc: 'Céu Limpo', icon: '' };
    case 1:
      return { desc: 'Predom. Ensolarado', icon: '' };
    case 2:
      return { desc: 'Parcialmente Nublado', icon: '' };
    case 3:
      return { desc: 'Nublado', icon: '' };
    case 45:
    case 48:
      return { desc: 'Nevoeiro', icon: '' };
    case 51:
    case 53:
    case 55:
      return { desc: 'Garoa / Chuvisco', icon: '' };
    case 61:
    case 63:
    case 65:
      return { desc: 'Chuva Contínua', icon: '' };
    case 80:
    case 81:
    case 82:
      return { desc: 'Pancadas de Chuva', icon: '' };
    case 95:
    case 96:
    case 99:
      return { desc: 'Tempestade / Trovoadas', icon: '' };
    default:
      return { desc: 'Tempo Firme', icon: '' };
  }
}

function degToCompass(deg) {
  const directions = ['Norte', 'NNE', 'Nordeste', 'ENE', 'Leste', 'ESE', 'Sudeste', 'SSE', 'Sul', 'SSW', 'Sudoeste', 'WSW', 'Oeste', 'WNW', 'Noroeste', 'NNW'];
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

function getUvAdvice(uv) {
  if (uv <= 2) return 'Risco baixo de radiação para exposição ao ar livre.';
  if (uv <= 5) return 'Recomenda-se uso de protetor solar e chapéu nas horas de sol pleno.';
  if (uv <= 7) return 'Proteção solar necessária. Evite exposição prolongada entre 10h e 16h.';
  return 'Risco muito elevado. Evite exposição solar direta sem proteção integral.';
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
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const liveEl = document.getElementById('live-time');
  if (liveEl) liveEl.textContent = `${timeStr}`;
}

