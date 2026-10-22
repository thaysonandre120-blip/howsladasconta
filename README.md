# EcoClima — Sistema de Monitoramento Hidrometeorológico

Projeto acadêmico desenvolvido no âmbito do Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas (TADS) do Instituto Federal de Santa Catarina (IFSC) — Câmpus Itajaí.

---

## 📋 Descrição do Sistema

O **EcoClima** é uma aplicação web para acompanhamento e registro de dados meteorológicos, fluviométricos e marítimos em tempo real para os municípios de **Itajaí** e **Navegantes**, com ênfase no monitoramento da bacia do Rio Itajaí-Açu e das condições costeiras.

A apresentação visual adota padrão acadêmico e institucional sóbrio:
- **Estrutura tabular**: dados organizados em tabelas formais com bordas finas e identificação clara de grandezas e unidades.
- **Tipografia do sistema**: família Arial/Helvetica em tamanho e espaçamento padrão.
- **Paleta sóbria**: fundo branco/cinza claro (`#f5f5f5`), textos em cinza escuro (`#222222`) e destaque em azul institucional (`#1a4d8f`).
- **Sem elementos decorativos**: ausência de degradês, bordas arredondadas exageradas, sombras difusas, selos neon ou emojis.

---

## 🧭 Módulos do Sistema

1. **Visão Geral**:
   - Resumo das condições atmosféricas instantâneas.
   - Tabela consolidada de indicadores ambientais (Precipitação, Vento, Umidade, UV, Pressão, Rio, Mar e Ar).
   - Tabela de previsão horária para as próximas 24 horas.
   - Tabela de previsão diária estendida para 7 dias.
2. **Radar Meteorológico**:
   - Visualizador de radar Doppler composto com abrangência no Vale do Itajaí e Litoral Norte Catarinense.
3. **Rio Itajaí-Açu**:
   - Telemetria de vazão instantânea e projeção de pico (m³/s) via GloFAS/Copernicus.
   - Cadastro técnico das barragens de contenção do Alto Vale (Taió, Ituporanga e José Boiteux) e cotas de emergência.
4. **Mar e Navegação**:
   - Parâmetros oceanográficos no canal de acesso portuário (altura de onda, período, rumo, swell e TSM).
   - Tábua teórica de marés diária.
5. **Qualidade do Ar e UV**:
   - Concentração de poluentes atmosféricos (PM2.5, PM10, NO₂, O₃ e SO₂) via CAMS/Copernicus.
   - Índice UV com parecer técnico de exposição solar.
6. **Limiares e Alertas**:
   - Matriz de tolerância operacional para rajadas de vento, acumulado de chuva, agitação marítima e vazão do rio.
   - Relação de hiperlinks para os órgãos oficiais de Defesa Civil, INMET, CEOPS/FURB e Marinha do Brasil.

---

## 🛠️ Tecnologias e Fontes

- **Front-end**: HTML5 semântico, CSS3 puro (arquivo único) e JavaScript nativo (Fetch API assíncrona).
- **APIs de Dados**:
  - Open-Meteo Weather Forecast API
  - Open-Meteo Marine API
  - Open-Meteo Flood API (GloFAS)
  - Open-Meteo Air Quality API (CAMS)
  - RainViewer Weather Radar API

---

## 🚀 Execução Local

Abra o arquivo [`index.html`](index.html) em qualquer navegador ou acesse localmente em:

`http://localhost:8080`
