import './style.css';
import {
  Chart,
  BarController,
  BarElement,
  PointElement,
  BubbleController,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';

import { fetchAllPackages } from './ckan.js';
import { aggregateByOrganization, colorForIndex } from './aggregate.js';

Chart.register(BarController, BarElement, BubbleController, LinearScale, CategoryScale, Tooltip, PointElement, Legend);

const orgListEl = document.getElementById('org-list');
const orgSearchEl = document.getElementById('org-search');
const statusPill = document.getElementById('status-pill');
const refreshBtn = document.getElementById('refresh-btn');
const kpiOrgs = document.getElementById('kpi-orgs');
const kpiDatasets = document.getElementById('kpi-datasets');
const kpiResources = document.getElementById('kpi-resources');

let barChart = null;
let bubbleChart = null;

function setStatus(kind, text) {
  statusPill.className = `pill pill--${kind}`;
  statusPill.textContent = text;
}

/* ------------------------------------------------------------------ */
/* Matriz de Organizações (árvore com busca)                          */
/* ------------------------------------------------------------------ */

function toggleChildren(childUl, toggle) {
  if (childUl.hidden) {
    childUl.hidden = false;
    childUl.style.maxHeight = '0px';
    childUl.offsetHeight;
    childUl.style.maxHeight = `${childUl.scrollHeight}px`;
    toggle.textContent = '▾';
    toggle.setAttribute('aria-expanded', 'true');
  } else {
    childUl.style.maxHeight = `${childUl.scrollHeight}px`;
    childUl.offsetHeight;
    childUl.style.maxHeight = '0px';
    toggle.textContent = '▸';
    toggle.setAttribute('aria-expanded', 'false');
    childUl.addEventListener('transitionend', function onEnd() {
      childUl.removeEventListener('transitionend', onEnd);
      childUl.hidden = true;
      childUl.style.maxHeight = '';
    });
  }
}

function renderOrgTree(stats, packages, query = '') {
  const q = query.trim().toLowerCase();

  const childrenByOrg = new Map();
  for (const pkg of packages) {
    const org = pkg.organization;
    if (!org) continue;
    if (!childrenByOrg.has(org.id)) childrenByOrg.set(org.id, []);
    childrenByOrg.get(org.id).push(pkg.title || pkg.name);
  }

  orgListEl.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'tree';

  for (const org of stats) {
    const allChildren = childrenByOrg.get(org.id) || [];
    const orgMatch =
      !q ||
      org.title.toLowerCase().includes(q) ||
      org.name.toLowerCase().includes(q);
    const matchingChildren = q ? allChildren.filter((n) => n.toLowerCase().includes(q)) : allChildren;

    if (q && !orgMatch && matchingChildren.length === 0) continue;

    const li = document.createElement('li');
    li.className = 'tree__item';

    const row = document.createElement('div');
    row.className = 'tree__row';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree__toggle' + (allChildren.length ? '' : ' tree__toggle--empty');
    toggle.textContent = allChildren.length ? '▸' : '';
    toggle.setAttribute('aria-expanded', 'false');
    if (!allChildren.length) toggle.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'tree__label';
    label.textContent = org.title;

    row.append(toggle, label);
    li.appendChild(row);

    if (allChildren.length) {
      const childUl = document.createElement('ul');
      childUl.className = 'tree__children';
      childUl.hidden = true;

      const shown = q ? matchingChildren : allChildren;
      for (const name of shown) {
        const cli = document.createElement('li');
        cli.className = 'tree__leaf';
        cli.textContent = name;
        childUl.appendChild(cli);
      }

      toggle.addEventListener('click', () => toggleChildren(childUl, toggle));

      if (q && shown.length) {
        childUl.hidden = false;
        childUl.style.maxHeight = `${childUl.scrollHeight}px`;
        toggle.textContent = '▾';
        toggle.setAttribute('aria-expanded', 'true');
      }

      li.appendChild(childUl);
    }

    ul.appendChild(li);
  }

  if (!ul.children.length) {
    const empty = document.createElement('li');
    empty.className = 'tree__leaf';
    empty.textContent = 'Nenhum resultado para a busca.';
    ul.appendChild(empty);
  }

  orgListEl.appendChild(ul);
}

/* ------------------------------------------------------------------ */
/* Gráficos                                                            */
/* ------------------------------------------------------------------ */

const barValueLabels = {
  id: 'barValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];
    meta.data.forEach((bar, i) => {
      const value = dataset.data[i];
      if (value == null || value === 0) return;
      ctx.save();
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = '#172420';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), bar.x + 6, bar.y);
      ctx.restore();
    });
  },
};

function renderBarChart(stats) {
  const ctx = document.getElementById('chart-arquivos');

  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    plugins: [barValueLabels],
    data: {
      labels: stats.map((o) => o.title),
      datasets: [
        {
          label: 'Total de Arquivos',
          data: stats.map((o) => o.resourceCount),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 26,
          backgroundColor: (context) => {
            const { chart } = context;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return '#28A745';
            const grad = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            grad.addColorStop(0, '#34d05b');
            grad.addColorStop(1, '#1f8b38');
            return grad;
          },
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#172420',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => ` ${ctx.raw} arquivo(s)`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Total de Arquivos', font: { size: 12 } },
          beginAtZero: true,
          grid: { color: '#f2f5f2' },
        },
        y: {
          title: { display: true, text: 'Organização', font: { size: 12 } },
          grid: { display: false },
          ticks: { font: { size: 12 } },
        },
      },
    },
  });
}

function renderBubbleChart(stats) {
  const ctx = document.getElementById('chart-bolhas');
  const maxResources = Math.max(1, ...stats.map((o) => o.resourceCount));
  const highlight = stats.reduce((a, b) => (b.resourceCount > a.resourceCount ? b : a));

  if (bubbleChart) bubbleChart.destroy();
  bubbleChart = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: stats.map((org, i) => {
        const isHighlight = org.id === highlight.id;
        return {
          label: org.title,
          data: [
            {
              x: org.datasetCount,
              y: org.resourceCount,
              r: 8 + (org.resourceCount / maxResources) * 24,
            },
          ],
          backgroundColor: isHighlight ? '#28A745' : colorForIndex(i),
          borderColor: '#ffffff',
          borderWidth: isHighlight ? 2 : 1.5,
          hoverBorderColor: '#1f8b38',
          hoverBorderWidth: 2,
          hoverRadius: (c) => c.raw.r + 3,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: '#172420',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].dataset.label,
            label: (ctx) =>
              ` ${ctx.raw.x} conjunto(s) · ${ctx.raw.y} recurso(s)`,
          },
        },
        legend: {
          position: 'right',
          labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Nº de Conjuntos', font: { size: 12 } },
          beginAtZero: true,
          grid: { color: '#f2f5f2' },
          ticks: { font: { size: 11 } },
        },
        y: {
          title: { display: true, text: 'Nº de Recursos', font: { size: 12 } },
          beginAtZero: true,
          grid: { color: '#f2f5f2' },
          ticks: { font: { size: 11 } },
        },
      },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Load                                                                */
/* ------------------------------------------------------------------ */

function renderKpis(stats) {
  const totalDatasets = stats.reduce((sum, o) => sum + o.datasetCount, 0);
  const totalResources = stats.reduce((sum, o) => sum + o.resourceCount, 0);
  kpiOrgs.textContent = stats.length;
  kpiDatasets.textContent = totalDatasets;
  kpiResources.textContent = totalResources;
}

let statsCache = null;
let packagesCache = null;

orgSearchEl.addEventListener('input', (e) => {
  if (statsCache && packagesCache) renderOrgTree(statsCache, packagesCache, e.target.value);
});

async function loadDashboard() {
  setStatus('loading', 'Carregando…');
  refreshBtn.disabled = true;

  try {
    const packages = await fetchAllPackages();
    const stats = aggregateByOrganization(packages);
    statsCache = stats;
    packagesCache = packages;

    renderOrgTree(stats, packages);
    renderKpis(stats);
    renderBarChart(stats);
    renderBubbleChart(stats);

    setStatus('ok', `Atualizado · ${new Date().toLocaleTimeString('pt-BR')}`);
  } catch (err) {
    console.error(err);
    orgListEl.innerHTML = '<li class="tree__leaf">Falha ao carregar dados da API</li>';
    setStatus('error', 'Falha ao carregar');
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadDashboard);
loadDashboard();
