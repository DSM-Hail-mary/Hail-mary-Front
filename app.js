// M11 dashboard wiring: REST polling only (no WebSocket -- 개발계획서 1.1절 #8).
// Talks to the same-origin FastAPI app mounted by main.py, so plain fetch()
// with relative paths needs no CORS setup.
import {
  summarizeOccupancy,
  buildForecastChart,
  formatAblation,
  formatSavingsCard,
  projectSeriesToPoints,
  computeSharedRange,
  formatTimestamp,
  formatAxisTick,
  pickTickIndices,
  formatRelativeTime,
  buildKpiSummary,
  layoutBarGroup,
  escapeHtml,
} from "./format.js";

const POLL_MS = 5000;
const THEME_KEY = "hail-mary-theme";
const SVG_NS = "http://www.w3.org/2000/svg";
const CHART_W = 720;
const CHART_H = 280;
const CHART_PAD = 36;

const el = (id) => document.getElementById(id);

// Cross-card state: the KPI strip and the report view both summarize data
// each individual card already fetched, rather than issuing their own
// requests. Fields stay null until their source succeeds at least once, so
// buildKpiSummary/renderReport can render an honest "-" instead of 0.
const latest = {
  occupancySummary: null,
  ablation: null,
  openAnomalyCount: null,
  savingsCard: null,
  forecastChart: null,
};

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

function setConnStatus(ok) {
  const pill = el("connStatus");
  if (ok) {
    pill.textContent = "서버 연결됨";
    pill.className = "pill pill-ok";
  } else {
    pill.textContent = "서버 연결 실패";
    pill.className = "pill pill-error";
  }
  el("lastUpdated").textContent = `마지막 갱신: ${new Date().toLocaleTimeString("ko-KR")}`;
}

// ---- theme toggle (persisted per-viewer in localStorage; falls back to OS) ----

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function effectiveTheme() {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit) return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
  } catch {
    // localStorage unavailable (private mode, etc.) -- fall back to OS theme.
  }
}

el("themeToggle").addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // best-effort persistence only
  }
});

initTheme();

// ---- 1. 실시간 점유율 ----

async function refreshOccupancy() {
  try {
    const data = await getJSON("/api/v1/occupancy/live");
    const summary = summarizeOccupancy(data);
    latest.occupancySummary = summary;
    if (!summary.hasData) {
      el("occupancyTotal").textContent = "–";
      el("occupancyState").textContent = "데이터 없음 (아직 수신된 점유율 데이터가 없습니다)";
      el("zoneList").innerHTML = "";
      return;
    }
    el("occupancyTotal").textContent = summary.total;
    el("occupancyState").textContent = `${summary.zones.length}개 zone`;
    el("zoneList").innerHTML = summary.zones
      .map((z) => `<li><span class="zone-name">${escapeHtml(z.zone_id)}</span><span class="zone-count">${z.count}</span></li>`)
      .join("");
    return true;
  } catch (err) {
    el("occupancyState").textContent = `조회 실패: ${err.message}`;
    throw err;
  }
}

// ---- 2. 예측 vs 실제 그래프 (SVG, hover tooltip, table-view fallback) ----

const SERIES_DEFS = [
  { key: "actual", label: "실제", dataKey: "actual", cls: "chart-line-actual", varName: "--series-actual" },
  { key: "with", label: "occupancy 반영", dataKey: "withOcc", cls: "chart-line-with", varName: "--series-with" },
  { key: "without", label: "occupancy 미반영", dataKey: "withoutOcc", cls: "chart-line-without", varName: "--series-without" },
];

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function pointsToPath(points) {
  let d = "";
  let started = false;
  for (const p of points) {
    if (p == null) {
      started = false;
      continue;
    }
    d += started ? ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    started = true;
  }
  return d;
}

function seriesColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

let chartType = "line";
const CHART_TYPES = ["line", "bar", "scatter"];

function setChartType(type) {
  if (!CHART_TYPES.includes(type) || type === chartType) return;
  chartType = type;
  for (const btn of el("chartTypeToggle").querySelectorAll("button")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.chartType === type));
  }
  if (latest.forecastChart) renderForecastChart(latest.forecastChart);
}

el("chartTypeToggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-chart-type]");
  if (btn) setChartType(btn.dataset.chartType);
});

function renderForecastChart(chart) {
  const svg = el("forecastChart");
  const tooltip = el("chartTooltip");
  svg.innerHTML = "";
  tooltip.classList.remove("visible");

  if (!chart.hasData) return;

  const range = computeSharedRange([chart.actual, chart.withOcc, chart.withoutOcc]);
  const innerSpan = range.max - range.min || 1;
  const n = chart.labels.length;
  const step = n > 1 ? (CHART_W - 2 * CHART_PAD) / (n - 1) : 0;

  // y gridlines (min / mid / max)
  for (const v of [range.min, (range.min + range.max) / 2, range.max]) {
    const y = CHART_PAD + (CHART_H - 2 * CHART_PAD) - ((v - range.min) / innerSpan) * (CHART_H - 2 * CHART_PAD);
    svg.appendChild(svgEl("line", { x1: CHART_PAD, x2: CHART_W - CHART_PAD, y1: y.toFixed(1), y2: y.toFixed(1), class: "chart-gridline" }));
    const label = svgEl("text", { x: CHART_PAD - 6, y: (y + 3).toFixed(1), class: "chart-axis-label", "text-anchor": "end" });
    label.textContent = v.toFixed(1);
    svg.appendChild(label);
  }
  svg.appendChild(svgEl("line", { x1: CHART_PAD, x2: CHART_W - CHART_PAD, y1: CHART_H - CHART_PAD, y2: CHART_H - CHART_PAD, class: "chart-baseline" }));

  // x-axis ticks (thinned so labels never overlap)
  for (const i of pickTickIndices(n, 6)) {
    const x = CHART_PAD + i * step;
    const label = svgEl("text", { x: x.toFixed(1), y: CHART_H - CHART_PAD + 14, class: "chart-axis-label", "text-anchor": "middle" });
    label.textContent = formatAxisTick(chart.labels[i]);
    svg.appendChild(label);
  }

  // marks: line paths, grouped bars, or scatter dots depending on chartType.
  // pointSets holds each series' *value* coordinate (shared, unoffset x) --
  // used directly for line/scatter marks and for the tooltip's numeric
  // values, but NOT for the bar-mode hover dot position (see hoverPointSets
  // below): bars are drawn offset left/center/right within their x tick, so
  // reusing the unoffset x there made hover dots float over the tick center
  // instead of the bar they represent.
  const pointSets = {};
  const hoverPointSets = {};
  // step === 0 (a single data point) would otherwise make groupWidth 0 and
  // every bar invisible with no empty-state message -- fall back to a fixed
  // width in that case, same as a single-category bar chart would use.
  const groupWidth = step > 0 ? step * 0.6 : Math.min(60, CHART_W - 2 * CHART_PAD);
  const baselineY = CHART_H - CHART_PAD;
  SERIES_DEFS.forEach((s, si) => {
    const points = projectSeriesToPoints(chart[s.dataKey], CHART_W, CHART_H, CHART_PAD, range);
    pointSets[s.key] = points;

    if (chartType === "line") {
      hoverPointSets[s.key] = points;
      const d = pointsToPath(points);
      if (d) svg.appendChild(svgEl("path", { d, class: `chart-line ${s.cls}` }));
    } else if (chartType === "bar") {
      const isActual = s.key === "actual";
      hoverPointSets[s.key] = points.map((p, i) => {
        if (!p) return null;
        const x = CHART_PAD + i * step;
        const bar = layoutBarGroup(x, SERIES_DEFS.length, groupWidth)[si];
        // Non-color cue for "actual" (line mode uses a dashed stroke for the
        // same reason -- 기능명세서.md §5 "차트는 색만으로 구분 안 함"):
        // dashed outline instead of a solid fill.
        svg.appendChild(svgEl("rect", {
          x: bar.x.toFixed(1),
          y: p.y.toFixed(1),
          width: bar.width.toFixed(1),
          height: Math.max(0, baselineY - p.y).toFixed(1),
          class: `chart-bar ${s.cls}${isActual ? " chart-bar-actual" : ""}`,
        }));
        return { x: bar.x + bar.width / 2, y: p.y };
      });
    } else if (chartType === "scatter") {
      hoverPointSets[s.key] = points;
      const isActual = s.key === "actual";
      points.forEach((p) => {
        if (!p) return;
        if (isActual) {
          // Diamond instead of a circle for "actual" -- shape, not just
          // color, distinguishes it from the with/without series.
          const size = 5;
          svg.appendChild(svgEl("rect", {
            x: (p.x - size / 2).toFixed(1),
            y: (p.y - size / 2).toFixed(1),
            width: size,
            height: size,
            transform: `rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})`,
            class: `chart-scatter-dot ${s.cls}`,
          }));
        } else {
          svg.appendChild(svgEl("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 3, class: `chart-scatter-dot ${s.cls}` }));
        }
      });
    }
  });

  // crosshair + per-series hover dots (shown on pointermove)
  const crosshair = svgEl("line", { x1: 0, x2: 0, y1: CHART_PAD, y2: CHART_H - CHART_PAD, class: "chart-crosshair" });
  crosshair.style.opacity = 0;
  svg.appendChild(crosshair);

  const hoverDots = {};
  for (const s of SERIES_DEFS) {
    const dot = svgEl("circle", { r: 3.5, class: "chart-hover-dot", fill: seriesColor(s.varName) });
    dot.style.opacity = 0;
    svg.appendChild(dot);
    hoverDots[s.key] = dot;
  }

  const hit = svgEl("rect", {
    x: CHART_PAD, y: CHART_PAD, width: CHART_W - 2 * CHART_PAD, height: CHART_H - 2 * CHART_PAD, class: "chart-hit",
  });
  svg.appendChild(hit);

  function showIndex(i) {
    const x = CHART_PAD + i * step;
    crosshair.setAttribute("x1", x);
    crosshair.setAttribute("x2", x);
    crosshair.style.opacity = 1;

    let rows = "";
    for (const s of SERIES_DEFS) {
      const p = hoverPointSets[s.key][i];
      const dot = hoverDots[s.key];
      if (p) {
        dot.setAttribute("cx", p.x);
        dot.setAttribute("cy", p.y);
        dot.style.opacity = 1;
      } else {
        dot.style.opacity = 0;
      }
      const val = chart[s.dataKey][i];
      const color = seriesColor(s.varName);
      rows += `<div class="tt-row"><span class="tt-swatch" style="background:${color}"></span>${s.label}` +
        `<span class="tt-value">${val == null ? "–" : val.toFixed(2) + " kWh"}</span></div>`;
    }
    tooltip.innerHTML = `<div class="tt-time">${formatTimestamp(chart.labels[i])}</div>${rows}`;
    tooltip.classList.add("visible");

    const wrapRect = el("chartWrap").getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svgRect.width / CHART_W;
    const scaleY = svgRect.height / CHART_H;
    tooltip.style.left = `${svgRect.left - wrapRect.left + x * scaleX}px`;
    tooltip.style.top = `${svgRect.top - wrapRect.top + CHART_PAD * scaleY}px`;
  }

  function hideHover() {
    crosshair.style.opacity = 0;
    for (const s of SERIES_DEFS) hoverDots[s.key].style.opacity = 0;
    tooltip.classList.remove("visible");
  }

  hit.addEventListener("pointermove", (e) => {
    if (step <= 0) {
      showIndex(0);
      return;
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const i = Math.max(0, Math.min(n - 1, Math.round((mouseX - CHART_PAD) / step)));
    showIndex(i);
  });
  hit.addEventListener("pointerleave", hideHover);
}

function renderForecastTable(chart) {
  const tbody = el("forecastTableBody");
  if (!chart.hasData) {
    tbody.innerHTML = "";
    return;
  }
  const fmt = (v) => (v == null ? "–" : v.toFixed(2));
  tbody.innerHTML = chart.labels
    .map((label, i) => `<tr><td>${formatTimestamp(label)}</td><td>${fmt(chart.actual[i])}</td>` +
      `<td>${fmt(chart.withOcc[i])}</td><td>${fmt(chart.withoutOcc[i])}</td></tr>`)
    .join("");
}

function setForecastView(view) {
  const isChart = view === "chart";
  el("chartWrap").hidden = !isChart;
  el("tableWrap").hidden = isChart;
  el("chartTypeToggle").hidden = !isChart;
  el("chartViewBtn").setAttribute("aria-pressed", String(isChart));
  el("tableViewBtn").setAttribute("aria-pressed", String(!isChart));
}

el("chartViewBtn").addEventListener("click", () => setForecastView("chart"));
el("tableViewBtn").addEventListener("click", () => setForecastView("table"));

async function refreshForecast() {
  const buildingId = el("buildingSelect").value;
  const horizon = el("horizonInput").value || undefined;
  try {
    const params = new URLSearchParams({ building_id: buildingId });
    if (horizon) params.set("horizon", horizon);
    const rows = await getJSON(`/api/v1/forecast?${params}`);
    const chart = buildForecastChart(rows);
    latest.forecastChart = chart;
    renderForecastChart(chart);
    renderForecastTable(chart);
    el("forecastState").textContent = chart.hasData
      ? `${buildingId} - ${rows.length}개 지점`
      : "데이터 없음 (아직 계산된 예측이 없습니다)";

    const ablationParams = new URLSearchParams({ building_id: buildingId });
    const ablation = await getJSON(`/api/v1/forecast/ablation?${ablationParams}`);
    latest.ablation = ablation;
    el("ablationText").textContent = formatAblation(ablation);
    return true;
  } catch (err) {
    el("forecastState").textContent = `조회 실패: ${err.message}`;
    throw err;
  }
}

// ---- 3. 이상알림 리스트 ----

const SEVERITY_ICONS = {
  "severity-critical": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"></path><path d="M12 10v4"></path><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"></circle></svg>',
  "severity-high": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3z"></path><path d="M12 10v4"></path><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"></circle></svg>',
  "severity-medium": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5"></path><circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"></circle></svg>',
  "severity-low": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
  "severity-unknown": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v.01M12 8v5"></path></svg>',
};

function severityClass(severity) {
  const known = ["low", "medium", "high", "critical"];
  const s = (severity || "").toLowerCase();
  return known.includes(s) ? `severity-${s}` : "severity-unknown";
}

// event_ids with an ack POST in flight. refreshAnomaly() re-renders the
// whole list from scratch every 5s poll; without tracking this, a poll
// landing mid-ack rebuilds a fresh, enabled "확인" button for that row
// (the ack hasn't reached the server yet, so it's still "open"), erasing
// the pending/disabled state and allowing a duplicate ack POST.
const pendingAcks = new Set();

async function ackAnomaly(eventId, button) {
  pendingAcks.add(eventId);
  button.disabled = true;
  button.textContent = "처리 중…";
  try {
    const res = await fetch(`/api/v1/anomaly/${encodeURIComponent(eventId)}/ack`, { method: "POST" });
    if (!res.ok) throw new Error(`ack failed: HTTP ${res.status}`);
    pendingAcks.delete(eventId);
    await refreshAnomaly();
  } catch (err) {
    pendingAcks.delete(eventId);
    button.disabled = false;
    button.textContent = "확인 실패, 재시도";
    console.error(err);
  }
}

async function refreshAnomaly() {
  try {
    const rows = await getJSON("/api/v1/anomaly?status=open");
    if (!rows || rows.length === 0) {
      latest.openAnomalyCount = 0;
      el("anomalyState").textContent = "열린 이상 알림이 없습니다";
      el("anomalyList").innerHTML = "";
      return;
    }
    latest.openAnomalyCount = rows.length;
    el("anomalyState").textContent = `${rows.length}건`;
    const list = el("anomalyList");
    list.innerHTML = "";
    for (const row of rows) {
      const cls = severityClass(row.severity);
      const isPending = pendingAcks.has(row.event_id);
      const residualText = typeof row.residual_kwh === "number" ? `${row.residual_kwh.toFixed(2)} kWh` : "–";
      const li = document.createElement("li");
      li.className = "anomaly-item";
      li.innerHTML =
        `<span class="severity ${cls}">${SEVERITY_ICONS[cls]}${escapeHtml(row.severity ?? "unknown")}</span>` +
        `<span>${escapeHtml(row.zone_id)}</span>` +
        `<span class="muted">${formatTimestamp(row.ts)}</span>` +
        `<span>${residualText}</span>` +
        `<button class="ack-btn"${isPending ? " disabled" : ""}>${isPending ? "처리 중…" : "확인"}</button>`;
      li.querySelector(".ack-btn").addEventListener("click", (e) => ackAnomaly(row.event_id, e.target));
      list.appendChild(li);
    }
    return true;
  } catch (err) {
    el("anomalyState").textContent = `조회 실패: ${err.message}`;
    throw err;
  }
}

// ---- 4. 절감/탄소 지표 카드 ----

async function refreshSavings() {
  try {
    const reports = await getJSON("/api/v1/savings");
    const card = formatSavingsCard(reports);
    latest.savingsCard = card;
    if (!card.hasData) {
      el("savingsState").textContent = "데이터 없음 (아직 생성된 절감 리포트가 없습니다)";
      el("savingsGrid").hidden = true;
      return;
    }
    el("savingsState").textContent = "";
    el("savingsGrid").hidden = false;
    el("savingsPeriod").textContent = card.periodLabel;
    el("savingsKwh").textContent = card.savedKwhText;
    el("savingsPct").textContent = card.savedPctText;
    el("savingsCo2").textContent = card.co2Text;
    el("savingsTree").textContent = card.treeText;
    return true;
  } catch (err) {
    el("savingsState").textContent = `조회 실패: ${err.message}`;
    throw err;
  }
}

// ---- 5. 마지막 목격 이미지 (zone당 1장, 문서/제안서.md 9장 예외) ----

async function refreshLastSeen() {
  try {
    const rows = await getJSON("/api/v1/last-seen");
    if (!rows || rows.length === 0) {
      el("lastSeenState").textContent = "데이터 없음 (아직 zone이 빈 적이 없습니다)";
      el("lastSeenGrid").innerHTML = "";
      return;
    }
    el("lastSeenState").textContent = `${rows.length}개 zone`;
    el("lastSeenGrid").innerHTML = rows
      .map(
        (r) => `<div class="last-seen-item">` +
          `<img src="${escapeHtml(r.image_url)}" alt="${escapeHtml(r.zone_id)} 마지막 목격 이미지" loading="lazy">` +
          `<div class="last-seen-meta"><span class="last-seen-zone">${escapeHtml(r.zone_id)}</span>` +
          `<span class="last-seen-time">${formatRelativeTime(r.captured_at)}</span></div></div>`
      )
      .join("");
    return true;
  } catch (err) {
    el("lastSeenState").textContent = `조회 실패: ${err.message}`;
    throw err;
  }
}

// ---- KPI 요약바 + 리포트뷰 (이미 받아온 데이터를 재사용, 새 요청 없음) ----

function renderKpiStrip() {
  const kpi = buildKpiSummary({
    occupancy: latest.occupancySummary,
    ablation: latest.ablation,
    openAnomalyCount: latest.openAnomalyCount,
    savingsCard: latest.savingsCard,
  });
  el("kpiOccupancy").textContent = kpi.totalOccupancy == null ? "–" : `${kpi.totalOccupancy}명`;
  el("kpiAnomaly").textContent = kpi.openAnomalyCount == null ? "–" : `${kpi.openAnomalyCount}건`;
  el("kpiAblation").textContent = kpi.maeImprovementPct == null ? "–" : `${kpi.maeImprovementPct.toFixed(1)}%`;
  el("kpiSavings").textContent = kpi.savedPct == null ? "–" : `${kpi.savedPct.toFixed(1)}%`;
}

function renderReport() {
  const occ = latest.occupancySummary;
  const savings = latest.savingsCard;
  const ablation = latest.ablation;

  el("reportOccupancy").textContent = occ && occ.hasData ? `${occ.total}명 (${occ.zones.length}개 zone)` : "데이터 없음";

  if (savings && savings.hasData) {
    el("reportPeriod").textContent = `기간: ${savings.periodLabel}`;
    el("reportSavedKwh").textContent = savings.savedKwhText;
    el("reportSavedPct").textContent = savings.savedPctText;
    el("reportCo2").textContent = savings.co2Text;
  } else {
    el("reportPeriod").textContent = "기간 정보 없음 (절감 리포트 미생성)";
    el("reportSavedKwh").textContent = "–";
    el("reportSavedPct").textContent = "–";
    el("reportCo2").textContent = "–";
  }

  el("reportAblation").textContent = ablation ? formatAblation(ablation) : "데이터 없음";
  el("reportAnomalyCount").textContent = latest.openAnomalyCount == null ? "–" : `${latest.openAnomalyCount}건`;
  el("reportGeneratedAt").textContent = `생성 시각: ${new Date().toLocaleString("ko-KR")}`;
}

el("printReportBtn").addEventListener("click", () => {
  renderReport();
  window.print();
});

// ---- polling loop ----

async function refreshAll() {
  const results = await Promise.allSettled([
    refreshOccupancy(),
    refreshForecast(),
    refreshAnomaly(),
    refreshSavings(),
    refreshLastSeen(),
  ]);
  setConnStatus(results.some((r) => r.status === "fulfilled"));
  renderKpiStrip();
  renderReport();
}

el("buildingSelect").addEventListener("change", refreshForecast);
el("horizonInput").addEventListener("change", refreshForecast);

refreshAll();
setInterval(refreshAll, POLL_MS);
