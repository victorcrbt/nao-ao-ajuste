#!/usr/bin/env node
// Gera dist/ a partir de site/ e tenta atualizar as listas de parlamentares
// nos dados abertos do Senado e da Câmara. Se as APIs falharem, mantém o
// retrato salvo em site/data. Nunca derruba o build.
//
//   node scripts/build.mjs             -> gera dist/
//   node scripts/build.mjs --snapshot  -> também regrava site/data
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'site');
const OUT = join(root, 'dist');
const snapshot = process.argv.includes('--snapshot');
const PROJETO = 'PLP 299/2026';
const ID_PROCESSO = 9127383; // PLP 299/2026 no Senado

async function getJSON(url) {
  const r = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.json();
}

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

function telefone(t) {
  const n = arr(t?.Telefone).find((x) => x.IndicadorFax !== 'Sim')?.NumeroTelefone;
  if (!n) return '';
  const d = String(n).replace(/\D/g, '');
  return d.length === 8 ? `(61) ${d.slice(0, 4)}-${d.slice(4)}` : d;
}

async function senadores() {
  const j = await getJSON('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json');
  const lista = arr(j.ListaParlamentarEmExercicio.Parlamentares.Parlamentar).map((p) => {
    const i = p.IdentificacaoParlamentar;
    return {
      id: Number(i.CodigoParlamentar),
      nome: i.NomeParlamentar,
      partido: i.SiglaPartidoParlamentar || 'S/Partido',
      uf: i.UfParlamentar,
      email: i.EmailParlamentar || '',
      tel: telefone(i.Telefones),
      f: i.SexoParlamentar === 'Feminino' ? 1 : 0,
    };
  });
  if (lista.length < 70) throw new Error('lista de senadores incompleta');
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function sigla(v) {
  if (v === 'Sim') return 'S';
  if (v === 'Não') return 'N';
  if (/^Presidente/.test(v || '')) return 'P';
  return 'A'; // ausente, missão, licença etc.
}

function tipoVotacao(d) {
  if (/ressalvad/i.test(d)) return 'texto-base';
  if (/destaque/i.test(d)) return 'destaque';
  if (/requerimento/i.test(d)) return 'urgencia';
  return 'outra';
}

async function votacoes() {
  const j = await getJSON(`https://legis.senado.leg.br/dadosabertos/votacao?idProcesso=${ID_PROCESSO}`);
  return arr(j)
    // a API às vezes devolve a votação sem os votos; essas são descartadas
    .filter((v) => v.identificacao === PROJETO && v.votacaoSecreta !== 'S' && arr(v.votos).length > 40)
    .sort((a, b) => Number(a.sequencialVotacao) - Number(b.sequencialVotacao))
    .map((v) => {
      const votos = {};
      for (const x of arr(v.votos)) votos[x.codigoParlamentar] = sigla(x.siglaVotoParlamentar);
      const c = Object.values(votos);
      return {
        data: String(v.dataSessao).slice(0, 10),
        descricao: v.descricaoVotacao,
        tipo: tipoVotacao(v.descricaoVotacao || ''),
        sim: c.filter((s) => s === 'S').length,
        nao: c.filter((s) => s === 'N').length,
        votos,
      };
    });
}

async function deputados() {
  const j = await getJSON(
    'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1000&ordem=ASC&ordenarPor=nome',
  );
  const lista = arr(j.dados).map((d) => ({
    id: d.id,
    nome: d.nome,
    partido: d.siglaPartido || 'S/Partido',
    uf: d.siglaUf,
    email: d.email || '',
  }));
  if (lista.length < 450) throw new Error('lista de deputados incompleta');
  return lista;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });

const tarefas = { senadores, votacoes, deputados };
for (const [nome, fn] of Object.entries(tarefas)) {
  try {
    const dados = await fn();
    if (nome === 'votacoes' && dados.length === 0) throw new Error('nenhuma votação encontrada');
    const corpo = JSON.stringify({ atualizado: new Date().toISOString(), dados });
    await writeFile(join(OUT, 'data', `${nome}.json`), corpo);
    if (snapshot) await writeFile(join(SRC, 'data', `${nome}.json`), corpo);
    console.log(`ok  ${nome}: ${dados.length}`);
  } catch (e) {
    console.warn(`!!  ${nome}: mantendo retrato salvo (${e.message})`);
  }
}

// URL pública para as tags de compartilhamento (WhatsApp, X, Facebook).
const host = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '';
const site = host ? (host.startsWith('http') ? host : `https://${host}`).replace(/\/$/, '') : '';
const idx = join(OUT, 'index.html');
await writeFile(idx, (await readFile(idx, 'utf8')).replaceAll('__SITE_URL__', site));
console.log(`dist/ pronto${site ? ` para ${site}` : ''}`);
