/*
 * Onde os dados ficam guardados.
 *
 * Nesta demonstração, ficam só no navegador deste aparelho (localStorage).
 * Para virar um app de verdade, este é o único arquivo a trocar: carregar()
 * e salvar() passam a falar com um banco de dados, e o resto continua igual.
 */
(function (raiz) {
  'use strict';

  var CHAVE_ESTADO = 'comunidade-indicacoes.estado.v6';
  var CHAVE_VOCE = 'comunidade-indicacoes.voce.v6';
  // Só deste aparelho e de cada pessoa: prestadores salvos, vistos por último
  // e o rascunho da indicação.
  var CHAVE_PESSOAL = 'comunidade-indicacoes.pessoal.v6';
  var memoria = {};

  function ler(chave) {
    try {
      return raiz.localStorage.getItem(chave);
    } catch (erro) {
      return Object.prototype.hasOwnProperty.call(memoria, chave) ? memoria[chave] : null;
    }
  }

  function gravar(chave, valor) {
    memoria[chave] = valor;
    try {
      raiz.localStorage.setItem(chave, valor);
    } catch (erro) {
      /* navegador sem armazenamento: segue só na memória desta visita */
    }
  }

  function estadoValido(estado) {
    return (
      estado &&
      estado.versao === 6 &&
      ['membros', 'prestadores', 'indicacoes', 'confirmacoes', 'recompensas', 'resgates', 'publicacoes', 'seguindo'].every(function (chave) {
        return Array.isArray(estado[chave]);
      })
    );
  }

  // Versões antigas da demonstração deixaram dados neste navegador: apaga.
  function limparVersoesAntigas() {
    try {
      ['v1', 'v2', 'v3', 'v4', 'v5'].forEach(function (versao) {
        ['estado', 'voce', 'pessoal'].forEach(function (nome) {
          raiz.localStorage.removeItem('comunidade-indicacoes.' + nome + '.' + versao);
        });
      });
    } catch (erro) {
      /* sem armazenamento: nada a limpar */
    }
  }

  function carregar() {
    limparVersoesAntigas();
    var bruto = ler(CHAVE_ESTADO);
    if (bruto) {
      try {
        var estado = JSON.parse(bruto);
        if (estadoValido(estado)) return estado;
      } catch (erro) {
        /* dado corrompido: volta para o exemplo */
      }
    }
    return reiniciar();
  }

  function salvar(estado) {
    gravar(CHAVE_ESTADO, JSON.stringify(estado));
  }

  function reiniciar() {
    var estado = raiz.Dados.exemplo(new Date());
    salvar(estado);
    gravar(CHAVE_VOCE, raiz.Dados.membroInicial);
    gravar(CHAVE_PESSOAL, '{}');
    return estado;
  }

  function carregarPessoal() {
    try {
      var pessoal = JSON.parse(ler(CHAVE_PESSOAL) || '{}');
      return pessoal && typeof pessoal === 'object' && !Array.isArray(pessoal) ? pessoal : {};
    } catch (erro) {
      return {};
    }
  }

  function salvarPessoal(pessoal) {
    gravar(CHAVE_PESSOAL, JSON.stringify(pessoal));
  }

  function carregarVoce() {
    return ler(CHAVE_VOCE) || raiz.Dados.membroInicial;
  }

  function salvarVoce(id) {
    gravar(CHAVE_VOCE, id);
  }

  raiz.Armazenamento = {
    carregar: carregar,
    salvar: salvar,
    reiniciar: reiniciar,
    carregarVoce: carregarVoce,
    salvarVoce: salvarVoce,
    carregarPessoal: carregarPessoal,
    salvarPessoal: salvarPessoal,
  };
})(typeof self !== 'undefined' ? self : this);
