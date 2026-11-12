# Não ao Ajuste Fiscal

Site estático de pressão cidadã contra o PLP 299/2026 (ajuste fiscal). Permite cobrar senadores,
deputados e o Executivo por e-mail (pelo cliente de e-mail da própria pessoa), telefone e redes sociais.

## Estrutura

- `site/` — página (`index.html`, `styles.css`, `app.js`), fontes e retrato dos dados em `site/data/`.
- `scripts/build.mjs` — gera `dist/` e atualiza, nos dados abertos do Senado e da Câmara, a lista de
  parlamentares em exercício e as votações nominais do PLP 299/2026. Se as APIs falharem, usa o retrato salvo.

## Rodar

```bash
npm run dev
```

## Publicar na Vercel

Importe o repositório em vercel.com/new. O `vercel.json` já define o build (`node scripts/build.mjs`) e a
pasta de saída (`dist`). A cada deploy os dados são atualizados; para atualizar sem alterar o código, use
"Redeploy" no painel da Vercel.

## Atualizar o conteúdo

- Textos da página e citações: `site/index.html`.
- Mensagens-modelo, textos de compartilhamento e contatos do Executivo: topo de `site/app.js`.
- Regravar o retrato dos dados: `npm run dados`.
