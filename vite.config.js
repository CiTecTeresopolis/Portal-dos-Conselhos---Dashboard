import { defineConfig } from 'vite';

// O portal CKAN roda em outro domínio (conselhos.teresopolis.rj.gov.br).
// Em desenvolvimento usamos o proxy do Vite para evitar bloqueio de CORS.
// Em produção (build estático), o app chama a API diretamente — o CKAN
// costuma liberar CORS para a API pública; se o seu não liberar, veja o
// aviso no README sobre hospedar atrás de um proxy reverso.
export default defineConfig({
  server: {
    proxy: {
      '/ckan-api': {
        target: 'https://conselhos.teresopolis.rj.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ckan-api/, '/api'),
      },
    },
  },
});
