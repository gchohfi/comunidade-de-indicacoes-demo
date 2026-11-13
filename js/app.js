/*
 * Telas da Comunidade de Indicações.
 *
 * Este arquivo só desenha e escuta a tela. Toda regra de pontos está em
 * motor.js e regras.js; os dados passam por armazenamento.js.
 */
(function () {
  'use strict';

  const M = window.Motor;
  const R = window.Regras;
  const A = window.Armazenamento;
  const DIA = 24 * 60 * 60 * 1000;

  const elTopo = document.getElementById('topo');
  const elTela = document.getElementById('tela');
  const elAbas = document.getElementById('abas');
  const elAnuncio = document.getElementById('anuncio');

  let estado = A.carregar();
  let voceId = A.carregarVoce();
  if (!M.porId(estado.membros, voceId)) voceId = estado.membros[0].id;

  // Só deste aparelho: salvos, vistos por último e rascunho da indicação.
  let pessoal = A.carregarPessoal();

  let ui = uiInicial();
  let passos = 0; // navegações feitas dentro da página, para o botão voltar

  function uiInicial() {
    return {
      busca: { texto: '', setor: '', soPremium: false, todos: false },
      comoFoi: null,
      indicar: null,
      curadoria: { recusando: null, motivo: '', erro: '' },
      chamou: null,
      copiado: false,
      reiniciando: false,
      erroTroca: '',
      publicar: { texto: '', erros: [], apagando: null, enviada: false },
      curadoriaPub: { recusando: null, motivo: '', erro: '' },
    };
  }

  // ------------------------------------------------------------------ apoio

  function esc(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function iniciais(nome) {
    const partes = String(nome || '')
      .split(/[\s&]+/)
      .filter((p) => p && !/^(de|da|do|das|dos|e)$/i.test(p));
    const a = partes[0] ? partes[0][0] : '?';
    const b = partes.length > 1 ? partes[partes.length > 2 ? 1 : partes.length - 1][0] : '';
    return (a + b).toUpperCase();
  }

  // "Reposicionar a marca" -> "reposicionar a marca"; "TI para escritórios" fica como está.
  function minusculaInicial(texto) {
    const t = String(texto || '');
    if (t.length < 2 || t[1] === t[1].toUpperCase()) return t;
    return t[0].toLowerCase() + t.slice(1);
  }

  const formatoData = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

  function dataCurta(iso) {
    return formatoData.format(new Date(iso)).replace('.', '');
  }

  const formatoDataLonga = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

  function dataLonga(iso) {
    return formatoDataLonga.format(new Date(iso));
  }

  // "prazo", "prazo e comunicação", "entrega, prazo e comunicação"
  function enumerar(itens) {
    if (itens.length < 2) return itens.join('');
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }

  function quando(iso) {
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / DIA);
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias < 14) return 'há ' + dias + ' dias';
    if (dias < 60) return 'há ' + Math.round(dias / 7) + ' semanas';
    if (dias < 365) return 'há ' + Math.round(dias / 30) + ' meses';
    return 'há mais de um ano';
  }

  function pts(n) {
    return n + (n === 1 ? ' ponto' : ' pontos');
  }

  function membro(id) {
    return M.porId(estado.membros, id);
  }

  function prestador(id) {
    return M.porId(estado.prestadores, id);
  }

  function nomeDe(id) {
    if (id === voceId) return 'você';
    const m = membro(id);
    return m ? m.nome : 'Membro da comunidade';
  }

  function souCuradoria() {
    return M.ehCuradoria(estado, voceId);
  }

  function rosto(id, classe) {
    const m = membro(id);
    return '<span class="rosto' + (id === voceId ? ' rosto--voce' : '') + (classe ? ' ' + classe : '') + '" aria-hidden="true">' + esc(iniciais(m ? m.nome : '?')) + '</span>';
  }

  function novoId(prefixo) {
    return prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function novoCodigo() {
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let codigo;
    do {
      const sorteio = new Uint32Array(6);
      window.crypto.getRandomValues(sorteio);
      const letras = Array.from(sorteio, (n) => alfabeto[n % alfabeto.length]).join('');
      codigo = 'CI-' + letras.slice(0, 4) + '-' + letras.slice(4);
    } while (estado.resgates.some((r) => r.codigo === codigo));
    return codigo;
  }

  function gravar(novoEstado) {
    estado = novoEstado;
    A.salvar(estado);
  }

  // Vale não usado até a validade é cancelado e os pontos voltam.
  function darBaixaNosVales() {
    const r = M.vencerVales(estado, R, new Date().toISOString());
    if (r.vencidos.length) gravar(r.estado);
  }

  function meu() {
    if (!pessoal[voceId] || typeof pessoal[voceId] !== 'object') pessoal[voceId] = {};
    const m = pessoal[voceId];
    if (!Array.isArray(m.salvos)) m.salvos = [];
    if (!Array.isArray(m.vistos)) m.vistos = [];
    return m;
  }

  function gravarPessoal() {
    A.salvarPessoal(pessoal);
  }

  function anunciar(texto) {
    elAnuncio.textContent = '';
    window.setTimeout(() => {
      elAnuncio.textContent = texto;
    }, 60);
  }

  function erroDe(erros, campo) {
    const achado = (erros || []).filter((e) => e.campo === campo)[0];
    return achado ? '<p class="erro" id="erro-' + campo + '">' + esc(achado.mensagem) + '</p>' : '';
  }

  function resumoDeErros(erros) {
    if (!erros || !erros.length) return '';
    return (
      '<div class="aviso aviso--erro" role="alert" id="erros" tabindex="-1"><strong>Confira antes de continuar:</strong><ul>' +
      erros.map((e) => '<li>' + esc(e.mensagem) + '</li>').join('') +
      '</ul></div>'
    );
  }

  const icone = {
    marca:
      '<svg width="26" height="16" viewBox="0 0 26 16" fill="none" aria-hidden="true"><path d="M5 11.5c6.5 0 5-7 16-7" stroke="oklch(0.46 0.085 128)" stroke-width="1.6" stroke-linecap="round"/><circle cx="4" cy="11.5" r="3" fill="currentColor"/><circle cx="22" cy="4.5" r="3" fill="currentColor"/></svg>',
    lupa: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.2 13.2 3.6 3.6"/></svg>',
    voltar:
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 5 7.5 11l6 6"/></svg>',
    seta: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 4 5 5-5 5"/></svg>',
    salvar:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h8a1 1 0 0 1 1 1v11l-5-3.2L4 15V4a1 1 0 0 1 1-1Z"/></svg>',
    salvo:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h8a1 1 0 0 1 1 1v11l-5-3.2L4 15V4a1 1 0 0 1 1-1Z"/></svg>',
    repServico:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="6.5"/><path d="m6.2 9.2 1.9 1.9 3.7-4"/></svg>',
    repIndicacoes:
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="4.5" cy="12.5" r="2.25"/><circle cx="13.5" cy="5.5" r="2.25"/><path d="M6.6 11.4c2.9-.6 2.1-4.4 4.8-5.2"/></svg>',
    abaBuscar:
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.6 14.6 3.9 3.9"/></svg>',
    abaIndicar:
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="5.5" cy="15.5" r="2.75"/><circle cx="16.5" cy="6.5" r="2.75"/><path d="M8 14.2c3.6-.8 2.6-5.6 6-6.6"/></svg>',
    abaPontos:
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h12a1.5 1.5 0 0 1 1.5 1.5V9a2 2 0 0 0 0 4v1.5A1.5 1.5 0 0 1 17 16H5a1.5 1.5 0 0 1-1.5-1.5V13a2 2 0 0 0 0-4Z"/><path d="M13.5 6.5v9" stroke-dasharray="1.6 2.2"/></svg>',
    abaSeguindo:
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7.5" r="3.25"/><path d="M3 18c.6-3.2 3-5 6-5 1.3 0 2.5.3 3.4.9"/><path d="m14 15.8 2 2 3.6-4.1"/></svg>',
  };

  // ------------------------------------------------------------------- rotas

  function rota() {
    const bruto = (window.location.hash || '#/').replace(/^#\/?/, '');
    const pedacos = bruto.split('?');
    const caminho = pedacos[0]
      .split('/')
      .filter(Boolean)
      .map((p) => decodeURIComponent(p));
    const consulta = {};
    (pedacos[1] || '').split('&').forEach((par) => {
      if (!par) return;
      const kv = par.split('=');
      consulta[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { nome: caminho[0] || 'buscar', id: caminho[1] || null, consulta: consulta };
  }

  function htmlTopo(tela) {
    const voce = membro(voceId);
    const esquerda = tela.voltar
      ? '<a class="topo__voltar" href="' + tela.voltar + '" data-acao="voltar" aria-label="Voltar">' + icone.voltar + '</a><span class="topo__titulo">' + esc(tela.titulo) + '</span>'
      : '<a class="marca" href="#/" aria-label="' + esc(R.nomeDaComunidade) + ': início">' + icone.marca + '<span>' + esc(R.nomeDaComunidade) + '</span></a>';
    return esquerda + '<a class="topo__voce" href="#/conta" aria-label="Sua conta: ' + esc(voce.nome) + '">' + rosto(voceId, 'rosto--medio') + '</a>';
  }

  function htmlAbas(ativa) {
    const itens = [
      { id: 'buscar', href: '#/', nome: 'Buscar', icone: icone.abaBuscar },
      { id: 'seguindo', href: '#/seguindo', nome: 'Seguindo', icone: icone.abaSeguindo },
      { id: 'indicar', href: '#/indicar', nome: 'Indicar', icone: icone.abaIndicar },
      { id: 'pontos', href: '#/pontos', nome: 'Pontos', icone: icone.abaPontos },
    ];
    return itens.map((i) => '<a href="' + i.href + '"' + (i.id === ativa ? ' aria-current="page"' : '') + '>' + i.icone + '<span>' + i.nome + '</span></a>').join('');
  }

  function htmlDemo() {
    return '<p class="demo">Demonstração: pessoas, empresas, relatos e pontos são exemplos fictícios, e o que você fizer aqui fica só neste aparelho. Regras de pontos: ' + esc(R.versao.toLowerCase()) + '.</p>';
  }

  function htmlFaixaDemo() {
    return '<p class="faixa-demo"><strong>Demonstração.</strong> Pessoas, empresas e relatos fictícios.</p>';
  }

  const telas = {};

  // ------------------------------------------------------------------ seguir

  // Botão de seguir. Só aparece quando dá para seguir: nunca no próprio
  // perfil, na própria empresa, na curadoria ou em empresa fora da busca.
  function botaoSeguir(tipo, id) {
    const jaSegue = M.segue(estado, voceId, tipo, id);
    if (!jaSegue && M.validarSeguir(estado, { membroId: voceId, tipo: tipo, alvoId: id }).length) return '';
    return (
      '<button type="button" class="botao botao--secundario botao--compacto" id="seguir-' +
      esc(tipo) +
      '-' +
      esc(id) +
      '" data-acao="' +
      (jaSegue ? 'deixarDeSeguir' : 'seguir') +
      '" data-tipo="' +
      esc(tipo) +
      '" data-id="' +
      esc(id) +
      '" aria-pressed="' +
      jaSegue +
      '">' +
      (jaSegue ? 'Seguindo' : 'Seguir') +
      '</button>'
    );
  }

  function nomeDoSeguido(tipo, id) {
    if (tipo !== 'prestador') return nomeDe(id);
    const p = prestador(id);
    return p ? p.nome : 'a empresa';
  }

  // Linha de pessoa ou empresa com o botão de seguir ao lado.
  function linhaSeguivel(tipo, id) {
    let nome;
    let meta;
    let href;
    if (tipo === 'prestador') {
      const p = prestador(id);
      if (!p) return '';
      nome = p.nome;
      meta = p.status === 'ativo' ? p.setor + (p.cidade ? ' · ' + p.cidade : '') : p.status === 'pausado' ? 'Em revisão pela curadoria' : 'Fora da rede';
      href = p.status === 'recusado' ? '' : '#/prestador/' + encodeURIComponent(p.id);
    } else {
      const m = membro(id);
      if (!m) return '';
      nome = m.nome;
      meta = m.empresa;
      href = '#/membro/' + encodeURIComponent(m.id);
    }
    return (
      '<li><p class="seguivel__quem">' +
      (href ? '<a href="' + href + '">' + esc(nome) + '</a>' : '<span>' + esc(nome) + '</span>') +
      '<small>' +
      esc(meta) +
      '</small></p>' +
      botaoSeguir(tipo, id) +
      '</li>'
    );
  }

  // Um item da aba "Seguindo": publicação de empresa ou indicação de pessoa.
  function htmlItemDoFeed(item) {
    const p = prestador(item.prestadorId);
    if (item.tipo === 'publicacao') {
      const pub = M.porId(estado.publicacoes, item.publicacaoId);
      return (
        '<li class="novidade"><p class="novidade__quem"><span class="monograma" aria-hidden="true">' +
        esc(iniciais(p.nome)) +
        '</span><span><a href="#/prestador/' +
        encodeURIComponent(p.id) +
        '">' +
        esc(p.nome) +
        '</a><small>publicou ' +
        quando(item.data) +
        '</small></span></p><p class="novidade__texto">' +
        esc(pub.texto) +
        '</p></li>'
      );
    }
    const i = M.porId(estado.indicacoes, item.indicacaoId);
    const m = membro(item.membroId);
    return (
      '<li class="novidade"><p class="novidade__quem">' +
      rosto(m.id, 'rosto--medio') +
      '<span><a href="#/membro/' +
      encodeURIComponent(m.id) +
      '">' +
      esc(m.nome) +
      '</a><small>indicou ' +
      quando(item.data) +
      '</small></span></p><p class="novidade__alvo"><a class="elo" href="#/prestador/' +
      encodeURIComponent(p.id) +
      '">' +
      esc(p.nome) +
      '</a>' +
      (i.paraQue ? ' · para ' + esc(minusculaInicial(i.paraQue)) : '') +
      '</p><blockquote class="novidade__texto">' +
      esc(i.texto) +
      '</blockquote></li>'
    );
  }

  const rotuloPublicacao = { em_analise: 'Em análise pela curadoria', publicada: 'No ar', recusada: 'Recusada pela curadoria', retirada: 'Retirada pela curadoria' };
  const classePublicacao = { em_analise: 'em_analise', publicada: 'disponivel', recusada: 'recusado', retirada: 'cancelado' };

  // Na página da própria empresa: escrever uma publicação e acompanhar as
  // anteriores, com a situação de cada uma.
  function htmlMinhasPublicacoes(p) {
    const f = ui.publicar;
    const erroTexto = f.erros.filter((e) => e.campo === 'texto')[0];
    const outros = f.erros.filter((e) => e.campo !== 'texto');
    const minhas = estado.publicacoes
      .filter((x) => x.prestadorId === p.id)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .map(
        (x) =>
          '<li class="novidade"><p class="novidade__texto">' +
          esc(x.texto) +
          '</p><p class="novidade__rodape"><span class="situacao situacao--' +
          classePublicacao[x.status] +
          '">' +
          rotuloPublicacao[x.status] +
          '</span><span>' +
          quando(x.data) +
          '</span></p>' +
          (x.motivo ? '<p class="novidade__rodape">Motivo: ' + esc(x.motivo) + '</p>' : '') +
          (f.apagando === x.id
            ? '<div class="acoes--linha"><button type="button" class="botao botao--perigo botao--compacto" id="apagar-sim" data-acao="apagarPublicacao" data-id="' +
              esc(x.id) +
              '">Sim, apagar</button><button type="button" class="botao botao--secundario botao--compacto" data-acao="desistirApagarPublicacao">Cancelar</button></div>'
            : '<div class="acoes--linha"><button type="button" class="botao botao--secundario botao--compacto" id="apagar-' +
              esc(x.id) +
              '" data-acao="pedirApagarPublicacao" data-id="' +
              esc(x.id) +
              '">Apagar</button></div>') +
          '</li>'
      )
      .join('');
    return (
      '<section class="secao" id="publicacoes"><h2>Publicações da sua empresa</h2><p class="apoio">Um texto curto para quem segue a empresa. ' +
      (R.publicacao.curadoriaConfereAntes ? 'A curadoria confere antes de ele aparecer.' : 'Aparece na hora para quem segue.') +
      '</p>' +
      (f.enviada ? '<p class="aviso" role="status">Enviada. Ela aparece para quem segue a empresa depois que a curadoria conferir.</p>' : '') +
      '<form data-form="publicar" data-id="' +
      esc(p.id) +
      '" novalidate>' +
      (outros.length ? '<p class="aviso aviso--erro" role="alert">' + esc(outros[0].mensagem) + '</p>' : '') +
      '<div class="campo"><label for="pub-texto">O que a empresa quer contar</label><textarea id="pub-texto" data-campo="publicar.texto" maxlength="' +
      R.publicacao.maximo +
      '"' +
      (erroTexto ? ' aria-invalid="true" aria-describedby="erro-texto"' : '') +
      '>' +
      esc(f.texto) +
      '</textarea><p class="dica">De ' +
      R.publicacao.minimo +
      ' a ' +
      R.publicacao.maximo +
      ' caracteres. Só texto, por enquanto.</p>' +
      erroDe(f.erros, 'texto') +
      '</div><div class="acoes"><button type="submit" class="botao botao--secundario">' +
      (R.publicacao.curadoriaConfereAntes ? 'Enviar para a curadoria' : 'Publicar') +
      '</button></div></form>' +
      (minhas ? '<ul class="novidades novidades--minhas">' + minhas + '</ul>' : '') +
      '</section>'
    );
  }

  // ------------------------------------------------------------------ buscar

  function fraseIndicacao(ids) {
    if (!ids.length) return '';
    const ordem = ids.slice().sort((a, b) => (b === voceId) - (a === voceId));
    const resto = ordem.length - 1;
    const rostos = '<span class="fio__rostos">' + ordem.slice(0, 2).map((id) => rosto(id)).join('') + '</span>';
    const quem = ordem[0] === voceId ? 'Você' : esc(nomeDe(ordem[0]));
    const texto = resto ? quem + ' e mais ' + resto + ' indicam' : quem + ' indica';
    return '<span class="fio">' + rostos + '<span>' + texto + '</span></span>';
  }

  function experiencias(n) {
    return n + (n === 1 ? ' experiência confirmada' : ' experiências confirmadas');
  }

  // Na lista, a reputação aparece só como palavra. O número fica na página do prestador.
  function fraseReputacao(prestadorId) {
    const rep = M.reputacaoPublica(estado, R, prestadorId);
    const n = rep.experiencias;
    const curta = n + (n === 1 ? ' experiência' : ' experiências');
    if (!n) return 'Ainda sem experiência confirmada';
    if (rep.emAcompanhamento) return 'Em acompanhamento · ' + curta;
    if (!rep.formada) return 'Em formação · ' + curta;
    return '<strong>' + esc(rep.faixa) + '</strong> · ' + curta;
  }

  function fraseFalta(n) {
    return n === 1 ? 'falta 1' : 'faltam ' + n;
  }

  // Reputação do serviço: como o prestador entregou. Componente próprio, que
  // nunca divide bloco com a qualidade das indicações.
  function htmlReputacaoServico(p, evidencia) {
    const rep = souCuradoria() ? M.reputacaoDoServico(estado, R, p.id) : M.reputacaoPublica(estado, R, p.id);
    let corpo;
    if (rep.emAcompanhamento) {
      // A curadoria devolveu o prestador à busca com a nota ainda baixa: sem faixa e sem número.
      corpo = '<p class="reputacao__faixa">Em acompanhamento</p><p class="reputacao__base">A curadoria está acompanhando este prestador de perto. ' + experiencias(rep.experiencias) + ' até agora.</p>';
    } else if (!rep.formada) {
      corpo =
        '<p class="reputacao__faixa">Em formação</p><p class="reputacao__base">' +
        evidencia +
        ' A reputação aparece com ' +
        experiencias(rep.minimo) +
        ': ' +
        fraseFalta(rep.faltam) +
        '.</p>';
    } else {
      corpo =
        '<p class="reputacao__faixa">' +
        esc(rep.faixa) +
        '<span class="reputacao__nota">' +
        rep.nota +
        ' de 100</span></p><p class="reputacao__base">' +
        evidencia +
        '</p><dl class="criterios">' +
        rep.criterios.map((c) => '<div><dt>' + esc(c.nome) + '</dt><dd>' + esc(c.leitura) + '</dd></div>').join('') +
        '</dl>';
    }
    return (
      '<section class="reputacao" aria-labelledby="rep-servico"><h2 class="reputacao__titulo" id="rep-servico">' +
      icone.repServico +
      'Reputação do serviço</h2><p class="reputacao__sobre">Como este prestador entregou, segundo quem contratou.</p>' +
      corpo +
      '</section>'
    );
  }

  // Faixa baixa de quem indica: o que pesou e quem vê. Só para a própria
  // pessoa e para a curadoria.
  function htmlFaixaBaixa(membroId, proprio) {
    const combinado = R.reputacao.respostas.filter((x) => x.id === 'combinado')[0].valor;
    const leituras = M.criteriosDasIndicacoes(estado, R, membroId).slice().sort((a, b) => a.media - b.media);
    let fracos = leituras.filter((c) => c.media < combinado);
    if (!fracos.length) fracos = leituras.slice(0, 1);
    const pesou = enumerar(fracos.map((c) => esc(c.nome.toLowerCase())));
    return proprio
      ? '<p class="reputacao__base">O que mais pesou: ' +
          pesou +
          ', nas contratações que vieram das suas indicações. Você não vê quem respondeu o quê.</p><p class="reputacao__base">Só você e a curadoria veem esta faixa; para os outros membros, nada aparece. A curadoria vai procurar você pelo direct para conversar.</p>'
      : '<p class="reputacao__base">O que mais pesou: ' + pesou + '. Os outros membros não veem esta faixa. Converse com a pessoa pelo direct.</p>';
  }

  // Qualidade das indicações: diz respeito a quem recomenda, não ao prestador.
  function htmlQualidadeIndicacoes(membroId, proprio) {
    // Faixa baixa de uma pessoa não aparece para os outros: só ela e a curadoria veem.
    const q = proprio || souCuradoria() ? M.qualidadeDasIndicacoes(estado, R, membroId) : M.qualidadePublica(estado, R, membroId);
    const n = q.contratacoes;
    const de = proprio ? 'suas indicações' : 'indicações desta pessoa';
    let corpo;
    if (q.semFaixaPublica) {
      // Para os outros membros, "em formação" e "faixa baixa" aparecem iguais,
      // sem contagem: senão a falta de faixa entregaria a faixa baixa.
      corpo =
        '<p class="reputacao__faixa">Sem faixa à mostra</p><p class="reputacao__base">A faixa só aparece a partir de ' +
        R.reputacao.minimoParaAparecer +
        ' contratações confirmadas e quando está boa. <a class="elo" href="#/regras">Como funciona</a></p>';
    } else if (!q.formada) {
      corpo =
        '<p class="reputacao__faixa">Em formação</p><p class="reputacao__base">' +
        (n ? (n === 1 ? '1 contratação confirmada veio' : n + ' contratações confirmadas vieram') + ' das ' + de + ' até agora.' : 'Nenhuma contratação confirmada veio das ' + de + ' ainda.') +
        ' A qualidade aparece com ' +
        q.minimo +
        ': ' +
        fraseFalta(q.faltam) +
        '.</p>';
    } else {
      corpo =
        '<p class="reputacao__faixa">' +
        esc(q.faixa) +
        '<span class="reputacao__nota">' +
        q.nota +
        ' de 100</span></p><p class="reputacao__base">Com base em ' +
        n +
        ' contratações confirmadas que vieram das ' +
        de +
        ', com ' +
        q.prestadores +
        (q.prestadores === 1 ? ' prestador.' : ' prestadores diferentes.') +
        '</p>' +
        (q.nota < R.reputacao.minimoPublico ? htmlFaixaBaixa(membroId, proprio) : '');
    }
    return (
      '<section class="reputacao" aria-labelledby="rep-indicacoes"><h2 class="reputacao__titulo" id="rep-indicacoes">' +
      icone.repIndicacoes +
      'Qualidade das indicações</h2><p class="reputacao__sobre">Como foram as contratações que vieram das ' +
      de +
      '. Indicar muito não aumenta a nota.</p>' +
      corpo +
      '</section>'
    );
  }

  // Ordem de leitura: quem é, para que serve, quem indica, o que aconteceu depois.
  function itemPrestador(achado) {
    const p = achado.prestador;
    const resumo = achado.resumo;
    const premium = p.servicos.some((s) => s.premium);
    const para = resumo.funcionaPara[0];
    return (
      '<li><a class="prestador" href="#/prestador/' +
      encodeURIComponent(p.id) +
      '"><span class="monograma" aria-hidden="true">' +
      esc(iniciais(p.nome)) +
      '</span><span><span class="prestador__nome">' +
      esc(p.nome) +
      (premium ? '<span class="etiqueta">Premium</span>' : '') +
      '</span><span class="prestador__meta">' +
      esc(p.setor) +
      (p.cidade ? ' · ' + esc(p.cidade) : '') +
      '</span>' +
      (para ? '<span class="prestador__para">Para ' + esc(minusculaInicial(para)) + '</span>' : '') +
      fraseIndicacao(resumo.indicadores) +
      '<span class="prestador__prova">' +
      fraseReputacao(p.id) +
      '</span></span><span class="prestador__seta">' +
      icone.seta +
      '</span></a></li>'
    );
  }

  function achadoDe(p) {
    return { prestador: p, resumo: M.resumoPrestador(estado, R, p.id) };
  }

  function buscaAtiva() {
    const b = ui.busca;
    return !!(b.texto.trim() || b.setor || b.soPremium || b.todos);
  }

  function achadosDaBusca() {
    return M.buscar(estado, R, { texto: ui.busca.texto, setor: ui.busca.setor, soPremium: ui.busca.soPremium });
  }

  function textoContagem(n) {
    return n === 1 ? '1 prestador indicado' : n + ' prestadores indicados';
  }

  function htmlFiltros() {
    const chips = [''].concat(R.setores).map(
      (setor, n) =>
        '<button type="button" class="chip" id="setor-' +
        n +
        '" data-acao="setor" data-valor="' +
        esc(setor) +
        '" aria-pressed="' +
        (ui.busca.setor === setor) +
        '">' +
        esc(setor || 'Todos os setores') +
        '</button>'
    );
    return (
      '<div class="chips" role="group" aria-label="Filtrar por setor">' +
      chips.join('') +
      '</div><label class="marcar" for="so-premium"><input type="checkbox" id="so-premium" data-campo="busca.soPremium"' +
      (ui.busca.soPremium ? ' checked' : '') +
      ' /><span>Só quem oferece serviço premium</span></label>'
    );
  }

  function htmlSituacoes() {
    return (
      '<div class="situacoes"><p class="rotulo" id="rotulo-situacoes">Ou comece pela situação</p><ul aria-labelledby="rotulo-situacoes">' +
      R.situacoes
        .map((s, n) => '<li><button type="button" class="atalho" id="situacao-' + n + '" data-acao="situacao" data-valor="' + esc(s) + '"><span>' + esc(s) + '</span>' + icone.seta + '</button></li>')
        .join('') +
      '</ul></div>'
    );
  }

  function htmlResultados() {
    const achados = achadosDaBusca();
    if (!achados.length) {
      return (
        '<div class="vazio"><h2 id="contagem" tabindex="-1">Ninguém indicado para isso ainda</h2><p>Tente com menos palavras ou tire um filtro. Se preferir, peça ajuda à curadoria pelo Instagram da comunidade.</p>' +
        '<div class="acoes"><button type="button" class="botao botao--secundario" data-acao="limpar">Limpar a busca</button><a class="botao botao--secundario" href="#/indicar">Indicar um prestador</a></div></div>'
      );
    }
    return (
      '<p class="contagem"><span id="contagem" tabindex="-1">' +
      textoContagem(achados.length) +
      '</span> · <button type="button" class="elo elo--botao" data-acao="limpar">Limpar a busca</button></p><ul class="lista">' +
      achados.map(itemPrestador).join('') +
      '</ul>'
    );
  }

  // Sem busca: o que chegou há pouco e o que a pessoa já guardou ou abriu.
  function htmlInicio() {
    const ativos = estado.prestadores.filter((p) => p.status === 'ativo');
    if (!ativos.length) {
      return '<div class="vazio"><h2>A comunidade ainda não tem indicações</h2><p>A primeira pode ser sua: indique alguém que você contratou e contrataria de novo.</p><a class="botao" href="#/indicar">Indicar um prestador</a></div>';
    }
    const ultimaIndicacao = (p) => M.indicacoesDoPrestador(estado, p.id).reduce((maior, i) => Math.max(maior, new Date(i.data).getTime()), 0);
    const recentes = ativos
      .slice()
      .sort((a, b) => ultimaIndicacao(b) - ultimaIndicacao(a))
      .slice(0, 3);
    const ja = recentes.map((p) => p.id);
    const salvos = meu()
      .salvos.map(prestador)
      .filter((p) => p && p.status === 'ativo');
    salvos.forEach((p) => ja.push(p.id));
    const vistos = meu()
      .vistos.map(prestador)
      .filter((p) => p && p.status === 'ativo' && ja.indexOf(p.id) === -1)
      .slice(0, 3);

    const bloco = (titulo, lista) => (lista.length ? '<section class="secao"><h2>' + titulo + '</h2><ul class="lista">' + lista.map((p) => itemPrestador(achadoDe(p))).join('') + '</ul></section>' : '');

    return (
      bloco('Indicados há pouco', recentes) +
      bloco('Salvos por você', salvos) +
      bloco('Vistos por último', vistos) +
      '<div class="acoes"><button type="button" class="botao botao--secundario" id="ver-todos" data-acao="verTodos">Ver os ' +
      ativos.length +
      ' prestadores</button></div>'
    );
  }

  function htmlAbaixoDaBusca() {
    return buscaAtiva() ? htmlFiltros() + htmlResultados() : htmlSituacoes() + htmlFiltros() + htmlInicio();
  }

  let esperaAnuncio = null;

  function atualizarAbaixoDaBusca() {
    const alvo = document.getElementById('abaixo');
    if (alvo) alvo.innerHTML = htmlAbaixoDaBusca();
    window.clearTimeout(esperaAnuncio);
    if (!buscaAtiva()) return;
    esperaAnuncio = window.setTimeout(() => {
      const n = achadosDaBusca().length;
      anunciar(n ? textoContagem(n) : 'Ninguém indicado para isso ainda');
    }, 600);
  }

  telas.buscar = function () {
    return {
      titulo: 'Buscar',
      aba: 'buscar',
      html:
        '<h1 class="so-leitor">Buscar prestadores indicados</h1>' +
        '<form role="search" data-form="busca"><label class="titulo" for="q">Que tipo de serviço a sua empresa precisa?</label>' +
        '<div class="busca__campo">' +
        icone.lupa +
        '<input id="q" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" placeholder="Contador, contrato, site…" value="' +
        esc(ui.busca.texto) +
        '" data-campo="busca.texto" /></div></form>' +
        '<div id="abaixo">' +
        htmlAbaixoDaBusca() +
        '</div>',
    };
  };

  // --------------------------------------------------------------- prestador

  // Camadas, de cima para baixo: quem é, para que serve, o que fazer, quem
  // indica, o que aconteceu depois, serviços, relatos e, por último, o método.
  telas.prestador = function (r) {
    const p = prestador(r.id);
    if (!p || p.status === 'recusado') return telas.perdida();
    const resumo = M.resumoPrestador(estado, R, p.id);
    const indicacoes = M.indicacoesDoPrestador(estado, p.id);
    const ehDono = p.donoId === voceId;
    const jaIndicou = indicacoes.some((i) => i.membroId === voceId);
    const emAnalise = p.status === 'em_analise';
    const pausado = p.status === 'pausado';
    const salvo = meu().salvos.indexOf(p.id) !== -1;

    if ((r.navegou || r.inicial) && !emAnalise && !pausado) {
      const eu = meu();
      eu.vistos = [p.id].concat(eu.vistos.filter((id) => id !== p.id)).slice(0, 6);
      gravarPessoal();
    }

    const funciona = resumo.funcionaPara.length
      ? '<section class="secao secao--junta"><h2>Funciona bem para</h2><ul class="marcas">' + resumo.funcionaPara.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></section>'
      : '';

    let acoes = '';
    if (pausado) {
      acoes =
        '<p class="aviso"><strong>Em revisão pela curadoria.</strong> ' +
        (ehDono
          ? 'Sua empresa está fora da busca enquanto a curadoria revisa as experiências mais recentes. A curadoria vai falar com você pelo direct antes de decidir.'
          : 'Este prestador está fora da busca enquanto a curadoria revisa as experiências mais recentes.' +
            (souCuradoria() ? ' Os membros veem só este aviso, sem relatos. <a class="elo" href="#/curadoria">Decidir na área de curadoria</a>' : ' Os relatos voltam a aparecer se ele voltar à busca.')) +
        '</p>';
    } else if (emAnalise) {
      acoes = '<p class="aviso">A curadoria está convidando este prestador. Ele aparece na busca depois de aceitar o convite.</p>';
    } else if (ehDono) {
      acoes = '<p class="aviso">Esta é a sua empresa. Você recebe pontos quando um cliente novo, vindo da comunidade, confirma que o serviço foi concluído.</p>';
    } else {
      acoes =
        '<div class="acoes acoes--par"><button type="button" class="botao" id="chamar" data-acao="chamar" data-id="' +
        esc(p.id) +
        '">Chamar no Instagram</button><button type="button" class="botao botao--secundario botao--icone" id="salvar" data-acao="salvar" data-id="' +
        esc(p.id) +
        '" aria-pressed="' +
        salvo +
        '" aria-label="Salvar para ver depois" title="' +
        (salvo ? 'Salvo' : 'Salvar') +
        '">' +
        (salvo ? icone.salvo : icone.salvar) +
        '</button></div>' +
        (ui.chamou === p.id
          ? '<p class="aviso" role="status">Este prestador é um exemplo fictício. No app de verdade, o botão abre o perfil @' + esc(p.arroba) + ' no Instagram para você mandar mensagem.</p>'
          : '');
    }

    const quemIndica = indicacoes
      .map((i) => {
        const m = membro(i.membroId);
        return (
          '<li>' +
          rosto(i.membroId, 'rosto--medio') +
          '<p class="fio-lista__quem"><a href="#/membro/' +
          encodeURIComponent(i.membroId) +
          '">' +
          esc(i.membroId === voceId ? 'Você' : m.nome) +
          '</a><span>' +
          esc(m.empresa) +
          ' · ' +
          quando(i.data) +
          '</span></p>' +
          (function () {
            const q = M.qualidadePublica(estado, R, i.membroId);
            return q.formada ? '<p class="fio-lista__qualidade">' + icone.repIndicacoes + 'Indicações ' + esc(q.faixa.toLowerCase()) + '</p>' : '';
          })() +
          (i.paraQue ? '<p class="fio-lista__para">Para: ' + esc(minusculaInicial(i.paraQue)) + '</p>' : '') +
          '<blockquote>' +
          esc(i.texto) +
          '</blockquote></li>'
        );
      })
      .join('');

    const c = resumo.contratacoes;
    const k = resumo.contratariam;
    let depois;
    if (!c) depois = 'Ainda sem contratação confirmada. Falta alguém que contratou contar como foi.';
    else if (k === c) depois = (c === 1 ? '1 contratação confirmada' : c + ' contratações confirmadas') + ' pela curadoria. ' + (c === 1 ? 'Quem contratou contrataria de novo.' : 'Todos contratariam de novo.');
    else depois = c + ' contratações confirmadas pela curadoria. ' + k + ' de ' + c + (k === 1 ? ' contrataria' : ' contratariam') + ' de novo.';

    const servicos = p.servicos.map((s) => '<li><span>' + esc(s.nome) + '</span>' + (s.premium ? '<span class="etiqueta">Premium</span>' : '') + '</li>').join('');

    const relatos = resumo.relatos
      .map((conf) => {
        const cliente = membro(conf.clienteId);
        const servico = M.porId(p.servicos, conf.servicoId);
        const quem = conf.mostrarNome === false || !cliente ? 'Membro da comunidade' : (conf.clienteId === voceId ? 'Você' : cliente.nome) + ', ' + cliente.empresa;
        return (
          '<li class="relato"><blockquote>' +
          esc(conf.comentario) +
          '</blockquote><p class="relato__quem">' +
          esc(quem) +
          ' · ' +
          esc(servico ? servico.nome : '') +
          ' · ' +
          quando(conf.data) +
          ' · ' +
          (conf.contratariaDeNovo ? 'Contrataria de novo' : 'Não contrataria de novo') +
          '</p></li>'
        );
      })
      .join('');

    const experiencias =
      (relatos ? '<ul>' + relatos + '</ul>' : '<p class="apoio">' + (c ? 'Quem contratou confirmou o serviço, mas não deixou relato escrito.' : 'Nenhum relato por enquanto.') + '</p>') +
      (!ehDono && !emAnalise ? '<div class="acoes"><a class="botao botao--secundario" href="#/como-foi/' + encodeURIComponent(p.id) + '">Contratei: contar como foi</a></div>' : '');

    const seguirEmpresa = !emAnalise && !pausado ? botaoSeguir('prestador', p.id) : '';
    // A voz da própria empresa vem depois do que os outros contaram sobre ela.
    const publicadas = M.publicacoesVisiveis(estado, p.id);
    let publicacoes = '';
    if (ehDono && !emAnalise) {
      publicacoes = htmlMinhasPublicacoes(p);
    } else if (publicadas.length) {
      publicacoes =
        '<section class="secao"><h2>Publicações da empresa</h2><ul class="novidades">' +
        publicadas
          .slice(0, 5)
          .map((x) => '<li class="novidade"><p class="novidade__texto">' + esc(x.texto) + '</p><p class="novidade__rodape">' + quando(x.publicadaEm || x.data) + '</p></li>')
          .join('') +
        '</ul></section>';
    }

    const cabecalho =
      '<div class="perfil"><span class="monograma monograma--grande" aria-hidden="true">' +
      esc(iniciais(p.nome)) +
      '</span><div><h1 class="titulo">' +
      esc(p.nome) +
      '</h1><p class="perfil__meta">' +
      esc(p.setor) +
      (p.cidade ? ' · ' + esc(p.cidade) : '') +
      (p.arroba ? ' · @' + esc(p.arroba) : '') +
      '</p>' +
      (seguirEmpresa ? '<p class="perfil__seguir">' + seguirEmpresa + '</p>' : '') +
      '</div>' +
      (p.resumo ? '<p class="perfil__resumo">' + esc(p.resumo) + '</p>' : '') +
      '</div>';

    // Durante a pausa, quem não é da curadoria vê só o aviso de revisão: sem
    // relatos, sem faixa e sem nota. Quem contratou ainda pode contar como foi.
    if (pausado && !souCuradoria()) {
      return {
        titulo: p.nome,
        aba: 'buscar',
        voltar: '#/',
        html: cabecalho + acoes + (ehDono ? '' : '<div class="acoes"><a class="botao botao--secundario" href="#/como-foi/' + encodeURIComponent(p.id) + '">Contratei: contar como foi</a></div>'),
      };
    }

    return {
      titulo: p.nome,
      aba: 'buscar',
      voltar: '#/',
      html:
        cabecalho +
        funciona +
        acoes +
        '<section class="secao"><h2>Quem indica</h2><ol class="fio-lista">' +
        quemIndica +
        '</ol>' +
        (!ehDono && !jaIndicou && !emAnalise && !pausado ? '<a class="elo elo--bloco" href="#/indicar?prestador=' + encodeURIComponent(p.id) + '">Também contratei e indico</a>' : '') +
        '</section>' +
        htmlReputacaoServico(p, depois) +
        '<section class="secao"><h2>Serviços</h2><ul class="linhas">' +
        servicos +
        '</ul></section>' +
        '<section class="secao"><h2>Experiências confirmadas</h2>' +
        experiencias +
        '</section>' +
        publicacoes +
        '<details class="metodo"><summary>Como isto é conferido</summary><div class="prosa"><p>Contratação confirmada é a que foi relatada por quem contratou e conferida pela curadoria, em até ' +
        R.prazoDaCuradoriaEmDias +
        ' dias.</p><p>A reputação do serviço vem das respostas de quem contratou sobre entrega, prazo, comunicação e cuidado. Ela só aparece a partir de ' +
        R.reputacao.minimoParaAparecer +
        ' experiências confirmadas.</p><p>A qualidade das indicações é outra medida: fala de quem recomenda, não do prestador.</p><p>Nota não rende ponto, ponto não compra nota, e nenhum dos dois muda a ordem da busca. <a class="elo" href="#/regras">Ver todas as regras</a></p></div></details>',
    };
  };

  // ----------------------------------------------------------------- como foi

  function candidatoComoFoi(f, id) {
    const porPessoa = f.origem.indexOf('pessoa:') === 0;
    return {
      id: id,
      prestadorId: f.prestadorId,
      servicoId: f.servicoId,
      clienteId: voceId,
      origem: f.origem ? (porPessoa ? 'pessoa' : 'busca') : '',
      indicadorId: porPessoa ? f.origem.slice(7) : null,
      concluido: f.concluido === 'sim',
      contratariaDeNovo: f.contrataria === 'sim' ? true : f.contrataria === 'nao' ? false : undefined,
      criterios: R.reputacao.criterios.reduce((guardado, c) => {
        guardado[c.id] = f['c_' + c.id] || '';
        return guardado;
      }, {}),
      comentario: f.comentario,
      mostrarNome: f.mostrarNome,
      data: new Date().toISOString(),
      status: 'em_analise',
    };
  }

  function rotuloDaResposta(id) {
    const achada = R.reputacao.respostas.filter((x) => x.id === id)[0];
    return achada ? achada.rotulo : '';
  }

  function frasePontosDoRelato(conf, p, base) {
    const pt = M.pontosDaConfirmacao(base, R, conf);
    if (pt.motivoSemPontos === 'recontratacao') {
      return 'Você já contratou este prestador antes. Este relato entra no histórico, mas não gera pontos: cada cliente novo conta uma vez.';
    }
    const partes = [];
    if (pt.pontosIndicador) partes.push(esc(membro(pt.indicadorId).nome) + ' recebe ' + pts(pt.pontosIndicador) + ' pela indicação');
    if (pt.pontosPrestador) partes.push(esc(p.nome) + ' recebe ' + pts(pt.pontosPrestador));
    if (!partes.length) return 'Este relato entra no histórico do prestador.';
    return 'Depois da conferência da curadoria, ' + partes.join(' e ') + '.';
  }

  function radio(grupo, campo, valor, atual, rotulo, apoio) {
    const id = grupo + '-' + valor.replace(/[^a-z0-9]/gi, '-');
    return (
      '<label class="opcao" for="' +
      id +
      '"><input type="radio" id="' +
      id +
      '" name="' +
      grupo +
      '" value="' +
      esc(valor) +
      '" data-campo="' +
      campo +
      '"' +
      (atual === valor ? ' checked' : '') +
      ' /><span>' +
      rotulo +
      (apoio ? '<small>' + apoio + '</small>' : '') +
      '</span></label>'
    );
  }

  function linhaDeResumo(rotulo, valor) {
    return '<div><dt>' + rotulo + '</dt><dd>' + valor + '</dd></div>';
  }

  telas['como-foi'] = function (r) {
    const p = prestador(r.id);
    if (!p || (p.status !== 'ativo' && p.status !== 'pausado')) return telas.perdida();
    if (!ui.comoFoi || ui.comoFoi.prestadorId !== p.id || (r.navegou && ui.comoFoi.enviado)) {
      ui.comoFoi = {
        prestadorId: p.id,
        servicoId: p.servicos.length === 1 ? p.servicos[0].id : '',
        concluido: '',
        origem: '',
        contrataria: '',
        comentario: '',
        mostrarNome: true,
        erros: [],
        revisando: false,
        enviado: null,
      };
      R.reputacao.criterios.forEach((c) => (ui.comoFoi['c_' + c.id] = ''));
    }
    const f = ui.comoFoi;
    const voltar = '#/prestador/' + encodeURIComponent(p.id);

    if (p.donoId === voceId) {
      return {
        titulo: 'Contar como foi',
        aba: 'buscar',
        voltar: voltar,
        html: '<h1 class="titulo">Esta é a sua empresa</h1><p class="apoio">Quem conta como foi é quem contratou. Você não pode relatar um serviço da própria empresa.</p><div class="acoes"><a class="botao botao--secundario" href="' + voltar + '">Voltar</a></div>',
      };
    }

    if (f.enviado) {
      const conf = M.porId(estado.confirmacoes, f.enviado);
      return {
        titulo: 'Relato enviado',
        aba: 'buscar',
        voltar: voltar,
        html:
          '<h1 class="titulo">Relato enviado</h1><p class="apoio">A curadoria confere em até ' +
          R.prazoDaCuradoriaEmDias +
          ' dias. ' +
          (conf ? frasePontosDoRelato(conf, p, estado) : '') +
          '</p><div class="acoes"><a class="botao" href="' +
          voltar +
          '">Voltar para ' +
          esc(p.nome) +
          '</a><a class="botao botao--secundario" href="#/">Buscar outro prestador</a></div>',
      };
    }

    // Segunda parte: conferir o que vai ser enviado e quem vai ver.
    if (f.revisando) {
      const cand = candidatoComoFoi(f, 'previa');
      const hipotese = Object.assign({}, estado, { confirmacoes: estado.confirmacoes.concat([cand]) });
      const servico = M.porId(p.servicos, f.servicoId);
      return {
        titulo: 'Contar como foi',
        aba: 'buscar',
        voltar: voltar,
        html:
          '<p class="etapa">Parte 2 de 2</p><h1 class="titulo">Confira antes de enviar</h1>' +
          '<dl class="resumo">' +
          linhaDeResumo('Prestador', esc(p.nome)) +
          linhaDeResumo('Serviço', esc(servico ? servico.nome : '')) +
          linhaDeResumo('Como chegou', cand.origem === 'busca' ? 'Pela busca' : 'Indicação de ' + esc(membro(cand.indicadorId).nome)) +
          R.reputacao.criterios.map((c) => linhaDeResumo(esc(c.nome), esc(rotuloDaResposta(f['c_' + c.id])))).join('') +
          linhaDeResumo('Contrataria de novo', f.contrataria === 'sim' ? 'Sim' : 'Não') +
          linhaDeResumo('Seu relato', f.comentario.trim() ? esc(f.comentario.trim()) : 'Sem texto') +
          '</dl>' +
          '<section class="secao secao--junta"><h2>Quem vê o quê</h2><ul class="marcas"><li>Os membros veem o relato e a resposta sobre contratar de novo, na página do prestador.</li><li>As respostas sobre entrega, prazo, comunicação e cuidado entram na reputação do serviço, somadas às de outros clientes. Separadas, só a curadoria vê.</li><li>' +
          (f.mostrarNome ? 'Seu nome e sua empresa aparecem junto do relato.' : 'Seu nome não aparece. Só a curadoria sabe quem relatou.') +
          '</li><li>O prestador vê o mesmo que os outros membros. Seu contato não aparece.</li><li>A curadoria confere em até ' +
          R.prazoDaCuradoriaEmDias +
          ' dias. Se recusar, quem indicou e o prestador veem o motivo.</li></ul></section>' +
          '<p class="aviso"><strong>Pontos:</strong> ' +
          frasePontosDoRelato(cand, p, hipotese) +
          ' Você não ganha pontos por relatar.</p>' +
          '<form class="acoes" data-form="comoFoiEnviar">' +
          resumoDeErros(f.erros) +
          '<button type="submit" class="botao">Enviar relato</button><button type="button" class="botao botao--secundario" data-acao="corrigirRelato">Voltar e corrigir</button></form>',
      };
    }

    const indicadores = M.resumoPrestador(estado, R, p.id).indicadores.filter((id) => id !== voceId && id !== p.donoId);
    const origens = indicadores
      .map((id) => radio('cf-origem', 'comoFoi.origem', 'pessoa:' + id, f.origem, 'Indicação de ' + esc(membro(id).nome), esc(membro(id).empresa)))
      .concat([radio('cf-origem', 'comoFoi.origem', 'busca', f.origem, 'Pela busca da comunidade', 'Sem uma indicação em especial')]);

    const invalido = (campo) => (f.erros.some((e) => e.campo === campo) ? ' data-invalido="true" aria-describedby="erro-' + campo + '"' : '');

    return {
      titulo: 'Contar como foi',
      aba: 'buscar',
      voltar: voltar,
      html:
        '<p class="etapa">Parte 1 de 2</p><h1 class="titulo">Como foi com ' +
        esc(p.nome) +
        '?</h1><p class="apoio">Leva um minuto. Antes de enviar, você confere o que escreveu e quem vai ver.</p>' +
        '<form class="formulario" data-form="comoFoi" novalidate>' +
        resumoDeErros(f.erros) +
        '<fieldset class="grupo"' +
        invalido('servico') +
        '><legend>Qual serviço você contratou?</legend><div class="opcoes">' +
        p.servicos.map((s) => radio('cf-servico', 'comoFoi.servicoId', s.id, f.servicoId, esc(s.nome), s.premium ? 'Serviço premium' : '')).join('') +
        '</div>' +
        erroDe(f.erros, 'servico') +
        '</fieldset>' +
        '<fieldset class="grupo"' +
        invalido('concluido') +
        '><legend>O serviço já foi concluído?</legend><div class="opcoes opcoes--par">' +
        radio('cf-concluido', 'comoFoi.concluido', 'sim', f.concluido, 'Sim') +
        radio('cf-concluido', 'comoFoi.concluido', 'nao', f.concluido, 'Ainda não') +
        '</div>' +
        (f.concluido === 'nao' ? '<p class="aviso" role="status">Então ainda não é hora. Volte quando o serviço terminar: só serviço concluído entra na conta.</p>' : '') +
        erroDe(f.erros, 'concluido') +
        '</fieldset>' +
        '<fieldset class="grupo"' +
        invalido('origem') +
        '><legend>Como você chegou a este prestador?</legend><div class="opcoes">' +
        origens.join('') +
        '</div>' +
        erroDe(f.erros, 'origem') +
        '</fieldset>' +
        '<fieldset class="grupo"' +
        invalido('criterios') +
        '><legend>Como foi cada parte, em relação ao combinado?</legend><div class="partes">' +
        R.reputacao.criterios
          .map(
            (c) =>
              '<div class="parte" role="radiogroup" aria-labelledby="parte-' +
              c.id +
              '"><p class="parte__nome" id="parte-' +
              c.id +
              '">' +
              esc(c.nome) +
              '<span>' +
              esc(c.dica) +
              '</span></p><div class="parte__opcoes">' +
              R.reputacao.respostas
                .map(
                  (resp) =>
                    '<label class="pilula" for="cf-' +
                    c.id +
                    '-' +
                    resp.id +
                    '"><input type="radio" id="cf-' +
                    c.id +
                    '-' +
                    resp.id +
                    '" name="cf-' +
                    c.id +
                    '" value="' +
                    resp.id +
                    '" data-campo="comoFoi.c_' +
                    c.id +
                    '"' +
                    (f['c_' + c.id] === resp.id ? ' checked' : '') +
                    ' /><span>' +
                    esc(resp.rotulo) +
                    '</span></label>'
                )
                .join('') +
              '</div></div>'
          )
          .join('') +
        '</div><p class="dica">Entram na reputação do serviço. Não mudam os pontos de ninguém.</p>' +
        erroDe(f.erros, 'criterios') +
        '</fieldset>' +
        '<fieldset class="grupo"' +
        invalido('contratariaDeNovo') +
        '><legend>Você contrataria de novo?</legend><div class="opcoes opcoes--par">' +
        radio('cf-contrataria', 'comoFoi.contrataria', 'sim', f.contrataria, 'Sim') +
        radio('cf-contrataria', 'comoFoi.contrataria', 'nao', f.contrataria, 'Não') +
        '</div><p class="dica">Sua resposta não muda os pontos de ninguém.</p>' +
        erroDe(f.erros, 'contratariaDeNovo') +
        '</fieldset>' +
        '<div class="campo"><label for="cf-comentario">Quer contar algo? (opcional)</label><textarea id="cf-comentario" data-campo="comoFoi.comentario" maxlength="400" placeholder="O que funcionou, o que poderia ser melhor.">' +
        esc(f.comentario) +
        '</textarea></div><label class="marcar" for="cf-nome"><input type="checkbox" id="cf-nome" data-campo="comoFoi.mostrarNome"' +
        (f.mostrarNome ? ' checked' : '') +
        ' /><span>Mostrar meu nome junto do relato</span></label>' +
        '<button type="submit" class="botao">Continuar</button></form>',
    };
  };

  // ------------------------------------------------------------------ indicar

  // Três etapas curtas: quem, para quê, por quê. O rascunho fica neste aparelho.
  const CAMPOS_DA_ETAPA = { 1: ['prestador', 'nome', 'arroba', 'setor', 'servico'], 2: ['paraQue'], 3: ['texto', 'jaContratei'] };
  const CAMPOS_DO_RASCUNHO = ['etapa', 'prestadorId', 'nome', 'arroba', 'setor', 'cidade', 'servico', 'paraQue', 'texto', 'jaContratei'];

  function indicarInicial(prestadorId) {
    const f = { etapa: 1, prestadorId: '', nome: '', arroba: '', setor: '', cidade: '', servico: '', paraQue: '', texto: '', jaContratei: false, erros: [], enviado: null };
    const rascunho = meu().rascunho;
    if (rascunho && typeof rascunho === 'object') CAMPOS_DO_RASCUNHO.forEach((c) => (f[c] = rascunho[c] === undefined ? f[c] : rascunho[c]));
    if (f.prestadorId && f.prestadorId !== 'novo' && !prestador(f.prestadorId)) f.prestadorId = '';
    if (prestadorId) {
      f.prestadorId = prestadorId;
      f.etapa = 1;
    }
    if ([1, 2, 3].indexOf(f.etapa) === -1) f.etapa = 1;
    return f;
  }

  function temRascunho(f) {
    return !!(f.prestadorId || f.nome || f.arroba || f.servico || f.paraQue || f.texto);
  }

  function salvarRascunho() {
    const f = ui.indicar;
    if (!f || f.enviado) return;
    const rascunho = {};
    CAMPOS_DO_RASCUNHO.forEach((c) => (rascunho[c] = f[c]));
    meu().rascunho = temRascunho(f) ? rascunho : null;
    gravarPessoal();
  }

  function montarIndicacao(f) {
    const novo = f.prestadorId === 'novo';
    return {
      membroId: voceId,
      prestadorId: novo ? null : f.prestadorId || '__nenhum__',
      novoPrestador: novo ? { nome: f.nome, arroba: f.arroba, setor: f.setor, cidade: f.cidade, servico: f.servico } : null,
      paraQue: f.paraQue,
      texto: f.texto,
      jaContratei: f.jaContratei,
      data: new Date().toISOString(),
      ids: { indicacao: novoId('i'), prestador: novoId('p'), servico: novoId('s') },
    };
  }

  function nomeDoIndicado(f) {
    if (f.prestadorId === 'novo') return f.nome.trim() || 'o prestador';
    const p = prestador(f.prestadorId);
    return p ? p.nome : 'o prestador';
  }

  telas.indicar = function (r) {
    if (!ui.indicar || (r.navegou && ui.indicar.enviado)) ui.indicar = indicarInicial('');
    if (r.navegou && r.consulta.prestador && prestador(r.consulta.prestador)) ui.indicar = indicarInicial(r.consulta.prestador);
    const f = ui.indicar;

    const minhas = estado.indicacoes
      .filter((i) => i.membroId === voceId)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .map((i) => {
        const p = prestador(i.prestadorId);
        const vindas = estado.confirmacoes.filter((c) => c.prestadorId === p.id && c.status === 'aprovada' && M.indicadorCreditado(estado, c) === voceId).length;
        const situacao =
          p.status === 'em_analise'
            ? 'A curadoria está convidando o prestador'
            : p.status === 'recusado'
              ? 'Não entrou na comunidade'
              : vindas
                ? vindas + (vindas === 1 ? ' contratação' : ' contratações') + ' por sua indicação'
                : 'Ninguém contratou por sua indicação ainda';
        const corpo = '<span>' + esc(p.nome) + '<small>' + situacao + ' · indicado ' + quando(i.data) + '</small></span>';
        return p.status === 'recusado' ? '<li><a>' + corpo + '</a></li>' : '<li><a href="#/prestador/' + encodeURIComponent(p.id) + '">' + corpo + icone.seta + '</a></li>';
      })
      .join('');

    const secaoMinhas =
      '<section class="secao"><h2>Suas indicações</h2>' +
      (minhas ? '<ul class="menu">' + minhas + '</ul>' : '<p class="apoio">Você ainda não indicou ninguém. Comece por alguém que você contratou e contrataria de novo.</p>') +
      '</section>';

    if (f.enviado) {
      const p = prestador(f.enviado);
      return {
        titulo: 'Indicar',
        aba: 'indicar',
        html:
          '<h1 class="titulo">Indicação enviada</h1><p class="apoio">' +
          (p && p.status === 'em_analise'
            ? esc(p.nome) + ' é novo por aqui: a curadoria vai falar com o prestador e pedir o aceite. Ele aparece na busca depois de aceitar o convite.'
            : 'Sua indicação já aparece na página de ' + esc(p ? p.nome : 'prestador') + '.') +
          ' Os pontos entram quando alguém contratar por sua indicação e confirmar que o serviço foi concluído.</p><div class="acoes"><button type="button" class="botao botao--secundario" data-acao="novaIndicacao">Indicar outro prestador</button></div>' +
          secaoMinhas,
      };
    }

    const inv = (campo) => (f.erros.some((e) => e.campo === campo) ? ' aria-invalid="true" aria-describedby="erro-' + campo + '"' : '');
    const texto = (id, campo, rotulo, valor, extra) =>
      '<div class="campo"><label for="' + id + '">' + rotulo + '</label><input id="' + id + '" type="text" data-campo="indicar.' + campo + '" value="' + esc(valor) + '"' + (extra || '') + inv(campo) + ' />' + erroDe(f.erros, campo) + '</div>';
    const rascunho = temRascunho(f)
      ? '<p class="pequeno rascunho">Rascunho salvo neste aparelho. <button type="button" class="elo elo--botao" data-acao="apagarRascunho">Apagar</button></p>'
      : '';
    const cabeca = (titulo, apoio) => '<p class="etapa">Etapa ' + f.etapa + ' de 3</p><h1 class="titulo">' + titulo + '</h1>' + (apoio ? '<p class="apoio">' + apoio + '</p>' : '');
    const voltarEtapa = '<button type="button" class="botao botao--secundario" data-acao="etapaAnterior">Voltar</button>';

    let corpo;
    if (f.etapa === 1) {
      const disponiveis = estado.prestadores
        .filter((p) => p.status !== 'recusado' && p.status !== 'pausado' && p.donoId !== voceId && !estado.indicacoes.some((i) => i.prestadorId === p.id && i.membroId === voceId))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const novo = f.prestadorId === 'novo';
      corpo =
        cabeca('Quem você indica?', 'Indique quem você contratou e contrataria de novo. Indicar, por si só, não rende pontos: eles entram quando alguém contrata por sua indicação e confirma que o serviço foi concluído.') +
        '<form class="formulario" data-form="indicarEtapa" novalidate>' +
        resumoDeErros(f.erros) +
        '<div class="campo"><label for="ind-prestador">Prestador</label><select id="ind-prestador" data-campo="indicar.prestadorId"' +
        inv('prestador') +
        '><option value="">Escolha na lista</option>' +
        disponiveis.map((p) => '<option value="' + esc(p.id) + '"' + (f.prestadorId === p.id ? ' selected' : '') + '>' + esc(p.nome) + ' · ' + esc(p.setor) + '</option>').join('') +
        '<option value="novo"' +
        (novo ? ' selected' : '') +
        '>Não está na lista</option></select>' +
        erroDe(f.erros, 'prestador') +
        '</div>' +
        (novo
          ? texto('ind-nome', 'nome', 'Nome da empresa ou do profissional', f.nome, ' autocomplete="off"') +
            texto('ind-arroba', 'arroba', '@ no Instagram (opcional)', f.arroba, ' autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@perfil"') +
            '<div class="campo"><label for="ind-setor">Setor</label><select id="ind-setor" data-campo="indicar.setor"' +
            inv('setor') +
            '><option value="">Escolha o setor</option>' +
            R.setores.map((s) => '<option' + (f.setor === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') +
            '</select>' +
            erroDe(f.erros, 'setor') +
            '</div>' +
            texto('ind-servico', 'servico', 'Serviço que você contratou', f.servico, ' autocomplete="off"') +
            texto('ind-cidade', 'cidade', 'Cidade (opcional)', f.cidade, ' autocomplete="off"')
          : '') +
        '<button type="submit" class="botao">Continuar</button></form>' +
        rascunho +
        secaoMinhas;
    } else if (f.etapa === 2) {
      corpo =
        cabeca('Para que tipo de necessidade?', 'Você está indicando ' + esc(nomeDoIndicado(f)) + '. Diga em poucas palavras para que situação serve.') +
        '<form class="formulario" data-form="indicarEtapa" novalidate>' +
        resumoDeErros(f.erros) +
        '<div class="campo"><label for="ind-para">Serve bem para</label><input id="ind-para" type="text" data-campo="indicar.paraQue" maxlength="80" autocomplete="off" placeholder="Ex.: revisar contrato com fornecedor" value="' +
        esc(f.paraQue) +
        '"' +
        inv('paraQue') +
        ' /><p class="dica">É o que ajuda outro membro a saber se serve para o caso dele.</p>' +
        erroDe(f.erros, 'paraQue') +
        '</div><div class="acoes"><button type="submit" class="botao">Continuar</button>' +
        voltarEtapa +
        '</div></form>' +
        rascunho;
    } else {
      corpo =
        cabeca('Por que você indica?', '') +
        '<form class="formulario" data-form="indicar" novalidate>' +
        resumoDeErros(f.erros) +
        '<div class="campo"><label for="ind-texto">O que você contratou e o que funcionou</label><textarea id="ind-texto" data-campo="indicar.texto" maxlength="400"' +
        inv('texto') +
        '>' +
        esc(f.texto) +
        '</textarea><p class="dica">Uma ou duas frases.</p>' +
        erroDe(f.erros, 'texto') +
        '</div>' +
        '<div><label class="marcar" for="ind-contratei"><input type="checkbox" id="ind-contratei" data-campo="indicar.jaContratei"' +
        (f.jaContratei ? ' checked' : '') +
        inv('jaContratei') +
        ' /><span>Eu já contratei este prestador.</span></label>' +
        erroDe(f.erros, 'jaContratei') +
        '</div>' +
        '<section class="secao secao--junta"><h2>Antes de enviar</h2><dl class="resumo">' +
        linhaDeResumo('Você indica', esc(nomeDoIndicado(f))) +
        linhaDeResumo('Serve bem para', esc(f.paraQue.trim())) +
        '</dl><ul class="marcas"><li>Os membros veem seu nome, sua empresa e o que você escreveu, na página do prestador.</li><li>Seu contato não aparece.</li><li>' +
        (f.prestadorId === 'novo'
          ? 'Como ele é novo na comunidade, a curadoria fala com ele e pede o aceite antes de ele aparecer na busca.'
          : 'O prestador já está na comunidade e não recebe aviso da sua indicação por aqui.') +
        '</li><li>Para corrigir ou retirar uma indicação, fale com a curadoria.</li></ul></section>' +
        '<div class="acoes"><button type="submit" class="botao">Enviar indicação</button>' +
        voltarEtapa +
        '</div></form>' +
        rascunho;
    }

    return { titulo: 'Indicar', aba: 'indicar', html: corpo };
  };

  // ------------------------------------------------------------------- pontos

  const rotuloSituacao = {
    disponivel: 'Disponível',
    em_analise: 'Em análise',
    recusado: 'Recusado',
    emitido: 'Vale emitido',
    usado: 'Vale usado',
    cancelado: 'Troca cancelada, pontos devolvidos',
    vencido: 'Vale vencido, pontos devolvidos',
  };

  function htmlLancamento(l) {
    let texto;
    let extra = '';
    let pontos;
    if (l.papel === 'troca') {
      const resgate = M.porId(estado.resgates, l.resgateId);
      const recompensa = M.porId(estado.recompensas, resgate.recompensaId);
      texto = '<a class="elo" href="#/vale/' + encodeURIComponent(resgate.id) + '">Troca: ' + esc(recompensa ? recompensa.titulo : 'serviço premium') + '</a>';
      pontos = l.situacao === 'cancelado' || l.situacao === 'vencido' ? '0' : '−' + -l.pontos;
    } else {
      const conf = M.porId(estado.confirmacoes, l.confirmacaoId);
      const p = prestador(conf.prestadorId);
      const servico = M.porId(p.servicos, conf.servicoId);
      const cliente = nomeDe(conf.clienteId);
      texto =
        l.papel === 'indicador'
          ? 'Sua indicação de ' + esc(p.nome) + ': ' + esc(cliente) + ' contratou ' + esc(servico.nome)
          : esc(cliente) + ' contratou ' + esc(servico.nome) + ' com a sua empresa';
      if (l.premium) extra = '<span class="etiqueta">Premium</span>';
      if (l.situacao === 'recusado' && conf.motivoRecusa) extra += '<span>Motivo: ' + esc(conf.motivoRecusa) + '</span>';
      pontos = l.situacao === 'recusado' ? '0' : '+' + l.pontos;
    }
    return (
      '<li class="lancamento"><p class="lancamento__texto">' +
      texto +
      '</p><p class="lancamento__pontos">' +
      pontos +
      '</p><p class="lancamento__rodape"><span class="situacao situacao--' +
      l.situacao +
      '">' +
      rotuloSituacao[l.situacao] +
      '</span><span>' +
      dataCurta(l.data) +
      '</span>' +
      extra +
      '</p></li>'
    );
  }

  telas.pontos = function () {
    const s = M.saldo(estado, R, voceId);
    const lista = M.lancamentos(estado, R, voceId);

    let frase;
    if (s.disponivel > 0) frase = 'Você tem <strong>' + pts(s.disponivel) + '</strong> para trocar por um serviço premium.';
    else if (!lista.length) frase = 'Você ainda não tem pontos.';
    else frase = 'Você não tem pontos disponíveis agora.';
    // A comunidade banca um número limitado de trocas por mês, para todos juntos.
    const vagas = M.vagasDeTrocaNoMes(estado, R, new Date().toISOString());
    let fraseTeto = '';
    if (vagas.teto !== null) {
      fraseTeto =
        vagas.restam === 0
          ? ' As ' + vagas.teto + ' trocas deste mês já foram usadas: seus pontos ficam guardados e as trocas voltam no mês que vem.'
          : ' A comunidade banca até ' + vagas.teto + ' trocas por mês; neste mês, ' + (vagas.restam === 1 ? 'resta 1' : 'restam ' + vagas.restam) + '.';
    }
    const analise = s.emAnalise > 0 ? '<p class="saldo__analise">' + (s.disponivel > 0 ? 'Mais ' : '') + pts(s.emAnalise) + ' em análise pela curadoria.</p>' : '';

    const trocas = estado.recompensas
      .filter((rec) => rec.ativa && (prestador(rec.prestadorId) || {}).status === 'ativo')
      .sort((a, b) => a.custo - b.custo)
      .map((rec) => {
        const parceiro = prestador(rec.prestadorId);
        let acao;
        if (parceiro && parceiro.donoId === voceId) acao = '<span class="pequeno">Serviço da sua empresa</span>';
        else if (vagas.restam === 0) acao = '<span class="pequeno">Volta no mês que vem</span>';
        else if (s.disponivel >= rec.custo) acao = '<a class="botao botao--compacto" href="#/troca/' + encodeURIComponent(rec.id) + '">Trocar</a>';
        else acao = '<span class="pequeno">Faltam ' + pts(rec.custo - s.disponivel) + '</span>';
        return (
          '<li class="troca"><div><p class="troca__titulo">' +
          esc(rec.titulo) +
          '</p><p class="troca__de">' +
          esc(parceiro ? parceiro.nome : 'Parceiro da comunidade') +
          '</p></div><p class="troca__custo">' +
          pts(rec.custo) +
          '</p><p class="troca__texto">' +
          esc(rec.descricao) +
          '</p><p class="troca__acao">' +
          acao +
          '</p></li>'
        );
      })
      .join('');

    const historico = lista.length
      ? '<ul>' + lista.map(htmlLancamento).join('') + '</ul>'
      : '<p class="apoio">Os pontos chegam quando alguém contrata um prestador que você indicou e confirma que o serviço foi concluído.</p><div class="acoes"><a class="botao botao--secundario" href="#/indicar">Indicar um prestador</a></div>';

    return {
      titulo: 'Pontos',
      aba: 'pontos',
      html:
        '<h1 class="titulo">Seus pontos</h1><p class="saldo">' +
        frase +
        '</p>' +
        analise +
        '<a class="elo elo--bloco" href="#/regras">Como os pontos funcionam</a>' +
        '<section class="secao"><h2>Trocar por</h2><p class="apoio">Serviços premium de parceiros da comunidade. Quem paga o parceiro é a comunidade; você usa só os pontos.' +
        fraseTeto +
        '</p><ul>' +
        trocas +
        '</ul></section>' +
        '<section class="secao"><h2>De onde vieram</h2>' +
        historico +
        '</section>',
    };
  };

  telas.troca = function (r) {
    const rec = M.porId(estado.recompensas, r.id);
    if (!rec) return telas.perdida();
    const parceiro = prestador(rec.prestadorId);
    const s = M.saldo(estado, R, voceId);
    const erros = M.validarResgate(estado, R, { membroId: voceId, recompensaId: rec.id, data: new Date().toISOString() });
    const corpo = erros.length
      ? '<p class="aviso aviso--erro" role="alert">' + esc(erros[0].mensagem) + '</p><div class="acoes"><a class="botao botao--secundario" href="#/pontos">Voltar para os pontos</a></div>'
      : '<dl class="resumo">' +
        linhaDeResumo('Você tem', pts(s.disponivel)) +
        linhaDeResumo('Esta troca usa', pts(rec.custo)) +
        linhaDeResumo('Você fica com', pts(s.disponivel - rec.custo)) +
        '</dl>' +
        (ui.erroTroca ? '<p class="aviso aviso--erro" role="alert">' + esc(ui.erroTroca) + '</p>' : '') +
        '<form class="acoes" data-form="troca" data-id="' +
        esc(rec.id) +
        '"><button type="submit" class="botao">Confirmar troca</button><a class="botao botao--secundario" href="#/pontos">Agora não</a></form>' +
        '<p class="dica">A troca gera um código para você enviar a ' +
        esc(parceiro ? parceiro.nome : 'quem oferece o serviço') +
        '. Quem paga o parceiro por este serviço é a comunidade. O código vale por ' +
        R.validadeDoValeEmDias +
        ' dias: enquanto não for usado, você pode cancelar e os pontos voltam; se o prazo passar, eles voltam sozinhos.</p>';
    return {
      titulo: 'Trocar pontos',
      aba: 'pontos',
      voltar: '#/pontos',
      html:
        '<h1 class="titulo">' +
        esc(rec.titulo) +
        '</h1><p class="apoio">' +
        esc(parceiro ? parceiro.nome : '') +
        (parceiro ? ' · ' : '') +
        esc(rec.descricao) +
        '</p>' +
        corpo,
    };
  };

  telas.vale = function (r) {
    const resgate = M.porId(estado.resgates, r.id);
    if (!resgate || resgate.membroId !== voceId) return telas.perdida();
    const rec = M.porId(estado.recompensas, resgate.recompensaId);
    const parceiro = rec ? prestador(rec.prestadorId) : null;
    const nomeParceiro = parceiro ? parceiro.nome : 'quem oferece o serviço';
    let corpo;
    if (resgate.status === 'emitido') {
      corpo =
        '<p class="apoio">Envie este código para ' +
        esc(nomeParceiro) +
        (parceiro && parceiro.arroba ? ' (@' + esc(parceiro.arroba) + ')' : '') +
        ' pelo Instagram para agendar. O código vale até ' +
        dataLonga(M.validadeDoVale(R, resgate)) +
        '. Se mudar de ideia antes de usar, cancele a troca e os ' +
        pts(resgate.custo) +
        ' voltam; se o prazo passar, eles voltam sozinhos.</p><div class="acoes"><button type="button" class="botao" id="copiar" data-acao="copiar" data-codigo="' +
        esc(resgate.codigo) +
        '">' +
        (ui.copiado ? 'Código copiado' : 'Copiar código') +
        '</button><button type="button" class="botao botao--secundario" data-acao="cancelarTroca" data-id="' +
        esc(resgate.id) +
        '">Cancelar a troca</button></div>';
    } else if (resgate.status === 'usado') {
      corpo = '<p class="apoio">Este vale já foi usado com ' + esc(nomeParceiro) + '.</p>';
    } else if (resgate.status === 'vencido') {
      corpo = '<p class="apoio">Este vale venceu em ' + dataLonga(resgate.vencidoEm) + ' sem ser usado. Os ' + pts(resgate.custo) + ' voltaram para você.</p>';
    } else {
      corpo = '<p class="apoio">Troca cancelada. Os ' + pts(resgate.custo) + ' voltaram para você.</p>';
    }
    return {
      titulo: 'Seu vale',
      aba: 'pontos',
      voltar: '#/pontos',
      html:
        '<h1 class="titulo">' +
        esc(rec ? rec.titulo : 'Serviço premium') +
        '</h1><div class="vale"><span class="vale__rotulo">Código do vale</span><span class="vale__codigo">' +
        esc(resgate.codigo) +
        '</span><span class="situacao situacao--' +
        (resgate.status === 'emitido' ? 'disponivel' : resgate.status) +
        '">' +
        rotuloSituacao[resgate.status] +
        ' · ' +
        dataCurta(resgate.data) +
        '</span></div>' +
        corpo +
        '<div class="acoes"><a class="botao botao--secundario" href="#/pontos">Voltar para os pontos</a></div>',
    };
  };

  // ------------------------------------------------------------------- regras

  telas.regras = function () {
    const p = R.pontos;
    return {
      titulo: 'Como os pontos funcionam',
      aba: 'pontos',
      voltar: '#/pontos',
      html:
        '<div class="prosa"><h1 class="titulo">Como os pontos funcionam</h1><p>Os pontos reconhecem quem indica bem. Eles nascem de serviço concluído, não de cadastro nem de elogio.</p>' +
        '<section class="secao"><h2>Quando entram pontos</h2><p>Quando quem contratou confirma que o serviço foi concluído e a curadoria confere, em até ' +
        R.prazoDaCuradoriaEmDias +
        ' dias.</p><table class="tabela"><thead><tr><th scope="col">Quem recebe</th><th scope="col">Serviço</th><th scope="col">Premium</th></tr></thead><tbody><tr><th scope="row">Quem indicou</th><td>' +
        p.indicador.padrao +
        '</td><td>' +
        p.indicador.premium +
        '</td></tr><tr><th scope="row">Empresa indicada</th><td>' +
        p.prestador.padrao +
        '</td><td>' +
        p.prestador.premium +
        '</td></tr></tbody></table><ul><li>Cada cliente novo conta uma vez por prestador. Se a mesma empresa contratar de novo, o relato entra no histórico, mas não gera pontos.</li><li>Quem chegou pela busca, sem uma indicação em especial, dá os pontos de indicação a quem trouxe o prestador para a comunidade.</li><li>Serviço premium é o que a curadoria marca como premium no perfil do prestador: ' +
        esc(R.criterioDoPremium) +
        '.</li></ul></section>' +
        '<section class="secao"><h2>O que não rende ponto</h2><ul><li>Indicar, por si só.</li><li>Contar como foi: quem relata não ganha nada por relatar.</li><li>Dizer que contrataria de novo: a resposta não muda os pontos de ninguém.</li><li>Contratar a própria empresa ou ser a própria indicação.</li><li>Pagar: taxa, mensalidade e patrocínio não compram pontos, nota nem lugar na busca.</li></ul></section>' +
        '<section class="secao"><h2>O que os pontos compram</h2><p>Serviços premium de parceiros da comunidade. Quem paga o parceiro é a comunidade, não você. A troca gera um código, que você envia ao parceiro para agendar.</p><ul><li>Os pontos não vencem.</li><li>O código vale por ' +
        R.validadeDoValeEmDias +
        ' dias. Enquanto não for usado, você pode cancelar e os pontos voltam; se o prazo passar, eles voltam sozinhos.</li>' +
        (R.tetoDeTrocasPorMes
          ? '<li>A comunidade banca até ' + R.tetoDeTrocasPorMes + ' trocas por mês, somando todos os membros. Atingido o teto, as trocas esperam o mês seguinte e os pontos ficam guardados.</li>'
          : '') +
        '</ul></section>' +
        '<section class="secao"><h2>De onde vem o dinheiro das trocas</h2><p>Hoje, do orçamento próprio de quem organiza a comunidade. Ninguém paga para participar.</p><p>Mais adiante estão previstas outras fontes: ' +
        esc(enumerar(R.fontesPrevistas)) +
        '. Nenhuma delas compra pontos, nota nem lugar na busca.</p></section>' +
        '<section class="secao"><h2>Reputação do serviço</h2><p>Fala do prestador. Quem contratou responde, para entrega, prazo, comunicação e cuidado, se foi abaixo, como combinado ou acima do combinado. A entrega pesa ' +
        R.reputacao.criterios[0].peso +
        '% e os outros três, ' +
        R.reputacao.criterios[1].peso +
        '% cada.</p><ul><li>Toda nota parte de “como combinado” e se ajusta a cada experiência confirmada, para um único relato não decidir tudo.</li><li>Aparece a partir de ' +
        R.reputacao.minimoParaAparecer +
        ' experiências confirmadas. Antes disso, fica “em formação”.</li><li>As faixas que aparecem: ' +
        R.reputacao.faixasDoServico
          .filter((x) => x.minimo >= R.reputacao.minimoPublico)
          .map((x) => esc(x.nome.toLowerCase()))
          .join(' e ') +
        '.</li><li>Se a nota ficar abaixo de ' +
        R.reputacao.minimoPublico +
        (R.reputacao.minimoPublico === R.reputacao.pontoDePartida.valor ? ', a nota de “como combinado”' : '') +
        ', a faixa não aparece: o prestador sai da busca e a curadoria revisa antes de qualquer coisa aparecer. Enquanto isso, a página dele mostra só que está em revisão, sem relatos.</li><li>A curadoria conversa com o prestador antes de decidir. Ele pode voltar “em acompanhamento”, sem nota, ou sair da comunidade.</li></ul></section>' +
        '<section class="secao"><h2>Qualidade das indicações</h2><p>Fala de quem recomenda. É a mesma conta, feita só sobre as contratações que vieram das indicações daquela pessoa.</p><ul><li>Indicar muito não aumenta a nota. Conta como foi cada contratação.</li><li>Também aparece a partir de ' +
        R.reputacao.minimoParaAparecer +
        ' contratações confirmadas.</li><li>Faixa baixa (nota abaixo de ' +
        R.reputacao.minimoPublico +
        ') não aparece para os outros membros: só a própria pessoa e a curadoria veem. Nesse caso, a curadoria procura a pessoa para conversar.</li></ul></section>' +
        '<section class="secao"><h2>Seguir e publicações</h2><p>Você escolhe quem segue: pessoas e empresas. A aba Seguindo mostra só o que elas indicaram e publicaram, do mais recente para o mais antigo. Nada entra ali por conta própria.</p><ul>' +
        (R.seguir.publico ? '' : '<li>Só você vê quem você segue. Nenhum perfil mostra número de seguidores, e ninguém é avisado quando é seguido.</li>') +
        '<li>Empresa publicada na rede pode publicar textos curtos. ' +
        (R.publicacao.curadoriaConfereAntes ? 'A curadoria confere cada publicação antes de ela aparecer.' : 'A curadoria acompanha as publicações e pode retirar o que não serve.') +
        '</li><li>Enquanto uma empresa está em revisão pela curadoria, as publicações dela também saem de vista.</li><li>Seguir e publicar não rendem pontos e não mudam a ordem da busca.</li></ul></section>' +
        '<section class="secao"><h2>Reputação e pontos não se misturam</h2><ul><li>Nota boa não rende ponto a mais.</li><li>Ponto não compra nota nem lugar na busca.</li><li>Quem não relata não é punido, e ninguém ganha nada por elogiar.</li></ul></section>' +
        '<section class="secao" id="quem-ve"><h2>Quem vê o quê</h2><ul><li>Sua indicação: os membros veem seu nome, sua empresa e o que você escreveu.</li><li>Seu relato: aparece na página do prestador. Você escolhe se o seu nome vai junto; a curadoria sempre sabe quem relatou.</li><li>Suas respostas por critério: só a curadoria vê separadas. Para os outros, elas entram somadas na reputação.</li><li>A qualidade das suas indicações: os membros veem quando ela é boa. Se cair, só você e a curadoria veem.</li><li>Seus pontos e suas trocas: só você e a curadoria veem.</li>' +
        (R.seguir.publico ? '' : '<li>Quem você segue: só você vê.</li>') +
        '<li>Seu contato não aparece em lugar nenhum.</li><li>Prestador novo: antes de aparecer na busca, a curadoria fala com ele e pede o aceite.</li></ul></section>' +
        '<section class="secao"><h2>A busca não é um ranking</h2><p>Sem busca, a lista mostra primeiro quem teve uma contratação confirmada há menos tempo. Com busca, vem primeiro quem mais combina com o que você escreveu. Pontos e reputação não mudam a ordem.</p></section>' +
        '<p class="pequeno" style="margin-top:2rem">' +
        esc(R.versao) +
        '.</p></div>',
    };
  };

  // ------------------------------------------------------------------- conta

  telas.conta = function () {
    const voce = membro(voceId);
    const pendentes =
      estado.confirmacoes.filter((c) => c.status === 'em_analise').length + estado.prestadores.filter((p) => p.status === 'em_analise' || p.status === 'pausado').length +
      estado.publicacoes.filter((x) => x.status === 'em_analise').length;
    const meusSeguidos = M.seguidos(estado, voceId);
    const quantosSigo = meusSeguidos.membros.length + meusSeguidos.prestadores.length;
    const curadora = estado.membros.filter((m) => m.papel === 'curadoria')[0];
    // A área de curadoria só existe para quem tem esse papel.
    const linhaCuradoria = souCuradoria()
      ? '<li><a href="#/curadoria"><span>Área de curadoria<small>' +
        (pendentes ? pendentes + (pendentes === 1 ? ' item para conferir' : ' itens para conferir') : 'Nada para conferir agora') +
        '</small></span>' +
        icone.seta +
        '</a></li>'
      : '';
    return {
      titulo: 'Sua conta',
      aba: null,
      voltar: '#/',
      html:
        '<div class="perfil">' +
        rosto(voceId, 'rosto--medio') +
        '<div><h1 class="titulo">' +
        esc(voce.nome) +
        '</h1><p class="perfil__meta">' +
        esc(voce.empresa) +
        ' · @' +
        esc(voce.arroba) +
        '</p></div></div>' +
        '<ul class="menu" style="margin-top:1.5rem">' +
        linhaCuradoria +
        '<li><a href="#/seguindo/lista"><span>Quem você segue<small>' +
        (quantosSigo ? quantosSigo + (quantosSigo === 1 ? ' perfil' : ' perfis') + (R.seguir.publico ? '' : ' · só você vê') : 'Ninguém ainda') +
        '</small></span>' +
        icone.seta +
        '</a></li>' +
        '<li><a href="#/regras"><span>Como os pontos funcionam<small>Regras, trocas e quem vê o quê</small></span>' +
        icone.seta +
        '</a></li></ul>' +
        (souCuradoria() ? '' : htmlQualidadeIndicacoes(voceId, true)) +
        '<section class="secao"><h2>Demonstração</h2><div class="campo"><label for="voce">Ver como</label><select id="voce" data-campo="voce.id">' +
        estado.membros.map((m) => '<option value="' + esc(m.id) + '"' + (m.id === voceId ? ' selected' : '') + '>' + esc(m.nome) + ' · ' + esc(m.empresa) + '</option>').join('') +
        '</select><p class="dica">No app de verdade, cada pessoa entra pelo link pessoal que a curadoria manda por direct, sem senha. Aqui você troca de pessoa para ver os dois lados' +
        (curadora && !souCuradoria() ? ': escolha ' + esc(curadora.nome) + ' para ver a área de curadoria' : '') +
        '.</p></div>' +
        (ui.reiniciando
          ? '<div class="acoes--linha"><button type="button" class="botao botao--perigo botao--compacto" id="reiniciar" data-acao="reiniciar">Sim, recomeçar</button><button type="button" class="botao botao--secundario botao--compacto" data-acao="desistirReinicio">Cancelar</button></div>'
          : '<div class="acoes--linha"><button type="button" class="botao botao--secundario botao--compacto" id="pedir-reinicio" data-acao="pedirReinicio">Reiniciar a demonstração</button></div>') +
        '<p class="dica">Reiniciar apaga o que você fez aqui e volta aos exemplos iniciais.</p></section>',
    };
  };
  telas.voce = telas.conta; // endereço antigo

  // Página pública de quem indica: a qualidade das indicações e o que a pessoa indica.
  telas.membro = function (r) {
    const m = membro(r.id);
    if (!m) return telas.perdida();
    const proprio = m.id === voceId;
    const indica = estado.indicacoes
      .filter((i) => i.membroId === m.id)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .map((i) => ({ i: i, p: prestador(i.prestadorId) }))
      .filter((x) => x.p && x.p.status === 'ativo')
      .map(
        (x) =>
          '<li><a href="#/prestador/' +
          encodeURIComponent(x.p.id) +
          '"><span>' +
          esc(x.p.nome) +
          '<small>' +
          (x.i.paraQue ? 'Para ' + esc(minusculaInicial(x.i.paraQue)) + ' · ' : '') +
          quando(x.i.data) +
          '</small></span>' +
          icone.seta +
          '</a></li>'
      )
      .join('');
    return {
      titulo: proprio ? 'Você' : m.nome,
      aba: null,
      voltar: '#/',
      html:
        '<div class="perfil">' +
        rosto(m.id, 'rosto--medio') +
        '<div><h1 class="titulo">' +
        esc(m.nome) +
        '</h1><p class="perfil__meta">' +
        esc(m.empresa) +
        ' · @' +
        esc(m.arroba) +
        '</p>' +
        (botaoSeguir('membro', m.id) ? '<p class="perfil__seguir">' + botaoSeguir('membro', m.id) + '</p>' : '') +
        '</div></div>' +
        (m.papel === 'curadoria' ? '<p class="aviso">Cuida da comunidade: confere relatos, prestadores novos e vales.</p>' : htmlQualidadeIndicacoes(m.id, proprio)) +
        '<section class="secao"><h2>' +
        (proprio ? 'Você indica' : 'Indica') +
        '</h2>' +
        (indica ? '<ul class="menu">' + indica + '</ul>' : '<p class="apoio">' + (proprio ? 'Você ainda não indicou ninguém.' : 'Ainda não indicou nenhum prestador ativo.') + '</p>') +
        '</section>',
    };
  };

  // ---------------------------------------------------------------- seguindo

  // O que chegou de quem a pessoa escolheu seguir. Só isso, do mais recente
  // para o mais antigo: nada entra aqui por conta própria.
  telas.seguindo = function (r) {
    const s = M.seguidos(estado, voceId);
    const total = s.membros.length + s.prestadores.length;

    if (r.id === 'lista') {
      const grupo = (titulo, tipo, ids) => (ids.length ? '<section class="secao"><h2>' + titulo + '</h2><ul class="seguiveis">' + ids.map((id) => linhaSeguivel(tipo, id)).join('') + '</ul></section>' : '');
      return {
        titulo: 'Quem você segue',
        aba: 'seguindo',
        voltar: '#/seguindo',
        html:
          '<h1 class="titulo">Quem você segue</h1><p class="apoio">' +
          (R.seguir.publico ? '' : 'Só você vê esta lista. Ninguém é avisado quando você segue ou deixa de seguir.') +
          '</p>' +
          (total
            ? grupo('Empresas', 'prestador', s.prestadores) + grupo('Pessoas', 'membro', s.membros)
            : '<div class="vazio"><h2>Você ainda não segue ninguém</h2><p>Siga pessoas e empresas pelo perfil de cada uma.</p><a class="botao botao--secundario" href="#/seguindo">Ver sugestões</a></div>'),
      };
    }

    const itens = M.feed(estado, R, voceId);
    let corpo;
    if (!total) {
      const sugestoes = M.sugestoesParaSeguir(estado, voceId);
      const linhas = sugestoes.prestadores.map((id) => linhaSeguivel('prestador', id)).join('') + sugestoes.membros.map((id) => linhaSeguivel('membro', id)).join('');
      corpo =
        '<div class="vazio"><h2>Você ainda não segue ninguém</h2><p>Escolha pessoas e empresas. O que elas indicarem e publicarem aparece aqui, e só isso.</p></div>' +
        (linhas ? '<section class="secao"><h2>Para começar</h2><p class="apoio">Empresas que você contratou ou indicou, e quem as indicou.</p><ul class="seguiveis">' + linhas + '</ul></section>' : '');
    } else if (!itens.length) {
      corpo = '<p class="apoio" style="margin-top:1.5rem">Quem você segue ainda não indicou nem publicou nada.</p>';
    } else {
      corpo = '<ul class="novidades">' + itens.map(htmlItemDoFeed).join('') + '</ul>';
    }

    return {
      titulo: 'Seguindo',
      aba: 'seguindo',
      html:
        '<h1 class="titulo">Seguindo</h1><p class="apoio">O que indicaram e publicaram as pessoas e as empresas que você escolheu seguir, do mais recente para o mais antigo.</p>' +
        (total ? '<a class="elo elo--bloco" href="#/seguindo/lista">Quem você segue (' + total + ')</a>' : '') +
        corpo,
    };
  };

  // ---------------------------------------------------------------- curadoria

  const rotuloSinal = {
    contratacao_cruzada: 'As duas empresas se contrataram uma à outra.',
    concentracao: 'Várias contratações da mesma indicação em pouco tempo.',
    indicacao_no_mesmo_dia: 'A indicação foi feita no mesmo dia da contratação.',
  };

  telas.curadoria = function () {
    if (!souCuradoria()) {
      return {
        titulo: 'Área de curadoria',
        aba: null,
        voltar: '#/conta',
        html: '<h1 class="titulo">Área restrita à curadoria</h1><p class="apoio">Só quem cuida da comunidade confere relatos, prestadores novos e vales.</p><div class="acoes"><a class="botao botao--secundario" href="#/conta">Ir para a sua conta</a></div>',
      };
    }
    const cur = ui.curadoria;
    const relatos = estado.confirmacoes
      .filter((c) => c.status === 'em_analise')
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map((c) => {
        const p = prestador(c.prestadorId);
        const servico = M.porId(p.servicos, c.servicoId);
        const pt = M.pontosDaConfirmacao(estado, R, c);
        const sinais = M.sinaisParaCuradoria(estado, R, c);
        const previsao = M.previsaoDeAprovacao(estado, R, c.id);
        const emJogo = [];
        if (pt.pontosIndicador) emJogo.push(esc(membro(pt.indicadorId).nome) + ' +' + pt.pontosIndicador);
        if (pt.pontosPrestador) emJogo.push(esc(p.nome) + ' +' + pt.pontosPrestador);
        const recusando = cur.recusando === c.id;
        return (
          '<li class="caso"><p class="caso__titulo">' +
          esc(membro(c.clienteId).nome) +
          ' contratou ' +
          esc(servico.nome) +
          ' com ' +
          esc(p.nome) +
          '</p><p class="caso__meta">' +
          (c.origem === 'busca' ? 'Chegou pela busca' : 'Indicação de ' + esc(membro(c.indicadorId).nome)) +
          ' · ' +
          quando(c.data) +
          ' · ' +
          (c.contratariaDeNovo ? 'contrataria de novo' : 'não contrataria de novo') +
          '</p><p class="caso__meta">' +
          (emJogo.length ? 'Pontos em jogo: ' + emJogo.join(', ') : pt.motivoSemPontos === 'recontratacao' ? 'Recontratação: não gera pontos' : 'Não gera pontos') +
          '</p><p class="caso__meta">Experiência: ' +
          Math.round(M.notaDaExperiencia(R, c)) +
          ' de 100 (' +
          R.reputacao.criterios.map((k) => esc(k.nome.toLowerCase()) + ' ' + esc(rotuloDaResposta(c.criterios[k.id]).toLowerCase())).join(', ') +
          ')</p>' +
          (sinais.length ? '<p class="caso__sinais">Atenção: ' + sinais.map((x) => rotuloSinal[x]).join(' ') + '</p>' : '') +
          (previsao.pausaria
            ? '<p class="caso__sinais">Se você aprovar, a reputação de ' +
              esc(p.nome) +
              ' cai para ' +
              esc(previsao.faixa.toLowerCase()) +
              ' (' +
              previsao.nota +
              ' de 100). O prestador sai da busca e fica pausado até você decidir.</p>'
            : '') +
          (recusando
            ? '<div class="campo"><label for="motivo">Motivo da recusa</label><textarea id="motivo" data-campo="curadoria.motivo">' +
              esc(cur.motivo) +
              '</textarea><p class="dica">Quem indicou e o prestador leem este motivo.</p>' +
              (cur.erro ? '<p class="erro" role="alert">' + esc(cur.erro) + '</p>' : '') +
              '</div><div class="acoes--linha"><button type="button" class="botao botao--perigo botao--compacto" data-acao="confirmarRecusa" data-id="' +
              esc(c.id) +
              '">Confirmar recusa</button><button type="button" class="botao botao--secundario botao--compacto" data-acao="desistirRecusa">Cancelar</button></div>'
            : '<div class="acoes--linha"><button type="button" class="botao botao--compacto" data-acao="aprovarRelato" data-id="' +
              esc(c.id) +
              '">Aprovar</button><button type="button" class="botao botao--secundario botao--compacto" id="recusar-' +
              esc(c.id) +
              '" data-acao="recusarRelato" data-id="' +
              esc(c.id) +
              '">Recusar</button></div>') +
          '</li>'
        );
      })
      .join('');

    const novos = estado.prestadores
      .filter((p) => p.status === 'em_analise')
      .map((p) => {
        const ind = M.indicacoesDoPrestador(estado, p.id)[0];
        return (
          '<li class="caso"><p class="caso__titulo">' +
          esc(p.nome) +
          '</p><p class="caso__meta">' +
          esc(p.setor) +
          (p.cidade ? ' · ' + esc(p.cidade) : '') +
          (p.arroba ? ' · @' + esc(p.arroba) : '') +
          ' · ' +
          esc(p.servicos.map((s) => s.nome).join(', ')) +
          '</p>' +
          (ind ? '<p class="caso__meta">Indicação de ' + esc(membro(ind.membroId).nome) + (ind.paraQue ? ', para ' + esc(minusculaInicial(ind.paraQue)) : '') + ': “' + esc(ind.texto) + '”</p>' : '') +
          '<p class="caso__meta">Antes de publicar, fale com o prestador pelo direct, explique a comunidade e peça o aceite: ele vai ser avaliado por quem contratar e também ganha pontos. Diga que hoje não há cobrança e que uma taxa por contratação confirmada está prevista para mais adiante.</p>' +
          '<div class="acoes--linha"><button type="button" class="botao botao--compacto" data-acao="aprovarPrestador" data-id="' +
          esc(p.id) +
          '">Aceitou: publicar</button><button type="button" class="botao botao--secundario botao--compacto" data-acao="recusarPrestador" data-id="' +
          esc(p.id) +
          '">Não entra</button></div></li>'
        );
      })
      .join('');

    const pausados = estado.prestadores
      .filter((p) => p.status === 'pausado')
      .map((p) => {
        const rep = M.reputacaoDoServico(estado, R, p.id);
        return (
          '<li class="caso"><p class="caso__titulo"><a class="elo" href="#/prestador/' +
          encodeURIComponent(p.id) +
          '">' +
          esc(p.nome) +
          '</a></p><p class="caso__meta">' +
          (rep.formada ? esc(rep.faixa) + ', ' + rep.nota + ' de 100, com ' + experiencias(rep.experiencias) : experiencias(rep.experiencias)) +
          (p.pausadoEm ? ' · pausado ' + quando(p.pausadoEm) : '') +
          '</p>' +
          (rep.formada ? '<p class="caso__meta">' + rep.criterios.map((k) => esc(k.nome) + ': ' + esc(k.leitura)).join(' · ') + '</p>' : '') +
          '<p class="caso__meta">Antes de decidir, fale com o prestador pelo direct: conte o que os relatos apontaram, sem dizer quem relatou, e ouça o lado dele.</p>' +
          '<p class="caso__meta">Enquanto está pausado, os membros não veem a faixa, a nota nem os relatos. Se voltar à busca, aparece como “em acompanhamento” até a nota subir.</p>' +
          '<div class="acoes--linha"><button type="button" class="botao botao--secundario botao--compacto" data-acao="voltarPrestador" data-id="' +
          esc(p.id) +
          '">Voltar à busca</button><button type="button" class="botao botao--perigo botao--compacto" data-acao="retirarPrestador" data-id="' +
          esc(p.id) +
          '">Retirar da comunidade</button></div></li>'
        );
      })
      .join('');

    const vales = estado.resgates
      .filter((x) => x.status === 'emitido')
      .map((x) => {
        const rec = M.porId(estado.recompensas, x.recompensaId);
        return (
          '<li class="caso"><p class="caso__titulo">' +
          esc(x.codigo) +
          ' · ' +
          esc(rec ? rec.titulo : '') +
          '</p><p class="caso__meta">' +
          esc(membro(x.membroId).nome) +
          ' · ' +
          pts(x.custo) +
          ' · ' +
          quando(x.data) +
          ' · vale até ' +
          dataLonga(M.validadeDoVale(R, x)) +
          '</p><div class="acoes--linha"><button type="button" class="botao botao--secundario botao--compacto" data-acao="usarTroca" data-id="' +
          esc(x.id) +
          '">Marcar como usado</button></div></li>'
        );
      })
      .join('');

    // Publicações de empresa: nada aparece antes de a curadoria conferir.
    const curPub = ui.curadoriaPub;
    const casoPublicacao = (x) => {
      const empresa = prestador(x.prestadorId);
      const noAr = x.status === 'publicada';
      return (
        '<li class="caso"><p class="caso__titulo">' +
        esc(empresa ? empresa.nome : 'Empresa') +
        '</p><p class="caso__meta">' +
        esc(nomeDe(x.autorId)) +
        ' · ' +
        (noAr ? 'no ar ' + quando(x.publicadaEm || x.data) : 'enviada ' + quando(x.data)) +
        '</p><blockquote class="caso__texto">' +
        esc(x.texto) +
        '</blockquote>' +
        (curPub.recusando === x.id
          ? '<div class="campo"><label for="motivo-pub">' +
            (noAr ? 'Motivo da retirada' : 'Motivo da recusa') +
            '</label><textarea id="motivo-pub" data-campo="curadoriaPub.motivo">' +
            esc(curPub.motivo) +
            '</textarea><p class="dica">A empresa lê este motivo.</p>' +
            (curPub.erro ? '<p class="erro" role="alert">' + esc(curPub.erro) + '</p>' : '') +
            '</div><div class="acoes--linha"><button type="button" class="botao botao--perigo botao--compacto" data-acao="confirmarRecusaPublicacao" data-id="' +
            esc(x.id) +
            '">' +
            (noAr ? 'Confirmar retirada' : 'Confirmar recusa') +
            '</button><button type="button" class="botao botao--secundario botao--compacto" data-acao="desistirRecusaPublicacao">Cancelar</button></div>'
          : '<div class="acoes--linha">' +
            (noAr ? '' : '<button type="button" class="botao botao--compacto" data-acao="aprovarPublicacao" data-id="' + esc(x.id) + '">Aprovar</button>') +
            '<button type="button" class="botao botao--secundario botao--compacto" id="recusar-pub-' +
            esc(x.id) +
            '" data-acao="recusarPublicacao" data-id="' +
            esc(x.id) +
            '">' +
            (noAr ? 'Retirar' : 'Recusar') +
            '</button></div>') +
        '</li>'
      );
    };
    const publicacoesParaConferir = estado.publicacoes
      .filter((x) => x.status === 'em_analise')
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map(casoPublicacao)
      .join('');
    const noAr = estado.publicacoes.filter((x) => x.status === 'publicada').sort((a, b) => new Date(b.publicadaEm || b.data) - new Date(a.publicadaEm || a.data));
    const publicacoesNoAr = noAr.length
      ? '<details class="metodo"' +
        (noAr.some((x) => x.id === curPub.recusando) ? ' open' : '') +
        '><summary>Publicações no ar (' +
        noAr.length +
        ')</summary><ul>' +
        noAr.map(casoPublicacao).join('') +
        '</ul></details>'
      : '';

    const conversas = M.membrosParaConversar(estado, R)
      .map((x) => {
        const m = membro(x.membroId);
        return (
          '<li class="caso"><p class="caso__titulo"><a class="elo" href="#/membro/' +
          encodeURIComponent(m.id) +
          '">' +
          esc(m.nome) +
          '</a></p><p class="caso__meta">Indicações ' +
          esc(x.faixa.toLowerCase()) +
          ', ' +
          x.nota +
          ' de 100, em ' +
          x.contratacoes +
          ' contratações confirmadas</p><p class="caso__meta">' +
          x.criterios.map((k) => esc(k.nome) + ': ' + esc(k.leitura)).join(' · ') +
          '</p><p class="caso__meta">Os outros membros não veem esta faixa. Procure a pessoa pelo direct para conversar, sem dizer quem relatou.</p></li>'
        );
      })
      .join('');

    const observacao = estado.prestadores
      .filter((p) => p.status === 'ativo' && M.resumoPrestador(estado, R, p.id).emObservacao)
      .map((p) => {
        const resumo = M.resumoPrestador(estado, R, p.id);
        return '<li class="caso"><p class="caso__titulo">' + esc(p.nome) + '</p><p class="caso__meta">' + resumo.contratariam + ' de ' + resumo.contratacoes + ' contratariam de novo.</p></li>';
      })
      .join('');

    const bloco = (titulo, itens, vazio, nota) =>
      '<section class="secao"><h2>' + titulo + '</h2>' + (nota ? '<p class="apoio">' + nota + '</p>' : '') + (itens ? '<ul>' + itens + '</ul>' : '<p class="apoio">' + vazio + '</p>') + '</section>';
    const vagas = M.vagasDeTrocaNoMes(estado, R, new Date().toISOString());

    return {
      titulo: 'Área de curadoria',
      aba: null,
      voltar: '#/conta',
      html:
        '<h1 class="titulo">Área de curadoria</h1><p class="apoio">É aqui que um ponto em análise vira ponto disponível. Os membros não veem esta área.</p>' +
        bloco('Relatos para conferir', relatos, 'Nenhum relato esperando conferência.') +
        bloco('Publicações para conferir', publicacoesParaConferir, 'Nenhuma publicação esperando conferência.', 'Texto de empresa só aparece para quem a segue depois de aprovado aqui.') +
        bloco('Prestadores pausados', pausados, 'Nenhum prestador pausado.') +
        bloco('Quem indica, para conversar', conversas, 'Ninguém com a qualidade das indicações abaixo de ' + R.reputacao.minimoPublico + '.') +
        bloco('Prestadores novos, para convidar', novos, 'Nenhum prestador novo para convidar.') +
        bloco('Vales emitidos', vales, 'Nenhum vale esperando uso.', vagas.teto === null ? '' : 'Trocas bancadas neste mês: ' + vagas.usadas + ' de ' + vagas.teto + '.') +
        bloco('Para acompanhar', observacao, 'Nenhum prestador com recontratação abaixo de ' + Math.round(R.observacao.minimoDeRecontratacao * 100) + '%.') +
        publicacoesNoAr,
    };
  };

  telas.perdida = function () {
    return {
      titulo: 'Página não encontrada',
      aba: null,
      voltar: '#/',
      html: '<h1 class="titulo">Não achei esta página</h1><p class="apoio">O endereço pode ter mudado.</p><div class="acoes"><a class="botao" href="#/">Ir para a busca</a></div>',
    };
  };

  // ------------------------------------------------------------------ desenho

  let fimDaEntrada = null;

  function desenhar(opcoes) {
    opcoes = opcoes || {};
    darBaixaNosVales();
    const r = rota();
    r.navegou = !!opcoes.navegou;
    r.inicial = !!opcoes.inicial;
    const ativo = document.activeElement;
    const focoAnterior = !opcoes.navegou && ativo && ativo.id ? ativo.id : null;
    const tela = (telas[r.nome] || telas.perdida)(r);

    elTopo.className = 'topo' + (tela.voltar ? ' topo--interna' : '');
    elTopo.innerHTML = htmlTopo(tela);
    elTela.innerHTML = R.demonstracao ? htmlFaixaDemo() + tela.html + htmlDemo() : tela.html;
    elAbas.innerHTML = htmlAbas(tela.aba);
    document.title = tela.titulo + ' · ' + R.nomeDaComunidade;

    window.clearTimeout(fimDaEntrada);
    elTela.classList.remove('entrando');
    if (opcoes.navegou || opcoes.topo) {
      window.scrollTo(0, 0);
      void elTela.offsetWidth;
      elTela.classList.add('entrando');
      fimDaEntrada = window.setTimeout(() => elTela.classList.remove('entrando'), 320);
      const h1 = elTela.querySelector('h1');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      return;
    }
    const alvo = document.getElementById(opcoes.foco || focoAnterior || '');
    if (alvo) alvo.focus({ preventScroll: !opcoes.foco });
  }

  // -------------------------------------------------------------------- ações

  function exigeCuradoria() {
    if (souCuradoria()) return true;
    anunciar('Só a curadoria pode fazer isso.');
    return false;
  }

  const acoes = {
    voltar(el, ev) {
      if (passos > 0) {
        ev.preventDefault();
        window.history.back();
      }
    },
    setor(el) {
      ui.busca.setor = el.dataset.valor;
      desenhar();
    },
    situacao(el) {
      ui.busca.texto = el.dataset.valor;
      desenhar({ foco: 'contagem' });
    },
    verTodos() {
      ui.busca.todos = true;
      desenhar({ foco: 'contagem' });
    },
    limpar() {
      ui.busca = { texto: '', setor: '', soPremium: false, todos: false };
      desenhar({ foco: 'q' });
    },
    chamar(el) {
      ui.chamou = el.dataset.id;
      desenhar();
    },
    salvar(el) {
      const eu = meu();
      const id = el.dataset.id;
      const estava = eu.salvos.indexOf(id) !== -1;
      eu.salvos = estava ? eu.salvos.filter((x) => x !== id) : [id].concat(eu.salvos);
      gravarPessoal();
      desenhar();
      anunciar(estava ? 'Removido dos salvos.' : 'Salvo. Aparece no início da busca.');
    },
    corrigirRelato() {
      ui.comoFoi.revisando = false;
      ui.comoFoi.erros = [];
      desenhar({ topo: true });
    },
    etapaAnterior() {
      const f = ui.indicar;
      f.etapa = Math.max(1, f.etapa - 1);
      f.erros = [];
      salvarRascunho();
      desenhar({ topo: true });
    },
    apagarRascunho() {
      meu().rascunho = null;
      gravarPessoal();
      ui.indicar = indicarInicial('');
      desenhar({ topo: true });
      anunciar('Rascunho apagado.');
    },
    novaIndicacao() {
      ui.indicar = indicarInicial('');
      desenhar({ topo: true });
    },
    copiar(el) {
      const codigo = el.dataset.codigo;
      const feito = () => {
        ui.copiado = true;
        desenhar();
        anunciar('Código copiado');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(codigo).then(feito, feito);
      else feito();
    },
    cancelarTroca(el) {
      const r = M.cancelarResgate(estado, el.dataset.id);
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Troca cancelada. Os pontos voltaram.');
      }
      desenhar();
    },
    aprovarRelato(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirConfirmacao(estado, R, el.dataset.id, 'aprovada', '', new Date().toISOString());
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar(r.pausou ? 'Relato aprovado. ' + prestador(r.pausou).nome + ' saiu da busca e ficou pausado para a sua decisão.' : 'Relato aprovado. Os pontos estão disponíveis.');
      }
      desenhar();
    },
    voltarPrestador(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirPausa(estado, el.dataset.id, 'voltar');
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Prestador de volta à busca, em acompanhamento.');
      }
      desenhar();
    },
    retirarPrestador(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirPausa(estado, el.dataset.id, 'retirar');
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Prestador retirado da comunidade.');
      }
      desenhar();
    },
    recusarRelato(el) {
      ui.curadoria = { recusando: el.dataset.id, motivo: '', erro: '' };
      desenhar({ foco: 'motivo' });
    },
    desistirRecusa() {
      ui.curadoria = { recusando: null, motivo: '', erro: '' };
      desenhar();
    },
    confirmarRecusa(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirConfirmacao(estado, R, el.dataset.id, 'recusada', ui.curadoria.motivo);
      if (r.erros.length) {
        ui.curadoria.erro = r.erros[0].mensagem;
        desenhar({ foco: 'motivo' });
        return;
      }
      gravar(r.estado);
      ui.curadoria = { recusando: null, motivo: '', erro: '' };
      anunciar('Relato recusado.');
      desenhar();
    },
    aprovarPrestador(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirPrestador(estado, el.dataset.id, 'ativo', new Date().toISOString());
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Convite aceito. O prestador já aparece na busca.');
      }
      desenhar();
    },
    recusarPrestador(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirPrestador(estado, el.dataset.id, 'recusado');
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('O prestador não entrou na comunidade.');
      }
      desenhar();
    },
    usarTroca(el) {
      if (!exigeCuradoria()) return;
      const r = M.marcarResgateUsado(estado, el.dataset.id, R, new Date().toISOString());
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Vale marcado como usado.');
      } else {
        anunciar(r.erros[0].mensagem);
      }
      desenhar();
    },
    seguir(el) {
      const r = M.seguir(estado, { membroId: voceId, tipo: el.dataset.tipo, alvoId: el.dataset.id, data: new Date().toISOString() });
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Você passou a seguir ' + nomeDoSeguido(el.dataset.tipo, el.dataset.id) + '.');
      } else {
        anunciar(r.erros[0].mensagem);
      }
      desenhar();
    },
    deixarDeSeguir(el) {
      const r = M.deixarDeSeguir(estado, voceId, el.dataset.tipo, el.dataset.id);
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Você deixou de seguir ' + nomeDoSeguido(el.dataset.tipo, el.dataset.id) + '.');
      }
      desenhar();
    },
    aprovarPublicacao(el) {
      if (!exigeCuradoria()) return;
      const r = M.decidirPublicacao(estado, el.dataset.id, 'publicada', '', new Date().toISOString());
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Publicação aprovada. Já aparece para quem segue a empresa.');
      }
      desenhar();
    },
    recusarPublicacao(el) {
      ui.curadoriaPub = { recusando: el.dataset.id, motivo: '', erro: '' };
      desenhar({ foco: 'motivo-pub' });
    },
    desistirRecusaPublicacao() {
      ui.curadoriaPub = { recusando: null, motivo: '', erro: '' };
      desenhar();
    },
    confirmarRecusaPublicacao(el) {
      if (!exigeCuradoria()) return;
      const atual = M.porId(estado.publicacoes, el.dataset.id);
      const noAr = !!atual && atual.status === 'publicada';
      const r = noAr ? M.retirarPublicacao(estado, el.dataset.id, ui.curadoriaPub.motivo) : M.decidirPublicacao(estado, el.dataset.id, 'recusada', ui.curadoriaPub.motivo);
      if (r.erros.length) {
        ui.curadoriaPub.erro = r.erros[0].mensagem;
        desenhar({ foco: 'motivo-pub' });
        return;
      }
      gravar(r.estado);
      ui.curadoriaPub = { recusando: null, motivo: '', erro: '' };
      anunciar(noAr ? 'Publicação retirada.' : 'Publicação recusada.');
      desenhar();
    },
    pedirApagarPublicacao(el) {
      ui.publicar.apagando = el.dataset.id;
      desenhar({ foco: 'apagar-sim' });
    },
    desistirApagarPublicacao() {
      ui.publicar.apagando = null;
      desenhar();
    },
    apagarPublicacao(el) {
      const r = M.apagarPublicacao(estado, el.dataset.id, voceId);
      if (!r.erros.length) {
        gravar(r.estado);
        anunciar('Publicação apagada.');
      }
      ui.publicar.apagando = null;
      desenhar();
    },
    pedirReinicio() {
      ui.reiniciando = true;
      desenhar({ foco: 'reiniciar' });
    },
    desistirReinicio() {
      ui.reiniciando = false;
      desenhar({ foco: 'pedir-reinicio' });
    },
    reiniciar() {
      estado = A.reiniciar();
      voceId = A.carregarVoce();
      pessoal = A.carregarPessoal();
      ui = uiInicial();
      anunciar('Demonstração reiniciada.');
      if (rota().nome === 'buscar') desenhar({ navegou: true });
      else window.location.hash = '#/';
    },
  };

  const formularios = {
    busca() {
      const campo = document.getElementById('q');
      if (campo) campo.blur();
    },
    // Parte 1 do relato: confere os campos e abre a conferência.
    comoFoi() {
      const f = ui.comoFoi;
      const erros = M.validarConfirmacao(estado, R, candidatoComoFoi(f, 'previa'));
      if (erros.length) {
        f.erros = erros;
        desenhar({ foco: 'erros' });
        return;
      }
      f.erros = [];
      f.revisando = true;
      desenhar({ topo: true });
    },
    comoFoiEnviar() {
      const f = ui.comoFoi;
      const r = M.registrarConfirmacao(estado, R, candidatoComoFoi(f, novoId('c')));
      if (r.erros.length) {
        f.erros = r.erros;
        f.revisando = false;
        desenhar({ foco: 'erros' });
        return;
      }
      gravar(r.estado);
      f.erros = [];
      f.revisando = false;
      f.enviado = r.confirmacao.id;
      desenhar({ topo: true });
      anunciar('Relato enviado.');
    },
    // Etapas 1 e 2 da indicação: só os campos da etapa precisam estar certos.
    indicarEtapa() {
      const f = ui.indicar;
      const campos = CAMPOS_DA_ETAPA[f.etapa];
      const erros = M.validarIndicacao(estado, R, montarIndicacao(f)).filter((e) => campos.indexOf(e.campo) !== -1);
      if (erros.length) {
        f.erros = erros;
        desenhar({ foco: 'erros' });
        return;
      }
      f.erros = [];
      f.etapa += 1;
      salvarRascunho();
      desenhar({ topo: true });
    },
    indicar() {
      const f = ui.indicar;
      const r = M.registrarIndicacao(estado, R, montarIndicacao(f));
      if (r.erros.length) {
        // Volta para a primeira etapa que tem erro.
        const etapa = [1, 2, 3].filter((n) => r.erros.some((e) => CAMPOS_DA_ETAPA[n].indexOf(e.campo) !== -1))[0] || 3;
        f.etapa = etapa;
        f.erros = r.erros.filter((e) => CAMPOS_DA_ETAPA[etapa].indexOf(e.campo) !== -1);
        if (!f.erros.length) f.erros = r.erros;
        desenhar({ foco: 'erros' });
        return;
      }
      gravar(r.estado);
      f.erros = [];
      f.enviado = r.prestador.id;
      meu().rascunho = null;
      gravarPessoal();
      desenhar({ topo: true });
      anunciar('Indicação enviada.');
    },
    publicar(form) {
      const f = ui.publicar;
      const r = M.publicar(estado, R, { id: novoId('pb'), prestadorId: form.dataset.id, autorId: voceId, texto: f.texto, data: new Date().toISOString() });
      if (r.erros.length) {
        f.erros = r.erros;
        f.enviada = false;
        desenhar({ foco: 'pub-texto' });
        return;
      }
      gravar(r.estado);
      ui.publicar = { texto: '', erros: [], apagando: null, enviada: true };
      desenhar({ foco: 'pub-texto' });
      anunciar(R.publicacao.curadoriaConfereAntes ? 'Publicação enviada para a curadoria.' : 'Publicado.');
    },
    troca(form) {
      const r = M.resgatar(estado, R, { id: novoId('t'), membroId: voceId, recompensaId: form.dataset.id, data: new Date().toISOString(), codigo: novoCodigo() });
      if (r.erros.length) {
        ui.erroTroca = r.erros[0].mensagem;
        desenhar();
        return;
      }
      gravar(r.estado);
      anunciar('Troca confirmada. Seu vale está pronto.');
      window.location.replace('#/vale/' + encodeURIComponent(r.resgate.id));
    },
  };

  // nome do campo na tela -> nome do campo nos erros do motor
  const campoDoErro = { servicoId: 'servico', contrataria: 'contratariaDeNovo', prestadorId: 'prestador' };

  function definir(caminho, valor) {
    const partes = caminho.split('.');
    const grupo = ui[partes[0]];
    if (!grupo) return;
    grupo[partes[1]] = valor;
    if (Array.isArray(grupo.erros)) {
      if (partes[1].indexOf('c_') === 0) {
        // o erro dos critérios só sai quando todos foram respondidos
        if (R.reputacao.criterios.every((c) => grupo['c_' + c.id])) grupo.erros = grupo.erros.filter((e) => e.campo !== 'criterios');
      } else {
        const campo = campoDoErro[partes[1]] || partes[1];
        grupo.erros = grupo.erros.filter((e) => e.campo !== campo);
      }
    }
    if (partes[0] === 'indicar') salvarRascunho();
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-acao]');
    if (!el || !acoes[el.dataset.acao]) return;
    acoes[el.dataset.acao](el, ev);
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-campo]');
    if (!el || el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT') return;
    definir(el.dataset.campo, el.value);
    if (el.dataset.campo === 'busca.texto') atualizarAbaixoDaBusca();
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-campo]');
    if (!el) return;
    if (el.dataset.campo === 'voce.id') {
      if (membro(el.value)) {
        voceId = el.value;
        A.salvarVoce(voceId);
        ui.comoFoi = null;
        ui.indicar = null;
        ui.publicar = { texto: '', erros: [], apagando: null, enviada: false };
        ui.curadoriaPub = { recusando: null, motivo: '', erro: '' };
        anunciar('Agora você vê a demonstração como ' + membro(voceId).nome + '.');
        desenhar();
      }
      return;
    }
    if (el.type === 'checkbox') definir(el.dataset.campo, el.checked);
    else if (el.type === 'radio' || el.tagName === 'SELECT') definir(el.dataset.campo, el.value);
    else return;
    desenhar();
  });

  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('form[data-form]');
    if (!form) return;
    ev.preventDefault();
    if (formularios[form.dataset.form]) formularios[form.dataset.form](form);
  });

  window.addEventListener('hashchange', () => {
    passos += 1;
    ui.chamou = null;
    ui.copiado = false;
    ui.reiniciando = false;
    ui.erroTroca = '';
    ui.curadoria = { recusando: null, motivo: '', erro: '' };
    ui.curadoriaPub = { recusando: null, motivo: '', erro: '' };
    ui.publicar.apagando = null;
    ui.publicar.enviada = false;
    if (ui.comoFoi && !ui.comoFoi.enviado) ui.comoFoi.revisando = false;
    desenhar({ navegou: true });
  });

  desenhar({ inicial: true });
})();
