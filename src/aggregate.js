/**
 * Agrega a lista de pacotes (conjuntos de dados) do CKAN por organização,
 * contando quantos conjuntos e quantos recursos (arquivos) cada uma tem.
 *
 * @param {Array} packages - resultado de fetchAllPackages()
 * @returns {Array<{id, name, title, datasetCount, resourceCount}>}
 */
export function aggregateByOrganization(packages) {
  const byOrg = new Map();

  for (const pkg of packages) {
    const org = pkg.organization;
    if (!org) continue;

    if (!byOrg.has(org.id)) {
      byOrg.set(org.id, {
        id: org.id,
        name: org.name,
        title: org.title || org.name,
        datasetCount: 0,
        resourceCount: 0,
      });
    }

    const entry = byOrg.get(org.id);
    entry.datasetCount += 1;
    entry.resourceCount += Array.isArray(pkg.resources) ? pkg.resources.length : 0;
  }

  return Array.from(byOrg.values()).sort((a, b) => b.resourceCount - a.resourceCount);
}

/**
 * Mede a atividade de cada organização em um período: conta quantos recursos
 * (arquivos) foram publicados no mês/ano da data de referência.
 *
 * @param {Array} packages - resultado de fetchAllPackages()
 * @param {Date} [date] - data de referência (padrão: hoje)
 * @returns {Array<{id, name, title, activityCount}>} ordenado por atividade desc
 */
export function activityByOrganization(packages, date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const byOrg = new Map();

  for (const pkg of packages) {
    const org = pkg.organization;
    if (!org) continue;

    const count = Array.isArray(pkg.resources)
      ? pkg.resources.filter((r) => {
          if (!r.created) return false;
          const d = new Date(r.created);
          return d.getFullYear() === year && d.getMonth() === month;
        }).length
      : 0;

    if (count === 0) continue;

    if (!byOrg.has(org.id)) {
      byOrg.set(org.id, {
        id: org.id,
        name: org.name,
        title: org.title || org.name,
        activityCount: 0,
      });
    }
    byOrg.get(org.id).activityCount += count;
  }

  return Array.from(byOrg.values()).sort(
    (a, b) => b.activityCount - a.activityCount || a.title.localeCompare(b.title, 'pt-BR'),
  );
}

/** Paleta suave e cíclica para diferenciar organizações nos gráficos. */
export const PALETTE = [
  '#a9c9a8', '#a8bcc9', '#d8c48a', '#d3a894', '#bcacd0',
  '#a3d9b0', '#8fb5a2', '#e2d0a0', '#9fbcc0', '#c9a3b8',
];

export function colorForIndex(i) {
  return PALETTE[i % PALETTE.length];
}
