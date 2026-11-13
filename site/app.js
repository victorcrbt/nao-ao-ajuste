/* Não ao Ajuste Fiscal — ferramenta de cobrança. Sem dependências. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const SITE = location.origin + '/';
  const LOTE = 15; // destinatários por e-mail, para o link não estourar o limite dos aplicativos
  const PAGINA = 90;

  const CASAS = {
    senado: {
      um: 'senador', uma: 'senadora', plural: 'senadores', coletivo: 'Senhoras Senadoras e Senhores Senadores',
      foto: (p) => `https://www.senado.leg.br/senadores/img/fotos-oficiais/senador${p.id}.jpg`,
      contexto: 'O texto-base passou por 45 a 31, mas a votação não acabou: na terça-feira (17) o Plenário vota quatro destaques, que ainda podem tirar trechos do projeto. A etiqueta ao lado de cada nome mostra o voto no texto-base.',
      assunto: 'PLP 299/2026: na terça, vote para derrubar os cortes do ajuste fiscal',
      corpo: [
        'O Senado aprovou em 12/11, por 45 a 31, o texto-base do PLP 299/2026, o projeto de ajuste fiscal. Na terça-feira (17) o Plenário vota os destaques, e escrevo para pedir que V. Exa. vote para retirar os cortes do texto.',
        'O projeto foi protocolado, levado a voto em urgência e aprovado em pouco mais de um dia, sem passar por nenhuma comissão. Ele reduz de 2,5% para 2% o limite de crescimento real das despesas, autoriza bloquear verbas mesmo quando a meta fiscal já está sendo cumprida, retira receitas do petróleo da base que define despesas mínimas como o piso da saúde e segura até 2030 repasses devidos a estados e municípios.',
        'Não foi para cortar gasto social que o povo foi às urnas. Se é preciso equilibrar as contas, que se cobre de quem tem mais: grandes fortunas, benefícios tributários e emendas parlamentares.',
        'Vou acompanhar e divulgar o seu voto.',
      ].join('\n\n'),
    },
    camara: {
      um: 'deputado', uma: 'deputada', plural: 'deputados', coletivo: 'Senhoras Deputadas e Senhores Deputados',
      foto: (p) => `https://www.camara.leg.br/internet/deputado/bandep/${p.id}.jpg`,
      contexto: 'É aqui que o ajuste pode ser barrado. Depois dos destaques no Senado, o projeto segue para a Câmara dos Deputados, onde precisa de 257 votos. Cobre desde já os deputados do seu estado.',
      assunto: 'Vote NÃO ao PLP 299/2026 — o ajuste fiscal não pode passar na Câmara',
      corpo: [
        'O Senado aprovou em 12/11, por 45 a 31, o texto-base do PLP 299/2026, o projeto de ajuste fiscal, que agora segue para a Câmara dos Deputados. Escrevo para pedir que V. Exa. vote NÃO e se posicione publicamente desde já.',
        'O projeto passou no Senado em pouco mais de um dia, sem comissão. Ele reduz de 2,5% para 2% o limite de crescimento real das despesas, autoriza bloquear verbas mesmo quando a meta fiscal já está sendo cumprida, retira receitas do petróleo da base que define despesas mínimas como o piso da saúde e segura até 2030 repasses devidos a estados e municípios.',
        'Não foi para cortar gasto social que o povo foi às urnas. Se é preciso equilibrar as contas, que se cobre de quem tem mais: grandes fortunas, benefícios tributários e emendas parlamentares.',
        'Vou acompanhar e divulgar o seu voto.',
      ].join('\n\n'),
    },
  };

  const EXECUTIVO = [
    { cargo: 'Presidência da República', nome: 'Lula', arroba: '@LulaOficial',
      texto: 'Pode retirar o apoio do governo ao projeto antes da votação na Câmara e mandar a equipe econômica rever o pacote.' },
    { cargo: 'Ministério da Fazenda', nome: 'Dario Durigan', arroba: '@MinFazenda',
      texto: 'A pasta defende o ajuste para cumprir a meta fiscal e negociou o texto aprovado no Senado.' },
    { cargo: 'Ministério do Planejamento e Orçamento', nome: 'Bruno Moretti', arroba: '',
      texto: 'Apresentou o pacote ao Congresso e estimou o impacto em R$ 50 a 60 bilhões em 2027.' },
  ];
  const CORPO_EXEC = [
    'Peço que o governo federal retire o apoio ao PLP 299/2026 e desista do ajuste fiscal, aprovado em texto-base no Senado e a caminho da Câmara dos Deputados.',
    'O projeto reduz de 2,5% para 2% o limite de crescimento real das despesas, amplia o bloqueio de verbas mesmo com a meta fiscal cumprida, retira receitas do petróleo da base que define despesas mínimas como o piso da saúde e segura até 2030 repasses devidos a estados e municípios.',
    'Não foi esse o programa que venceu a eleição. Se é preciso equilibrar as contas, que o governo cobre de quem tem mais: grandes fortunas, benefícios tributários e emendas parlamentares, sem cortar o que chega à população.',
  ].join('\n\n');

  const TEXTO_REDES = 'O Senado aprovou por 45 a 31, em pouco mais de um dia e sem comissão, o texto-base de um ajuste fiscal de até R$ 60 bilhões (PLP 299/2026). Ele aperta o limite de gastos, amplia o bloqueio de verbas e mexe na base do piso da saúde.\n\nAinda dá para barrar: faltam os destaques no Senado (terça, 17) e toda a votação na Câmara. Em 2 minutos você cobra senadores e deputados por e-mail:';

  const estado = {
    casa: 'senado',
    dados: { senado: [], camara: [] },
    sel: { senado: new Set(), camara: new Set() },
    filtro: { senado: { uf: '', partido: '', busca: '', voto: '' }, camara: { uf: '', partido: '', busca: '', voto: '' } },
    limite: PAGINA,
    votacao: null,
    texto: {},
  };

  /* ---------- utilidades ---------- */
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
  const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  async function copiar(texto, msg, campo) {
    try { await navigator.clipboard.writeText(texto); toast(msg); }
    catch {
      if (campo) { campo.focus(); campo.select(); toast('Texto selecionado: copie com Ctrl+C ou toque em “Copiar”.'); }
      else toast('Não foi possível copiar automaticamente.');
    }
  }

  /* ---------- dados ---------- */
  const voto = (p) => (estado.casa === 'senado' && estado.votacao ? estado.votacao.votos[p.id] || 'A' : '');
  const ROTULO_VOTO = () => {
    const u = estado.votacao?.tipo === 'urgencia';
    return { S: u ? 'Sim à urgência' : 'Sim ao ajuste', N: u ? 'Não à urgência' : 'Não ao ajuste', A: 'Não votou', P: 'Presidiu a sessão' };
  };

  function filtrados() {
    const f = estado.filtro[estado.casa];
    const b = semAcento(f.busca.trim());
    return estado.dados[estado.casa].filter((p) =>
      (!f.uf || p.uf === f.uf) && (!f.partido || p.partido === f.partido) &&
      (!f.voto || voto(p) === f.voto) && (!b || semAcento(p.nome).includes(b)));
  }
  const selecionados = () => estado.dados[estado.casa].filter((p) => estado.sel[estado.casa].has(p.id));

  /* ---------- lista ---------- */
  function montarFiltros() {
    const lista = estado.dados[estado.casa];
    const f = estado.filtro[estado.casa];
    const opcoes = (vals, todos) => `<option value="">${todos}</option>` + vals.map((v) => `<option>${esc(v)}</option>`).join('');
    $('#f-uf').innerHTML = opcoes([...new Set(lista.map((p) => p.uf))].sort(), 'Todos os estados');
    $('#f-partido').innerHTML = opcoes([...new Set(lista.map((p) => p.partido))].sort((a, b) => a.localeCompare(b, 'pt-BR')), 'Todos os partidos');
    $('#f-uf').value = f.uf; $('#f-partido').value = f.partido; $('#f-busca').value = f.busca;

    const at = $('#atalhos');
    if (estado.casa === 'senado' && estado.votacao) {
      const u = estado.votacao.tipo === 'urgencia' ? ' à urgência' : '';
      const n = (s) => lista.filter((p) => voto(p) === s).length;
      const chips = [['', `Todos (${lista.length})`], ['S', `Votaram SIM${u} (${n('S')})`], ['N', `Votaram NÃO${u} (${n('N')})`], ['A', `Não votaram (${n('A') + n('P')})`]];
      at.innerHTML = chips.map(([v, t]) => `<button type="button" class="chip" data-voto="${v}" aria-pressed="${f.voto === v}">${t}</button>`).join('');
      at.hidden = false;
    } else { at.innerHTML = ''; at.hidden = true; }
  }

  function desenharLista() {
    const c = CASAS[estado.casa];
    const todos = filtrados();
    const rot = ROTULO_VOTO();
    const visiveis = todos.slice(0, estado.limite);
    $('#lista').innerHTML = visiveis.length ? visiveis.map((p) => {
      const v = voto(p);
      const marcado = estado.sel[estado.casa].has(p.id) ? ' checked' : '';
      return `<li><label class="item">
        <input type="checkbox" data-id="${p.id}"${marcado}${p.email ? '' : ' disabled'} aria-label="Selecionar ${esc(p.nome)}">
        <img src="${c.foto(p)}" alt="" width="48" height="48" loading="lazy" decoding="async">
        <span class="quem"><span class="nome">${esc(p.nome)}</span>
          <span class="meta">${esc(p.partido)}-${p.uf}${v ? ` <span class="voto voto-${v}">${rot[v]}</span>` : ''}</span></span>
        <span class="contatos">${p.tel ? `<a href="tel:+55${p.tel.replace(/\D/g, '')}">Ligar ${p.tel}</a>` : ''}${p.email ? '' : '<span>Sem e-mail divulgado</span>'}</span>
      </label></li>`;
    }).join('') : '<li class="vazio">Ninguém encontrado com esses filtros.</li>';
    $$('#lista img').forEach((img) => img.addEventListener('error', () => {
      const s = document.createElement('span'); s.className = 'sem-foto'; img.replaceWith(s);
    }, { once: true }));
    $('#ver-mais').hidden = todos.length <= estado.limite;
    $('#ver-mais').textContent = `Mostrar mais ${Math.min(PAGINA, todos.length - estado.limite)} de ${todos.length}`;
    $('#contagem').textContent = `${plural(todos.length, c.um, c.plural)} na lista`;
    atualizarEnvio();
  }

  /* ---------- mensagem e envio ---------- */
  function mensagem(dest) {
    const c = CASAS[estado.casa];
    const nome = $('#m-nome').value.trim();
    const cidade = $('#m-cidade').value.trim();
    const saudacao = dest.length === 1
      ? (estado.casa === 'senado' ? `${dest[0].f ? 'Senadora' : 'Senador'} ${dest[0].nome},` : `Deputado(a) ${dest[0].nome},`)
      : `${c.coletivo},`;
    const assinatura = ['Atenciosamente,', nome || '[seu nome]', cidade].filter(Boolean).join('\n');
    return `${saudacao}\n\n${$('#m-corpo').value.trim()}\n\n${assinatura}`;
  }

  function atualizarEnvio() {
    const c = CASAS[estado.casa];
    const dest = selecionados().filter((p) => p.email);
    const n = dest.length;
    $('#sem-selecao').hidden = n > 0;
    $('#envio').hidden = n === 0;
    const barra = $('#barra');
    barra.hidden = n === 0 || estado.casa === 'executivo';
    $('#barra-texto').textContent = `${plural(n, c.um, c.plural)} ${n === 1 ? 'selecionado' : 'selecionados'}`;
    if (!n) return;

    const assunto = encodeURIComponent($('#m-assunto').value.trim());
    const lotes = [];
    for (let i = 0; i < n; i += LOTE) lotes.push(dest.slice(i, i + LOTE));
    $('#envio-resumo').textContent = lotes.length === 1
      ? `Sua mensagem vai para ${plural(n, c.um, c.plural)}. Escolha por onde enviar:`
      : `São ${plural(n, c.um, c.plural)}. Para o e-mail não ser barrado, o envio é dividido em ${lotes.length} mensagens de até ${LOTE} destinatários. Abra uma de cada vez e toque em enviar.`;
    $('#lotes').innerHTML = lotes.map((l, i) => {
      const emails = l.map((p) => p.email);
      const corpo = encodeURIComponent(mensagem(l).replace(/\n/g, '\r\n'));
      const mailto = `mailto:${emails.join(',')}?subject=${assunto}&body=${corpo}`;
      const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emails.join(','))}&su=${assunto}&body=${corpo}`;
      const outlook = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(emails.join(';'))}&subject=${assunto}&body=${corpo}`;
      const quem = l.length <= 3 ? l.map((p) => p.nome).join(', ') : `${l[0].nome} a ${l[l.length - 1].nome}`;
      return `<div class="lote">
        <p class="lote-tit">${lotes.length > 1 ? `Mensagem ${i + 1} de ${lotes.length} ` : ''}<small>${esc(quem)} · ${plural(l.length, 'destinatário', 'destinatários')}</small></p>
        <div class="lote-btns">
          <a class="btn btn-preto" href="${esc(mailto)}">Abrir no meu app de e-mail</a>
          <a class="btn btn-contorno" href="${esc(gmail)}" target="_blank" rel="noopener">Gmail</a>
          <a class="btn btn-contorno" href="${esc(outlook)}" target="_blank" rel="noopener">Outlook / Hotmail</a>
        </div></div>`;
    }).join('');
  }

  /* ---------- abas ---------- */
  function trocarCasa(casa) {
    if (estado.pronto && estado.casa !== 'executivo') estado.texto[estado.casa] = { assunto: $('#m-assunto').value, corpo: $('#m-corpo').value };
    estado.casa = casa; estado.pronto = true;
    $$('.abas button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.casa === casa)));
    const exec = casa === 'executivo';
    $('#painel-lista').hidden = exec;
    $('#painel-executivo').hidden = !exec;
    if (exec) { $('#barra').hidden = true; return; }
    const c = CASAS[casa];
    const t = estado.texto[casa] || c;
    $('#contexto').textContent = c.contexto;
    $('#m-assunto').value = t.assunto; $('#m-corpo').value = t.corpo;
    estado.limite = PAGINA;
    montarFiltros();
    desenharLista();
  }

  /* ---------- compartilhar ---------- */
  function linkRede(rede, texto) {
    const t = encodeURIComponent(texto), u = encodeURIComponent(SITE), tu = encodeURIComponent(`${texto} ${SITE}`);
    return {
      whatsapp: `https://wa.me/?text=${tu}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      bluesky: `https://bsky.app/intent/compose?text=${tu}`,
    }[rede];
  }
  function montarRedes() {
    $('#s-texto').value = `${TEXTO_REDES} ${SITE}\n\n#NãoAoAjusteFiscal #PLP299`;
    const curto = 'O Senado aprovou por 45 a 31 o texto-base do ajuste fiscal de até R$ 60 bi (PLP 299/2026). Ainda faltam os destaques (terça, 17) e a Câmara. Cobre senadores e deputados em 2 minutos:';
    $$('[data-share]').forEach((a) => {
      const rede = a.dataset.share;
      a.href = linkRede(rede, rede === 'x' || rede === 'bluesky' ? `${curto} #NãoAoAjusteFiscal` : TEXTO_REDES);
      a.target = '_blank'; a.rel = 'noopener';
    });
  }
  function montarExecutivo() {
    $('#x-corpo').value = CORPO_EXEC;
    $('#exec').innerHTML = EXECUTIVO.map((e) => {
      const alvo = e.arroba || e.nome;
      const post = `${alvo}, retire o apoio ao ajuste fiscal. O PLP 299/2026 aperta o limite de gastos e mexe na base do piso da saúde. Não foi isso que venceu a eleição. #NãoAoAjusteFiscal`;
      return `<li><span class="cargo">${e.cargo}</span><span class="nome">${e.nome}</span><p>${e.texto}</p>
        <a class="btn btn-contorno" href="${esc(linkRede('x', post))}" target="_blank" rel="noopener">Cobrar no X${e.arroba ? ` ${e.arroba}` : ''}</a></li>`;
    }).join('');
  }

  /* ---------- eventos ---------- */
  function ligar() {
    $$('.abas button').forEach((b) => b.addEventListener('click', () => trocarCasa(b.dataset.casa)));
    $('#atalhos').addEventListener('click', (e) => {
      const b = e.target.closest('[data-voto]'); if (!b) return;
      estado.filtro.senado.voto = b.dataset.voto; estado.limite = PAGINA;
      montarFiltros(); desenharLista();
    });
    const aoFiltrar = (campo, chave) => $(campo).addEventListener('input', (e) => {
      estado.filtro[estado.casa][chave] = e.target.value; estado.limite = PAGINA; desenharLista();
    });
    aoFiltrar('#f-uf', 'uf'); aoFiltrar('#f-partido', 'partido'); aoFiltrar('#f-busca', 'busca');
    $('#lista').addEventListener('change', (e) => {
      const id = Number(e.target.dataset.id); if (!id) return;
      estado.sel[estado.casa][e.target.checked ? 'add' : 'delete'](id);
      atualizarEnvio();
    });
    $('#marcar-todos').addEventListener('click', () => {
      filtrados().filter((p) => p.email).forEach((p) => estado.sel[estado.casa].add(p.id));
      desenharLista();
    });
    $('#limpar').addEventListener('click', () => { estado.sel[estado.casa].clear(); desenharLista(); });
    $('#ver-mais').addEventListener('click', () => { estado.limite += PAGINA; desenharLista(); });

    ['#m-nome', '#m-cidade', '#m-assunto', '#m-corpo'].forEach((s) => $(s).addEventListener('input', atualizarEnvio));
    $('#m-nome').addEventListener('change', (e) => guardar('naa-nome', e.target.value));
    $('#m-cidade').addEventListener('change', (e) => guardar('naa-cidade', e.target.value));
    $('#m-restaurar').addEventListener('click', () => {
      const c = CASAS[estado.casa];
      $('#m-assunto').value = c.assunto; $('#m-corpo').value = c.corpo; atualizarEnvio();
    });
    $('#lotes').addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      a.closest('.lote').querySelector('.lote-tit').insertAdjacentHTML('afterbegin', a.closest('.lote').dataset.ok ? '' : '✓ ');
      a.closest('.lote').dataset.ok = '1';
    });
    $('#copiar-emails').addEventListener('click', () =>
      copiar(selecionados().filter((p) => p.email).map((p) => p.email).join(', '), 'E-mails copiados.'));
    $('#copiar-msg').addEventListener('click', () =>
      copiar(`${$('#m-assunto').value}\n\n${mensagem(selecionados())}`, 'Mensagem copiada.', $('#m-corpo')));
    $('#x-copiar').addEventListener('click', () => {
      const nome = $('#m-nome').value.trim(), cidade = $('#m-cidade').value.trim();
      copiar([$('#x-corpo').value.trim(), [nome, cidade].filter(Boolean).join('\n')].filter(Boolean).join('\n\n'), 'Mensagem copiada. Agora cole no Fala.BR.', $('#x-corpo'));
    });
    $('#copiar-link').addEventListener('click', () => copiar(SITE, 'Link copiado.'));
    $('#s-copiar').addEventListener('click', () => copiar($('#s-texto').value, 'Texto copiado.', $('#s-texto')));
  }

  /* ---------- início ---------- */
  async function carregar(nome) {
    const r = await fetch(`/data/${nome}.json`);
    if (!r.ok) throw new Error(nome);
    return r.json();
  }
  async function iniciar() {
    $('#m-nome').value = ler('naa-nome'); $('#m-cidade').value = ler('naa-cidade');
    montarRedes(); montarExecutivo(); ligar();
    try {
      const [sen, vot, dep] = await Promise.all([carregar('senadores'), carregar('votacoes'), carregar('deputados')]);
      estado.dados.senado = sen.dados; estado.dados.camara = dep.dados;
      const ultima = (t) => vot.dados.filter((x) => x.tipo === t).pop();
      estado.votacao = ultima('texto-base') || ultima('urgencia') || vot.dados[vot.dados.length - 1] || null;
      const v = estado.votacao;
      if (v) {
        const [a, m, d] = v.data.split('-');
        $('#placar-tit').textContent = `${v.tipo === 'urgencia' ? 'Votação da urgência' : 'Votação do texto-base'} · ${d}/${m}/${a}`;
        $('#placar-sim').textContent = v.sim; $('#placar-nao').textContent = v.nao;
      }
      const quando = new Date(sen.atualizado);
      if (!isNaN(quando)) $('#atualizado').textContent = `Dados atualizados em ${quando.toLocaleDateString('pt-BR')}.`;
      trocarCasa('senado');
    } catch {
      $('#lista').innerHTML = '<li class="vazio">Não foi possível carregar a lista. Recarregue a página.</li>';
    }
  }
  iniciar();
})();
