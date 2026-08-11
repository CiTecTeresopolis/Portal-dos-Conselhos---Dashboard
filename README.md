# Painel · Portal dos Conselhos de Teresópolis

Dashboard em Vite (JS puro) que consome a **API do CKAN** do
[Portal dos Conselhos de Teresópolis](https://conselhos.teresopolis.rj.gov.br) para mostrar:

- **Organizações** (lista lateral, com nº de conjuntos de dados de cada uma)
- **Total de Arquivos por Organização** (gráfico de barras)
- **Nº de Conjuntos vs. Nº de Recursos por Organização** (gráfico de bolhas)
- KPIs gerais (organizações, conjuntos, arquivos)

Réplica do dashboard feito em Power BI, mas 100% client-side.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview   # para testar o build localmente
```

## Como funciona

- `src/ckan.js` — chama a API de Ação do CKAN (`/api/3/action/...`):
  - `organization_list` (com `include_dataset_count=true`)
  - `package_search` (paginado, `rows=100`) para trazer todos os conjuntos
    de dados com seus recursos (arquivos)
- `src/aggregate.js` — agrupa os pacotes por organização, contando
  conjuntos e recursos
- `src/main.js` — desenha os gráficos com [Chart.js](https://www.chartjs.org/)

## Sobre CORS

Em **desenvolvimento** (`npm run dev`), o `vite.config.js` usa o proxy do
Vite (`/ckan-api` → `https://conselhos.teresopolis.rj.gov.br/api`), então
não há problema de CORS.

Em **produção** (build estático hospedado em outro domínio), o app chama a
API diretamente. A maioria das instalações CKAN libera CORS para a API
pública por padrão. Se o seu ambiente bloquear, duas opções:

1. Hospedar o front-end atrás de um proxy reverso (Nginx/Caddy) que
   redirecione `/api/*` para `conselhos.teresopolis.rj.gov.br/api/*`.
2. Subir uma pequena função serverless / endpoint próprio que repasse as
   chamadas à API do CKAN.

## Customizar

- Cores e tipografia: `src/style.css` (variáveis CSS no topo do arquivo)
- Paleta dos gráficos: `PALETTE` em `src/aggregate.js`
- Se quiser filtrar por organização específica ou por tags, dá para usar
  `fq` no `package_search` (ex.: `fq: 'organization:comdema'`).
