/**
 * EcoClima Itajaí-Açu | JavaScript Interactivity
 * Observatório Ambiental e Climático de Itajaí & Navegantes
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileMenu();
  initAnnouncementBar();
  initTabs();
  initTelemetrySimulator();
  initRiverLevelSimulator();
  initClimatePhaseSelector();
  initChecklist();
  initNewsletterForm();
});

/* --------------------------------------------------------------------------
   1. Theme Toggle (Light Nature / Dark Forest)
   -------------------------------------------------------------------------- */
function initThemeToggle() {
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (!themeBtn) return;

  const savedTheme = localStorage.getItem('ecoclima-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', currentTheme);

  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ecoclima-theme', newTheme);
    showToast(newTheme === 'dark' ? '🌲 Modo Floresta Noturna ativado' : '☀️ Modo Luz Natural ativado');
  });
}

/* --------------------------------------------------------------------------
   2. Mobile Menu Navigation
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const menuBtn = document.getElementById('btn-mobile-menu');
  const mainNav = document.getElementById('main-nav');
  if (!menuBtn || !mainNav) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('nav-open');
    menuBtn.setAttribute('aria-expanded', isOpen);
  });

  // Close when clicking nav links
  const navLinks = mainNav.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('nav-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

/* --------------------------------------------------------------------------
   3. Top Announcement Bar
   -------------------------------------------------------------------------- */
function initAnnouncementBar() {
  const bar = document.getElementById('announcement-bar');
  const closeBtn = document.getElementById('btn-close-announcement');
  if (!bar || !closeBtn) return;

  if (sessionStorage.getItem('ecoclima-dismissed-announcement') === 'true') {
    bar.style.display = 'none';
  }

  closeBtn.addEventListener('click', () => {
    bar.style.display = 'none';
    sessionStorage.setItem('ecoclima-dismissed-announcement', 'true');
  });
}

/* --------------------------------------------------------------------------
   4. Interactive Tabs
   -------------------------------------------------------------------------- */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      // Update button active states
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Update panes
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
      });
      const activePane = document.getElementById(targetId);
      if (activePane) {
        activePane.classList.add('active');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   5. Telemetry Refresh & Simulation
   -------------------------------------------------------------------------- */
function initTelemetrySimulator() {
  const refreshBtn = document.getElementById('btn-refresh-telemetry');
  const valRio = document.getElementById('val-rio-nivel');
  const valChuva = document.getElementById('val-chuva');
  const valMare = document.getElementById('val-mare');
  const gaugeVal = document.getElementById('gauge-level-value');
  const waterFill = document.getElementById('water-column-fill');
  const lastUpdate = document.getElementById('last-update-time');

  if (!refreshBtn) return;

  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('animating');
    refreshBtn.disabled = true;

    // Simulate small natural river level fluctuation (+/- 0.05m)
    const baseLevel = 1.42;
    const delta = (Math.random() * 0.16 - 0.08).toFixed(2);
    const newLevel = Math.max(1.10, Math.min(2.10, baseLevel + parseFloat(delta))).toFixed(2);
    
    // Animate values
    if (valRio) valRio.innerHTML = `${newLevel} <span class="stat-unit">m</span>`;
    if (gaugeVal) gaugeVal.textContent = newLevel;

    // Calculate water column fill percent (max 5.5m scale)
    const fillPercent = Math.min(100, Math.max(10, (newLevel / 5.5) * 100)).toFixed(0);
    if (waterFill) waterFill.style.height = `${fillPercent}%`;

    // Simulated tide
    if (valMare) {
      const tideDelta = (0.75 + Math.random() * 0.35).toFixed(2);
      valMare.innerHTML = `${tideDelta} <span class="stat-unit">m</span>`;
    }

    // Timestamp
    if (lastUpdate) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      lastUpdate.textContent = `Atualizado agora às ${timeStr}`;
    }

    setTimeout(() => {
      refreshBtn.classList.remove('animating');
      refreshBtn.disabled = false;
      showToast('📡 Dados hidrológicos atualizados com sucesso!');
    }, 600);
  });
}

/* --------------------------------------------------------------------------
   6. River Level vs. Urban Impact Simulator Slider
   -------------------------------------------------------------------------- */
function initRiverLevelSimulator() {
  const slider = document.getElementById('river-slider');
  const meterVal = document.getElementById('sim-meter-value');
  const statusBanner = document.getElementById('sim-status-banner');
  const badgeLevel = document.getElementById('sim-badge-level');
  const waterMark = document.getElementById('sim-water-mark');
  const impactTitle = document.getElementById('sim-impact-title');
  const impactDesc = document.getElementById('sim-impact-desc');
  const affectedList = document.getElementById('sim-affected-list');

  if (!slider) return;

  const updateSimulation = (level) => {
    meterVal.textContent = `${level.toFixed(2)}m`;
    waterMark.textContent = `Cota: ${level.toFixed(2)} m`;

    // Reset status classes
    statusBanner.className = 'sim-status-banner';

    if (level < 3.0) {
      // Normal
      statusBanner.classList.add('status-banner-normal');
      badgeLevel.textContent = 'ESTÁGIO DE NORMALIDADE';
      impactTitle.textContent = 'Leito regular do rio e circulação normal';
      impactDesc.textContent = 'O rio permanece contido em sua calha natural. Navegação de navios no canal portuário e travessia do Ferry-Boat acontecem sem restrições. Sem alagamentos por refluxo nas bocas de lobo.';
      affectedList.textContent = 'Nenhum bairro sob risco nesta cota.';
    } else if (level < 4.5) {
      // Atenção
      statusBanner.classList.add('status-banner-atencao');
      badgeLevel.textContent = 'ESTÁGIO DE ATENÇÃO';
      impactTitle.textContent = 'Refluxo inicial de maré e áreas baixas';
      impactDesc.textContent = 'Em períodos de maré alta combinada, as galerias pluviais começam a reter água. Primeiros pontos de alagamento por refluxo nas partes mais baixas de Itajaí.';
      affectedList.textContent = 'Cordeiros (Parte Baixa / Murta), Fazenda (proximidades da Beira-Rio) e Navegantes (Foz do Rio Gravatá).';
    } else if (level < 5.5) {
      // Alerta
      statusBanner.classList.add('status-banner-alerta');
      badgeLevel.textContent = 'ESTÁGIO DE ALERTA';
      impactTitle.textContent = 'Transbordamento em vias ribeirinhas e vias arteriais';
      impactDesc.textContent = 'Início de transbordamento do Rio Itajaí-Açu e afluentes (Rio Itajaí-Mirim). Trânsito interrompido em vias arteriais baixas. Recomendada a retirada preventiva de móveis e veículos em áreas históricas.';
      affectedList.textContent = 'Cordeiros, São Vicente, Murta, Bambuzal, Dom Bosco e margem do Rio Gravatá em Navegantes.';
    } else if (level < 7.0) {
      // Emergência 1
      statusBanner.classList.add('status-banner-emergencia');
      badgeLevel.textContent = 'EMERGÊNCIA NÍVEL 1';
      impactTitle.textContent = 'Cheia significativa e abertura de abrigos municipais';
      impactDesc.textContent = 'Transbordamento severo. A circulação do Ferry-Boat entre Itajaí e Navegantes pode ser paralisada devido à velocidade da correnteza e balseiros flutuantes. Abertura imediata de abrigos de acolhimento.';
      affectedList.textContent = 'Cordeiros, São Vicente, Fazenda, Centro (Itajaí), Santa Clara, Machados e São Paulo (Navegantes).';
    } else {
      // Emergência Crítica
      statusBanner.classList.add('status-banner-emergencia');
      badgeLevel.textContent = 'EMERGÊNCIA CRÍTICA (CALAMIDADE)';
      impactTitle.textContent = 'Grande inundação histórica na Foz do Vale';
      impactDesc.textContent = 'Cotas que exigem plano de contingência total e apoio do Exército/Defesa Civil Nacional. Evacuação mandatória de todas as zonas ribeirinhas. Acesso terrestre entre municípios severamente comprometido.';
      affectedList.textContent = 'Quase a totalidade das áreas baixas de Itajaí, Navegantes, Ilhota e ligação BR-101 sob risco de corte hídrico.';
    }
  };

  slider.addEventListener('input', (e) => {
    updateSimulation(parseFloat(e.target.value));
  });
}

/* --------------------------------------------------------------------------
   7. Climate Phase Selector (El Niño vs. La Niña vs. Neutralidade)
   -------------------------------------------------------------------------- */
function initClimatePhaseSelector() {
  const buttons = document.querySelectorAll('.phase-btn');
  const title = document.getElementById('phase-card-title');
  const text = document.getElementById('phase-card-text');

  if (!buttons.length || !title || !text) return;

  const data = {
    elnino: {
      title: 'Fase Ativa: El Niño (Aquecimento Anômalo do Pacífico)',
      text: 'Maior frequência de ciclones extratropicais próximos à costa de SC, chuvas volumosas concentradas na primavera e verão, e invernos mais brandos. Exige prontidão constante das equipes de Defesa Civil e monitoramento intensivo das barragens do Alto Vale.'
    },
    neutral: {
      title: 'Fase de Neutralidade Climatológica',
      text: 'Águas do Pacífico Equatorial próximas da média histórica. O regime de chuvas em Itajaí e Navegantes obedece aos padrões sazonais tradicionais (pancadas de verão convectivas e passagens regulares de frentes frias sem retenção prolongada).'
    },
    lanina: {
      title: 'Fase La Niña (Resfriamento Anômalo do Pacífico)',
      text: 'Tende a provocar estiagens ou chuvas abaixo da média no Sul do Brasil, intercaladas por incursões de ar polar mais intensas e prolongadas no inverno. Risco de estiagem hídrica agrícola no Vale, embora eventos extremos isolados ainda possam ocorrer.'
    }
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const phase = btn.getAttribute('data-phase');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (data[phase]) {
        title.textContent = data[phase].title;
        text.textContent = data[phase].text;
      }
    });
  });
}

/* --------------------------------------------------------------------------
   8. Family Preparedness Checklist with LocalStorage
   -------------------------------------------------------------------------- */
function initChecklist() {
  const checkboxes = document.querySelectorAll('#user-checklist input[type="checkbox"]');
  const progressEl = document.getElementById('checklist-progress');
  const feedbackEl = document.getElementById('checklist-feedback');
  if (!checkboxes.length) return;

  const STORAGE_KEY = 'ecoclima-checklist-state';
  const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  // Load saved state
  checkboxes.forEach((cb, idx) => {
    if (savedState[idx]) {
      cb.checked = true;
    }

    cb.addEventListener('change', () => {
      savedState[idx] = cb.checked;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
      updateProgress();
    });
  });

  function updateProgress() {
    const total = checkboxes.length;
    const completed = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (progressEl) {
      progressEl.textContent = `${completed} de ${total} concluídos`;
    }

    if (feedbackEl) {
      if (completed === 0) {
        feedbackEl.textContent = 'Complete os itens acima para fortalecer sua segurança!';
        feedbackEl.style.color = 'var(--text-secondary)';
      } else if (completed < total) {
        feedbackEl.textContent = `Ótimo progresso! Faltam apenas ${total - completed} itens para sua residência estar 100% prevenida.`;
        feedbackEl.style.color = 'var(--eco-600)';
      } else {
        feedbackEl.textContent = '🎉 Parabéns! Sua família concluiu todas as medidas preventivas essenciais!';
        feedbackEl.style.color = 'var(--eco-700)';
        showToast('🛡️ Parabéns! Checklist de prontidão 100% completo!');
      }
    }
  }

  updateProgress();
}

/* --------------------------------------------------------------------------
   9. Newsletter & Community Alerts Form
   -------------------------------------------------------------------------- */
function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('input-name');
    const contactInput = document.getElementById('input-contact');
    const citySelect = document.getElementById('select-city');

    if (!nameInput.value.trim() || !contactInput.value.trim() || !citySelect.value) {
      showToast('⚠️ Por favor, preencha todos os campos do cadastro.');
      return;
    }

    const cityName = citySelect.options[citySelect.selectedIndex].text;
    showToast(`✅ Obrigado, ${nameInput.value.trim()}! Alertas configurados para ${cityName}.`);
    form.reset();
  });
}

/* --------------------------------------------------------------------------
   10. Toast Notification Helper
   -------------------------------------------------------------------------- */
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}
