// Cliente simples para a API de Ação do CKAN.
// Docs: https://docs.ckan.org/en/2.9/api/

// Em dev, passamos pelo proxy do Vite (configurado em vite.config.js) para
// não esbarrar em CORS. Em produção, chamamos a API diretamente.
const BASE_URL = import.meta.env.DEV
  ? '/ckan-api/3/action'
  : 'https://conselhos.teresopolis.rj.gov.br/api/3/action';

async function ckanGet(action, params = {}) {
  const url = new URL(`${BASE_URL}/${action}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Erro ao chamar ${action}: HTTP ${res.status}`);
  }
  const body = await res.json();
  if (!body.success) {
    throw new Error(`CKAN retornou erro em ${action}: ${JSON.stringify(body.error)}`);
  }
  return body.result;
}

/** Lista organizações com metadados (título, nº de conjuntos, etc). */
export async function fetchOrganizations() {
  return ckanGet('organization_list', {
    all_fields: 'true',
    include_dataset_count: 'true',
  });
}

/**
 * Busca TODOS os pacotes (conjuntos de dados) do portal, paginando conforme
 * necessário, incluindo a lista de recursos (arquivos) de cada um.
 */
export async function fetchAllPackages() {
  const pageSize = 100;
  let start = 0;
  let total = Infinity;
  const all = [];

  while (start < total) {
    const result = await ckanGet('package_search', {
      rows: pageSize,
      start,
    });
    total = result.count;
    all.push(...result.results);
    start += pageSize;
  }

  return all;
}
