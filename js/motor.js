/*
 * Motor de pontos da Comunidade de Indicações.
 *
 * Funções puras: recebem o estado e as regras, devolvem um estado novo ou um
 * cálculo. Nada aqui lê a tela, o relógio ou o armazenamento. Por isso o mesmo
 * arquivo roda no navegador e nos testes (node --test, na pasta do app).
 *
 * Ideias centrais:
 *  - Ponto nasce de contratação concluída e confirmada por quem contratou.
 *  - A resposta "contrataria de novo?" nunca muda os pontos de ninguém.
 *  - Cada cliente novo conta uma vez por prestador (recontratação não pontua).
 *  - Ninguém pontua com a própria empresa nem com a própria indicação.
 *  - Ponto fica "em análise" até a curadoria conferir.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Motor = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIA = 24 * 60 * 60 * 1000;

  function porId(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  function clonar(estado) {
    return JSON.parse(JSON.stringify(estado));
  }

  function ms(data) {
    return new Date(data).getTime();
  }

  function semAcento(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function normalizarArroba(arroba) {
    return String(arroba || '')
      .trim()
      .replace(/^@+/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/[/?#].*$/, '')
      .toLowerCase();
  }

  function estadoVazio() {
    return {
      versao: 6,
      membros: [],
      prestadores: [],
      indicacoes: [],
      confirmacoes: [],
      recompensas: [],
      resgates: [],
      publicacoes: [],
      seguindo: [],
    };
  }

  // ---------------------------------------------------------------- consultas

  function indicacoesDoPrestador(estado, prestadorId) {
    return estado.indicacoes
      .filter(function (i) {
        return i.prestadorId === prestadorId;
      })
      .sort(function (a, b) {
        return ms(a.data) - ms(b.data);
      });
  }

  function servicoDe(prestador, servicoId) {
    return prestador ? porId(prestador.servicos || [], servicoId) : null;
  }

  // Quem recebe os pontos de indicação desta contratação.
  // "pessoa": quem o cliente apontou. "busca": quem trouxe o prestador para a
  // comunidade (a indicação mais antiga feita por outra pessoa).
  function indicadorCreditado(estado, conf) {
    var prestador = porId(estado.prestadores, conf.prestadorId);
    if (!prestador) return null;
    var id = null;
    if (conf.origem === 'pessoa') {
      id = conf.indicadorId || null;
    } else {
      var anteriores = indicacoesDoPrestador(estado, conf.prestadorId).filter(function (i) {
        return ms(i.data) <= ms(conf.data) && i.membroId !== conf.clienteId && i.membroId !== prestador.donoId;
      });
      id = anteriores.length ? anteriores[0].membroId : null;
    }
    if (!id || id === conf.clienteId || id === prestador.donoId) return null;
    return id;
  }

  function contaComoContratacao(conf) {
    return conf.status !== 'recusada' && conf.concluido === true;
  }

  // Cada cliente novo conta uma vez por prestador.
  function ehPrimeiraContratacao(estado, conf) {
    var posicao = estado.confirmacoes.indexOf(conf);
    for (var i = 0; i < estado.confirmacoes.length; i++) {
      var outra = estado.confirmacoes[i];
      if (outra === conf || outra.id === conf.id) continue;
      if (outra.prestadorId !== conf.prestadorId || outra.clienteId !== conf.clienteId) continue;
      if (!contaComoContratacao(outra)) continue;
      var antes = ms(outra.data) < ms(conf.data) || (ms(outra.data) === ms(conf.data) && (posicao === -1 || i < posicao));
      if (antes) return false;
    }
    return true;
  }

  // Pontos que esta contratação gera, sem olhar se a curadoria já conferiu.
  // "contratariaDeNovo" não entra na conta, de propósito.
  function pontosDaConfirmacao(estado, regras, conf) {
    var prestador = porId(estado.prestadores, conf.prestadorId);
    var servico = servicoDe(prestador, conf.servicoId);
    var resultado = {
      premium: !!(servico && servico.premium),
      indicadorId: null,
      pontosIndicador: 0,
      donoId: prestador ? prestador.donoId || null : null,
      pontosPrestador: 0,
      motivoSemPontos: null,
    };
    if (!prestador || !servico) {
      resultado.motivoSemPontos = 'dados_incompletos';
      return resultado;
    }
    if (conf.concluido !== true) {
      resultado.motivoSemPontos = 'nao_concluido';
      return resultado;
    }
    if (!ehPrimeiraContratacao(estado, conf)) {
      resultado.motivoSemPontos = 'recontratacao';
      return resultado;
    }
    var faixa = resultado.premium ? 'premium' : 'padrao';
    resultado.indicadorId = indicadorCreditado(estado, conf);
    if (resultado.indicadorId) resultado.pontosIndicador = regras.pontos.indicador[faixa];
    if (resultado.donoId && resultado.donoId !== conf.clienteId) resultado.pontosPrestador = regras.pontos.prestador[faixa];
    return resultado;
  }

  function situacaoDosPontos(conf) {
    if (conf.status === 'aprovada') return 'disponivel';
    if (conf.status === 'recusada') return 'recusado';
    return 'em_analise';
  }

  // Extrato de um membro: o que entrou (como quem indicou e como prestador) e
  // o que saiu (trocas). Mais recente primeiro.
  function lancamentos(estado, regras, membroId) {
    var lista = [];
    estado.confirmacoes.forEach(function (conf) {
      var p = pontosDaConfirmacao(estado, regras, conf);
      var situacao = situacaoDosPontos(conf);
      if (p.indicadorId === membroId && p.pontosIndicador > 0) {
        lista.push({
          id: conf.id + ':indicador',
          papel: 'indicador',
          pontos: p.pontosIndicador,
          situacao: situacao,
          data: conf.data,
          confirmacaoId: conf.id,
          premium: p.premium,
        });
      }
      if (p.donoId === membroId && p.pontosPrestador > 0) {
        lista.push({
          id: conf.id + ':prestador',
          papel: 'prestador',
          pontos: p.pontosPrestador,
          situacao: situacao,
          data: conf.data,
          confirmacaoId: conf.id,
          premium: p.premium,
        });
      }
    });
    estado.resgates.forEach(function (r) {
      if (r.membroId !== membroId) return;
      lista.push({
        id: r.id + ':troca',
        papel: 'troca',
        pontos: -r.custo,
        situacao: r.status === 'cancelado' || r.status === 'usado' || r.status === 'vencido' ? r.status : 'emitido',
        data: r.data,
        resgateId: r.id,
      });
    });
    return lista.sort(function (a, b) {
      return ms(b.data) - ms(a.data);
    });
  }

  function saldo(estado, regras, membroId) {
    var s = { disponivel: 0, emAnalise: 0, ganho: 0, trocado: 0 };
    lancamentos(estado, regras, membroId).forEach(function (l) {
      if (l.papel === 'troca') {
        // Troca cancelada ou vale vencido: os pontos voltaram.
        if (l.situacao !== 'cancelado' && l.situacao !== 'vencido') {
          s.disponivel += l.pontos;
          s.trocado += -l.pontos;
        }
      } else if (l.situacao === 'disponivel') {
        s.disponivel += l.pontos;
        s.ganho += l.pontos;
      } else if (l.situacao === 'em_analise') {
        s.emAnalise += l.pontos;
      }
    });
    return s;
  }

  function resumoPrestador(estado, regras, prestadorId) {
    var confirmadas = estado.confirmacoes.filter(function (c) {
      return c.prestadorId === prestadorId && c.status === 'aprovada' && c.concluido === true;
    });
    var contratariam = confirmadas.filter(function (c) {
      return c.contratariaDeNovo === true;
    }).length;
    var vistos = {};
    var indicadores = [];
    indicacoesDoPrestador(estado, prestadorId).forEach(function (i) {
      if (!vistos[i.membroId]) {
        vistos[i.membroId] = true;
        indicadores.push(i.membroId);
      }
    });
    var ultima = confirmadas.reduce(function (maior, c) {
      return !maior || ms(c.data) > ms(maior) ? c.data : maior;
    }, null);
    var minimo = regras.observacao;
    // "Funciona bem para": o que a curadoria escreveu; se ainda não escreveu,
    // as necessidades citadas por quem indicou.
    var prestador = porId(estado.prestadores, prestadorId);
    var funcionaPara = prestador && prestador.funcionaPara && prestador.funcionaPara.length ? prestador.funcionaPara.slice() : [];
    if (!funcionaPara.length) {
      indicacoesDoPrestador(estado, prestadorId).forEach(function (i) {
        var texto = String(i.paraQue || '').trim();
        var repetido = funcionaPara.some(function (f) {
          return semAcento(f) === semAcento(texto);
        });
        if (texto && !repetido) funcionaPara.push(texto);
      });
    }
    return {
      contratacoes: confirmadas.length,
      contratariam: contratariam,
      indicadores: indicadores,
      funcionaPara: funcionaPara,
      ultimaContratacao: ultima,
      relatos: confirmadas
        .filter(function (c) {
          return c.comentario && c.comentario.trim();
        })
        .sort(function (a, b) {
          return ms(b.data) - ms(a.data);
        }),
      emObservacao: confirmadas.length >= minimo.minimoDeContratacoes && contratariam / confirmadas.length < minimo.minimoDeRecontratacao,
    };
  }

  // Palavras que não ajudam a achar ninguém ("preciso de um contador" = "contador").
  var PALAVRAS_VAZIAS = (
    'a o as os um uma uns umas de da do das dos em no na nos nas por para pra com sem que e ou se me ' +
    'meu minha meus minhas nosso nossa nossos nossas preciso precisa precisamos quero queria queremos ' +
    'tenho temos estou esta estamos busco procuro procurando gostaria alguem algum alguma como mais muito ja ainda'
  ).split(' ');

  function palavrasDaBusca(texto) {
    return semAcento(texto)
      .split(/[^a-z0-9]+/)
      .filter(function (p) {
        return p && PALAVRAS_VAZIAS.indexOf(p) === -1;
      })
      .map(function (p) {
        return p.length > 4 ? p.replace(/(es|s)$/, '') : p; // plural simples
      });
  }

  function textoDeBusca(estado, p) {
    return semAcento(
      [p.nome, p.setor, p.resumo, p.cidade, p.palavras]
        .concat(
          (p.servicos || []).map(function (s) {
            return s.nome;
          })
        )
        .concat(p.funcionaPara || [])
        .concat(
          indicacoesDoPrestador(estado, p.id).map(function (i) {
            return i.paraQue;
          })
        )
        .join(' ')
    )
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  // Busca por necessidade ou por situação ("preciso reorganizar a minha marca").
  // Uma ou duas palavras: todas precisam bater. Frase: basta a maior parte.
  // A ordem é quem bateu mais com a busca e, depois, a contratação confirmada
  // mais recente. Nunca os pontos: a lista não é um ranking.
  function buscar(estado, regras, filtro) {
    filtro = filtro || {};
    var palavras = palavrasDaBusca(filtro.texto);
    var minimo = palavras.length <= 2 ? palavras.length : Math.ceil(palavras.length * 0.6);
    var achados = [];
    estado.prestadores.forEach(function (p) {
      if (p.status !== 'ativo') return;
      if (filtro.setor && p.setor !== filtro.setor) return;
      if (
        filtro.soPremium &&
        !(p.servicos || []).some(function (s) {
          return s.premium;
        })
      )
        return;
      var acertos = 0;
      if (palavras.length) {
        var alvo = textoDeBusca(estado, p);
        palavras.forEach(function (palavra) {
          var bateu = alvo.some(function (w) {
            return palavra.length < 3 ? w === palavra : w.indexOf(palavra) === 0;
          });
          if (bateu) acertos += 1;
        });
        if (acertos < minimo) return;
      }
      achados.push({ prestador: p, resumo: resumoPrestador(estado, regras, p.id), acertos: acertos });
    });
    return achados.sort(function (a, b) {
      if (b.acertos !== a.acertos) return b.acertos - a.acertos;
      var da = a.resumo.ultimaContratacao ? ms(a.resumo.ultimaContratacao) : 0;
      var db = b.resumo.ultimaContratacao ? ms(b.resumo.ultimaContratacao) : 0;
      if (db !== da) return db - da;
      return a.prestador.nome.localeCompare(b.prestador.nome, 'pt-BR');
    });
  }

  function ehCuradoria(estado, membroId) {
    var m = porId(estado.membros, membroId);
    return !!m && m.papel === 'curadoria';
  }

  // ---------------------------------------------------------------- reputação
  // Duas reputações, calculadas do mesmo jeito mas sobre coisas diferentes:
  //  - do serviço: as experiências de quem contratou aquele prestador;
  //  - das indicações: as experiências das contratações que vieram das
  //    indicações de uma pessoa. Quantidade não entra na conta.
  // Nenhuma das duas mexe nos pontos, e os pontos não mexem nelas.

  function valorDaResposta(regras, id) {
    var respostas = regras.reputacao.respostas;
    for (var i = 0; i < respostas.length; i++) if (respostas[i].id === id) return respostas[i].valor;
    return null;
  }

  // Nota de 0 a 100 de uma experiência, pelos pesos dos critérios.
  function notaDaExperiencia(regras, conf) {
    var criterios = regras.reputacao.criterios;
    var soma = 0;
    var pesos = 0;
    for (var i = 0; i < criterios.length; i++) {
      var valor = valorDaResposta(regras, (conf.criterios || {})[criterios[i].id]);
      if (valor === null) return null;
      soma += valor * criterios[i].peso;
      pesos += criterios[i].peso;
    }
    return pesos ? soma / pesos : null;
  }

  function faixaDe(faixas, nota) {
    var ordenadas = faixas.slice().sort(function (a, b) {
      return b.minimo - a.minimo;
    });
    for (var i = 0; i < ordenadas.length; i++) if (nota >= ordenadas[i].minimo) return ordenadas[i];
    return ordenadas[ordenadas.length - 1];
  }

  function notaAjustada(regras, notas) {
    var partida = regras.reputacao.pontoDePartida;
    var soma = notas.reduce(function (total, n) {
      return total + n;
    }, 0);
    return Math.round((soma + partida.valor * partida.peso) / (notas.length + partida.peso));
  }

  function experienciasConfirmadas(estado, regras, filtro) {
    return estado.confirmacoes.filter(function (c) {
      return c.status === 'aprovada' && c.concluido === true && notaDaExperiencia(regras, c) !== null && filtro(c);
    });
  }

  function leiturasPorCriterio(regras, lista) {
    var r = regras.reputacao;
    return r.criterios.map(function (criterio) {
      var media =
        lista.reduce(function (total, c) {
          return total + valorDaResposta(regras, c.criterios[criterio.id]);
        }, 0) / lista.length;
      return { id: criterio.id, nome: criterio.nome, media: Math.round(media), leitura: faixaDe(r.leituras, media).texto };
    });
  }

  function reputacaoDoServico(estado, regras, prestadorId) {
    var r = regras.reputacao;
    var lista = experienciasConfirmadas(estado, regras, function (c) {
      return c.prestadorId === prestadorId;
    });
    var notas = lista.map(function (c) {
      return notaDaExperiencia(regras, c);
    });
    var formada = lista.length >= r.minimoParaAparecer;
    var nota = formada ? notaAjustada(regras, notas) : null;
    return {
      experiencias: lista.length,
      minimo: r.minimoParaAparecer,
      faltam: Math.max(0, r.minimoParaAparecer - lista.length),
      formada: formada,
      nota: nota,
      faixa: formada ? faixaDe(r.faixasDoServico, nota).nome : null,
      criterios: formada ? leiturasPorCriterio(regras, lista) : [],
    };
  }

  function qualidadeDasIndicacoes(estado, regras, membroId) {
    var r = regras.reputacao;
    var lista = experienciasConfirmadas(estado, regras, function (c) {
      return indicadorCreditado(estado, c) === membroId;
    });
    var prestadores = {};
    lista.forEach(function (c) {
      prestadores[c.prestadorId] = true;
    });
    var formada = lista.length >= r.minimoParaAparecer;
    var nota = formada
      ? notaAjustada(
          regras,
          lista.map(function (c) {
            return notaDaExperiencia(regras, c);
          })
        )
      : null;
    return {
      contratacoes: lista.length,
      prestadores: Object.keys(prestadores).length,
      minimo: r.minimoParaAparecer,
      faltam: Math.max(0, r.minimoParaAparecer - lista.length),
      formada: formada,
      nota: nota,
      faixa: formada ? faixaDe(r.faixasDasIndicacoes, nota).nome : null,
    };
  }

  // O que os membros veem. Faixa abaixo do mínimo público nunca aparece: o
  // prestador é pausado antes (ver decidirConfirmacao). Se a curadoria o
  // devolver à busca mesmo assim, ele aparece como "em acompanhamento", sem
  // faixa, sem número e sem critérios.
  function reputacaoPublica(estado, regras, prestadorId) {
    var rep = reputacaoDoServico(estado, regras, prestadorId);
    if (!rep.formada || rep.nota >= regras.reputacao.minimoPublico) return rep;
    return {
      experiencias: rep.experiencias,
      minimo: rep.minimo,
      faltam: 0,
      formada: false,
      emAcompanhamento: true,
      nota: null,
      faixa: null,
      criterios: [],
    };
  }

  // Para os outros membros, a qualidade das indicações de alguém só aparece
  // quando está formada e não é uma faixa ruim. A própria pessoa e a curadoria
  // veem sempre (qualidadeDasIndicacoes).
  // "Em formação" e "faixa baixa" saem daqui idênticas e sem contagem: se a
  // contagem aparecesse, três ou mais contratações sem faixa entregariam que
  // a faixa é baixa.
  function qualidadePublica(estado, regras, membroId) {
    var q = qualidadeDasIndicacoes(estado, regras, membroId);
    if (q.formada && q.nota >= regras.reputacao.minimoPublico) return q;
    return { formada: false, semFaixaPublica: true, nota: null, faixa: null };
  }

  // O que pesou na qualidade das indicações de uma pessoa, por critério.
  // Só para a própria pessoa e a curadoria; vazio enquanto não está formada.
  function criteriosDasIndicacoes(estado, regras, membroId) {
    var lista = experienciasConfirmadas(estado, regras, function (c) {
      return indicadorCreditado(estado, c) === membroId;
    });
    return lista.length >= regras.reputacao.minimoParaAparecer ? leiturasPorCriterio(regras, lista) : [];
  }

  // Membros com a qualidade das indicações formada e abaixo do mínimo público.
  // A curadoria procura cada um para conversar; os outros membros não veem.
  function membrosParaConversar(estado, regras) {
    var lista = [];
    estado.membros.forEach(function (m) {
      var q = qualidadeDasIndicacoes(estado, regras, m.id);
      if (q.formada && q.nota < regras.reputacao.minimoPublico) {
        lista.push({ membroId: m.id, nota: q.nota, faixa: q.faixa, contratacoes: q.contratacoes, criterios: criteriosDasIndicacoes(estado, regras, m.id) });
      }
    });
    return lista.sort(function (a, b) {
      return a.nota - b.nota;
    });
  }

  // O que acontece com o prestador se a curadoria aprovar este relato.
  function previsaoDeAprovacao(estado, regras, confId) {
    var conf = porId(estado.confirmacoes, confId);
    if (!conf || conf.status !== 'em_analise') return { pausaria: false, nota: null, faixa: null };
    var hipotese = clonar(estado);
    porId(hipotese.confirmacoes, confId).status = 'aprovada';
    var rep = reputacaoDoServico(hipotese, regras, conf.prestadorId);
    var prestador = porId(estado.prestadores, conf.prestadorId);
    return {
      pausaria: !!prestador && prestador.status === 'ativo' && !prestador.liberadoPelaCuradoria && rep.formada && rep.nota < regras.reputacao.minimoPublico,
      nota: rep.nota,
      faixa: rep.faixa,
    };
  }

  // Avisos só para a curadoria. Não bloqueiam nada: pedem um segundo olhar.
  function sinaisParaCuradoria(estado, regras, conf) {
    var sinais = [];
    var prestador = porId(estado.prestadores, conf.prestadorId);
    if (!prestador) return sinais;
    var cruzada = estado.confirmacoes.some(function (outra) {
      if (outra.id === conf.id || outra.status === 'recusada') return false;
      var outroPrestador = porId(estado.prestadores, outra.prestadorId);
      return !!prestador.donoId && outra.clienteId === prestador.donoId && !!outroPrestador && outroPrestador.donoId === conf.clienteId;
    });
    if (cruzada) sinais.push('contratacao_cruzada');

    var indicador = indicadorCreditado(estado, conf);
    if (indicador) {
      var janela = regras.concentracao.dias * DIA;
      var mesmaDupla = estado.confirmacoes.filter(function (outra) {
        return (
          outra.status !== 'recusada' &&
          outra.prestadorId === conf.prestadorId &&
          indicadorCreditado(estado, outra) === indicador &&
          Math.abs(ms(conf.data) - ms(outra.data)) <= janela
        );
      }).length;
      if (mesmaDupla >= regras.concentracao.quantidade) sinais.push('concentracao');

      var indicacao = indicacoesDoPrestador(estado, conf.prestadorId).filter(function (i) {
        return i.membroId === indicador;
      })[0];
      if (indicacao && ms(conf.data) - ms(indicacao.data) < DIA) sinais.push('indicacao_no_mesmo_dia');
    }
    return sinais;
  }

  // ------------------------------------------------------------- contratações

  function validarConfirmacao(estado, regras, nova) {
    var erros = [];
    var prestador = porId(estado.prestadores, nova.prestadorId);
    if (!prestador || (prestador.status !== 'ativo' && prestador.status !== 'pausado')) {
      erros.push({ campo: 'prestador', mensagem: 'Este prestador não está ativo na comunidade.' });
      return erros;
    }
    if (!porId(estado.membros, nova.clienteId)) {
      erros.push({ campo: 'cliente', mensagem: 'Entre com o seu perfil para contar como foi.' });
      return erros;
    }
    if (!servicoDe(prestador, nova.servicoId)) erros.push({ campo: 'servico', mensagem: 'Escolha o serviço que você contratou.' });
    if (prestador.donoId && prestador.donoId === nova.clienteId) {
      erros.push({ campo: 'cliente', mensagem: 'Você não pode relatar um serviço da sua própria empresa.' });
    }
    if (nova.concluido !== true) {
      erros.push({ campo: 'concluido', mensagem: 'Só serviço concluído entra na conta. Volte quando ele terminar.' });
    }
    if (nova.origem !== 'pessoa' && nova.origem !== 'busca') {
      erros.push({ campo: 'origem', mensagem: 'Conte como você chegou a este prestador.' });
    } else if (nova.origem === 'pessoa') {
      if (!nova.indicadorId) {
        erros.push({ campo: 'origem', mensagem: 'Escolha quem indicou.' });
      } else if (nova.indicadorId === nova.clienteId) {
        erros.push({ campo: 'origem', mensagem: 'Você não pode ser a sua própria indicação.' });
      } else {
        var indicou = indicacoesDoPrestador(estado, nova.prestadorId).some(function (i) {
          return i.membroId === nova.indicadorId && ms(i.data) <= ms(nova.data);
        });
        if (!indicou) erros.push({ campo: 'origem', mensagem: 'Essa pessoa não indicou este prestador antes da sua contratação.' });
      }
    }
    var semResposta = regras.reputacao.criterios.filter(function (criterio) {
      return valorDaResposta(regras, (nova.criterios || {})[criterio.id]) === null;
    });
    if (semResposta.length) {
      erros.push({
        campo: 'criterios',
        mensagem:
          'Diga como foi: ' +
          semResposta
            .map(function (criterio) {
              return criterio.nome.toLowerCase();
            })
            .join(', ') +
          '.',
      });
    }
    if (typeof nova.contratariaDeNovo !== 'boolean') {
      erros.push({ campo: 'contratariaDeNovo', mensagem: 'Responda se você contrataria de novo.' });
    }
    var repetida = estado.confirmacoes.some(function (c) {
      return c.status === 'em_analise' && c.clienteId === nova.clienteId && c.prestadorId === nova.prestadorId && c.servicoId === nova.servicoId;
    });
    if (repetida) erros.push({ campo: 'servico', mensagem: 'Você já tem um relato deste serviço em análise.' });
    return erros;
  }

  function registrarConfirmacao(estado, regras, nova) {
    var erros = validarConfirmacao(estado, regras, nova);
    if (erros.length) return { estado: estado, erros: erros, confirmacao: null };
    var novo = clonar(estado);
    var conf = {
      id: nova.id,
      prestadorId: nova.prestadorId,
      servicoId: nova.servicoId,
      clienteId: nova.clienteId,
      origem: nova.origem,
      indicadorId: nova.origem === 'pessoa' ? nova.indicadorId : null,
      concluido: true,
      criterios: regras.reputacao.criterios.reduce(function (guardado, criterio) {
        guardado[criterio.id] = nova.criterios[criterio.id];
        return guardado;
      }, {}),
      contratariaDeNovo: nova.contratariaDeNovo,
      comentario: String(nova.comentario || '').trim(),
      mostrarNome: nova.mostrarNome !== false,
      data: nova.data,
      status: 'em_analise',
      motivoRecusa: '',
    };
    novo.confirmacoes.push(conf);
    return { estado: novo, erros: [], confirmacao: conf };
  }

  // Aprovar um relato pode pausar o prestador: se a reputação formada cair
  // abaixo do mínimo público, ele sai da busca na mesma hora e fica esperando
  // a decisão da curadoria. Assim a faixa ruim nunca chega a aparecer.
  function decidirConfirmacao(estado, regras, id, decisao, motivo, agora) {
    var atual = porId(estado.confirmacoes, id);
    if (!atual) return { estado: estado, erros: [{ campo: 'id', mensagem: 'Relato não encontrado.' }], pausou: null };
    if (atual.status !== 'em_analise') return { estado: estado, erros: [{ campo: 'id', mensagem: 'Este relato já foi conferido.' }], pausou: null };
    if (decisao !== 'aprovada' && decisao !== 'recusada') return { estado: estado, erros: [{ campo: 'decisao', mensagem: 'Decisão inválida.' }], pausou: null };
    if (decisao === 'recusada' && !String(motivo || '').trim()) {
      return { estado: estado, erros: [{ campo: 'motivo', mensagem: 'Escreva o motivo da recusa: quem indicou e o prestador vão ler.' }], pausou: null };
    }
    var pausaria = decisao === 'aprovada' && previsaoDeAprovacao(estado, regras, id).pausaria;
    var novo = clonar(estado);
    var conf = porId(novo.confirmacoes, id);
    conf.status = decisao;
    conf.motivoRecusa = decisao === 'recusada' ? String(motivo).trim() : '';
    var pausou = null;
    var prestador = porId(novo.prestadores, conf.prestadorId);
    if (pausaria) {
      prestador.status = 'pausado';
      prestador.pausadoEm = agora || conf.data;
      pausou = prestador.id;
    } else if (decisao === 'aprovada' && prestador && prestador.liberadoPelaCuradoria) {
      // Quem voltou "em acompanhamento" e recuperou a nota deixa de estar
      // liberado: se a nota cair de novo, a curadoria revisa de novo.
      var rep = reputacaoDoServico(novo, regras, prestador.id);
      if (rep.formada && rep.nota >= regras.reputacao.minimoPublico) prestador.liberadoPelaCuradoria = false;
    }
    return { estado: novo, erros: [], pausou: pausou };
  }

  // Prestador pausado: a curadoria devolve à busca (ele passa a aparecer como
  // "em acompanhamento" enquanto a nota não subir) ou retira da comunidade.
  function decidirPausa(estado, id, decisao) {
    var atual = porId(estado.prestadores, id);
    if (!atual || atual.status !== 'pausado') return { estado: estado, erros: [{ campo: 'id', mensagem: 'Este prestador não está pausado.' }] };
    if (decisao !== 'voltar' && decisao !== 'retirar') return { estado: estado, erros: [{ campo: 'decisao', mensagem: 'Decisão inválida.' }] };
    var novo = clonar(estado);
    var prestador = porId(novo.prestadores, id);
    if (decisao === 'voltar') {
      prestador.status = 'ativo';
      prestador.liberadoPelaCuradoria = true;
    } else {
      prestador.status = 'recusado';
    }
    return { estado: novo, erros: [] };
  }

  // --------------------------------------------------------------- indicações

  function validarIndicacao(estado, regras, ind) {
    var erros = [];
    if (!porId(estado.membros, ind.membroId)) {
      erros.push({ campo: 'membro', mensagem: 'Entre com o seu perfil para indicar.' });
      return erros;
    }
    if (ind.prestadorId) {
      var prestador = porId(estado.prestadores, ind.prestadorId);
      if (!prestador || prestador.status === 'recusado') {
        erros.push({ campo: 'prestador', mensagem: 'Escolha um prestador da lista.' });
      } else if (prestador.status === 'pausado') {
        erros.push({ campo: 'prestador', mensagem: 'Este prestador está em revisão pela curadoria e não recebe indicações agora.' });
      } else {
        if (prestador.donoId === ind.membroId) erros.push({ campo: 'prestador', mensagem: 'Você não pode indicar a sua própria empresa.' });
        var jaIndicou = estado.indicacoes.some(function (i) {
          return i.prestadorId === ind.prestadorId && i.membroId === ind.membroId;
        });
        if (jaIndicou) erros.push({ campo: 'prestador', mensagem: 'Você já indicou este prestador.' });
      }
    } else {
      var n = ind.novoPrestador || {};
      if (!String(n.nome || '').trim()) erros.push({ campo: 'nome', mensagem: 'Escreva o nome da empresa ou do profissional.' });
      if (regras.setores.indexOf(n.setor) === -1) erros.push({ campo: 'setor', mensagem: 'Escolha o setor.' });
      if (!String(n.servico || '').trim()) erros.push({ campo: 'servico', mensagem: 'Escreva o serviço que você contratou.' });
      var arroba = normalizarArroba(n.arroba);
      if (arroba && !/^[a-z0-9._]{1,30}$/.test(arroba)) erros.push({ campo: 'arroba', mensagem: 'Confira o @ do Instagram: só letras, números, ponto e sublinhado.' });
      var repetido = estado.prestadores.some(function (p) {
        if (p.status === 'recusado') return false;
        return (arroba && normalizarArroba(p.arroba) === arroba) || (n.nome && semAcento(p.nome) === semAcento(n.nome));
      });
      if (repetido) erros.push({ campo: 'nome', mensagem: 'Esse prestador já está na comunidade. Escolha-o na lista.' });
    }
    if (regras.indicarExigeTerContratado && ind.jaContratei !== true) {
      erros.push({ campo: 'jaContratei', mensagem: 'Só indica quem já contratou. Confirme que você contratou este prestador.' });
    }
    if (String(ind.paraQue || '').trim().length < 5) {
      erros.push({ campo: 'paraQue', mensagem: 'Diga para que tipo de necessidade você indica.' });
    }
    if (String(ind.texto || '').trim().length < regras.minimoDeTextoNaIndicacao) {
      erros.push({ campo: 'texto', mensagem: 'Conte em uma ou duas frases o que você contratou e por que indica.' });
    }
    return erros;
  }

  // ind.ids = { indicacao, prestador, servico }: gerados por quem chama.
  function registrarIndicacao(estado, regras, ind) {
    var erros = validarIndicacao(estado, regras, ind);
    if (erros.length) return { estado: estado, erros: erros, indicacao: null, prestador: null };
    var novo = clonar(estado);
    var prestadorId = ind.prestadorId;
    var criado = null;
    if (!prestadorId) {
      var n = ind.novoPrestador;
      criado = {
        id: ind.ids.prestador,
        nome: String(n.nome).trim(),
        setor: n.setor,
        cidade: String(n.cidade || '').trim(),
        resumo: '',
        arroba: normalizarArroba(n.arroba),
        donoId: null,
        status: 'em_analise',
        criadoEm: ind.data,
        servicos: [{ id: ind.ids.servico, nome: String(n.servico).trim(), premium: false }],
        funcionaPara: [],
        palavras: '',
      };
      novo.prestadores.push(criado);
      prestadorId = criado.id;
    }
    var indicacao = { id: ind.ids.indicacao, prestadorId: prestadorId, membroId: ind.membroId, paraQue: String(ind.paraQue).trim(), texto: String(ind.texto).trim(), data: ind.data };
    novo.indicacoes.push(indicacao);
    return { estado: novo, erros: [], indicacao: indicacao, prestador: criado || porId(novo.prestadores, prestadorId) };
  }

  // Prestador novo só aparece na busca depois de a curadoria falar com ele e
  // ele aceitar o convite: "ativo" aqui quer dizer convite aceito.
  function decidirPrestador(estado, id, decisao, agora) {
    var atual = porId(estado.prestadores, id);
    if (!atual || atual.status !== 'em_analise') return { estado: estado, erros: [{ campo: 'id', mensagem: 'Este prestador não está em análise.' }] };
    if (decisao !== 'ativo' && decisao !== 'recusado') return { estado: estado, erros: [{ campo: 'decisao', mensagem: 'Decisão inválida.' }] };
    var novo = clonar(estado);
    var prestador = porId(novo.prestadores, id);
    prestador.status = decisao;
    if (decisao === 'ativo') prestador.conviteAceitoEm = agora || null;
    return { estado: novo, erros: [] };
  }

  // ------------------------------------------------------------------ seguir
  // Cada pessoa escolhe quem segue: pessoas e empresas. Seguir não rende ponto
  // e não muda a ordem da busca.

  function segue(estado, membroId, tipo, alvoId) {
    return estado.seguindo.some(function (s) {
      return s.membroId === membroId && s.tipo === tipo && s.alvoId === alvoId;
    });
  }

  function validarSeguir(estado, pedido) {
    var erros = [];
    if (!porId(estado.membros, pedido.membroId)) {
      erros.push({ campo: 'membro', mensagem: 'Entre com o seu perfil para seguir.' });
      return erros;
    }
    if (pedido.tipo === 'membro') {
      var pessoa = porId(estado.membros, pedido.alvoId);
      if (!pessoa) erros.push({ campo: 'alvo', mensagem: 'Pessoa não encontrada.' });
      else if (pessoa.id === pedido.membroId) erros.push({ campo: 'alvo', mensagem: 'Este é o seu próprio perfil.' });
      else if (pessoa.papel === 'curadoria') erros.push({ campo: 'alvo', mensagem: 'A curadoria não é um perfil para seguir.' });
    } else if (pedido.tipo === 'prestador') {
      var empresa = porId(estado.prestadores, pedido.alvoId);
      if (!empresa || empresa.status !== 'ativo') erros.push({ campo: 'alvo', mensagem: 'Esta empresa não está disponível para seguir agora.' });
      else if (empresa.donoId === pedido.membroId) erros.push({ campo: 'alvo', mensagem: 'Esta é a sua empresa.' });
    } else {
      erros.push({ campo: 'tipo', mensagem: 'Escolha uma pessoa ou uma empresa.' });
    }
    if (!erros.length && segue(estado, pedido.membroId, pedido.tipo, pedido.alvoId)) {
      erros.push({ campo: 'alvo', mensagem: 'Você já segue.' });
    }
    return erros;
  }

  // pedido = { membroId, tipo: 'membro' | 'prestador', alvoId, data }
  function seguir(estado, pedido) {
    var erros = validarSeguir(estado, pedido);
    if (erros.length) return { estado: estado, erros: erros };
    var novo = clonar(estado);
    novo.seguindo.push({ membroId: pedido.membroId, tipo: pedido.tipo, alvoId: pedido.alvoId, data: pedido.data });
    return { estado: novo, erros: [] };
  }

  function deixarDeSeguir(estado, membroId, tipo, alvoId) {
    if (!segue(estado, membroId, tipo, alvoId)) return { estado: estado, erros: [{ campo: 'alvo', mensagem: 'Você não segue.' }] };
    var novo = clonar(estado);
    novo.seguindo = novo.seguindo.filter(function (s) {
      return !(s.membroId === membroId && s.tipo === tipo && s.alvoId === alvoId);
    });
    return { estado: novo, erros: [] };
  }

  // Quem a pessoa segue, do que começou a seguir há menos tempo para o mais antigo.
  function seguidos(estado, membroId) {
    var lista = estado.seguindo
      .filter(function (s) {
        return s.membroId === membroId;
      })
      .sort(function (a, b) {
        return ms(b.data) - ms(a.data);
      });
    var ids = function (tipo) {
      return lista
        .filter(function (s) {
          return s.tipo === tipo;
        })
        .map(function (s) {
          return s.alvoId;
        });
    };
    return { membros: ids('membro'), prestadores: ids('prestador') };
  }

  // -------------------------------------------------------------- publicações
  // Conteúdo de empresa. Quem publica é quem responde pela empresa, e nada
  // aparece antes de a curadoria conferir. Publicar não rende ponto.

  function validarPublicacao(estado, regras, pub) {
    var erros = [];
    var empresa = porId(estado.prestadores, pub.prestadorId);
    if (!empresa || empresa.status === 'recusado' || empresa.status === 'em_analise') {
      erros.push({ campo: 'empresa', mensagem: 'Esta empresa não está publicada na rede.' });
      return erros;
    }
    if (!empresa.donoId || empresa.donoId !== pub.autorId) {
      erros.push({ campo: 'empresa', mensagem: 'Só quem responde pela empresa publica em nome dela.' });
      return erros;
    }
    if (empresa.status === 'pausado') {
      erros.push({ campo: 'empresa', mensagem: 'A empresa está em revisão pela curadoria e não publica agora.' });
      return erros;
    }
    var texto = String(pub.texto || '').trim();
    if (texto.length < regras.publicacao.minimo) {
      erros.push({ campo: 'texto', mensagem: 'Escreva pelo menos ' + regras.publicacao.minimo + ' caracteres.' });
    } else if (texto.length > regras.publicacao.maximo) {
      erros.push({ campo: 'texto', mensagem: 'O texto passa de ' + regras.publicacao.maximo + ' caracteres.' });
    }
    return erros;
  }

  // pub = { id, prestadorId, autorId, texto, data }
  function publicar(estado, regras, pub) {
    var erros = validarPublicacao(estado, regras, pub);
    if (erros.length) return { estado: estado, erros: erros, publicacao: null };
    var novo = clonar(estado);
    var direto = !regras.publicacao.curadoriaConfereAntes;
    var publicacao = {
      id: pub.id,
      prestadorId: pub.prestadorId,
      autorId: pub.autorId,
      texto: String(pub.texto).trim(),
      data: pub.data,
      status: direto ? 'publicada' : 'em_analise',
      publicadaEm: direto ? pub.data : null,
      motivo: '',
    };
    novo.publicacoes.push(publicacao);
    return { estado: novo, erros: [], publicacao: publicacao };
  }

  // A curadoria aprova ou recusa uma publicação em análise. Recusa pede motivo.
  function decidirPublicacao(estado, id, decisao, motivo, agora) {
    var atual = porId(estado.publicacoes, id);
    if (!atual) return { estado: estado, erros: [{ campo: 'id', mensagem: 'Publicação não encontrada.' }] };
    if (atual.status !== 'em_analise') return { estado: estado, erros: [{ campo: 'id', mensagem: 'Esta publicação já foi conferida.' }] };
    if (decisao !== 'publicada' && decisao !== 'recusada') return { estado: estado, erros: [{ campo: 'decisao', mensagem: 'Decisão inválida.' }] };
    if (decisao === 'recusada' && !String(motivo || '').trim()) {
      return { estado: estado, erros: [{ campo: 'motivo', mensagem: 'Escreva o motivo da recusa: a empresa vai ler.' }] };
    }
    var novo = clonar(estado);
    var pub = porId(novo.publicacoes, id);
    pub.status = decisao;
    pub.motivo = decisao === 'recusada' ? String(motivo).trim() : '';
    pub.publicadaEm = decisao === 'publicada' ? agora || pub.data : null;
    return { estado: novo, erros: [] };
  }

  // A curadoria tira do ar uma publicação que já tinha sido aprovada.
  function retirarPublicacao(estado, id, motivo) {
    var atual = porId(estado.publicacoes, id);
    if (!atual || atual.status !== 'publicada') return { estado: estado, erros: [{ campo: 'id', mensagem: 'Esta publicação não está no ar.' }] };
    if (!String(motivo || '').trim()) return { estado: estado, erros: [{ campo: 'motivo', mensagem: 'Escreva o motivo da retirada: a empresa vai ler.' }] };
    var novo = clonar(estado);
    var pub = porId(novo.publicacoes, id);
    pub.status = 'retirada';
    pub.motivo = String(motivo).trim();
    return { estado: novo, erros: [] };
  }

  // Quem escreveu apaga a própria publicação, em qualquer situação.
  function apagarPublicacao(estado, id, membroId) {
    var atual = porId(estado.publicacoes, id);
    if (!atual || atual.autorId !== membroId) return { estado: estado, erros: [{ campo: 'id', mensagem: 'Só quem publicou pode apagar.' }] };
    var novo = clonar(estado);
    novo.publicacoes = novo.publicacoes.filter(function (p) {
      return p.id !== id;
    });
    return { estado: novo, erros: [] };
  }

  // O que os membros veem: aprovadas, de empresa ativa. Empresa pausada some
  // inteira, publicações também. Mais recente primeiro.
  function publicacoesVisiveis(estado, prestadorId) {
    return estado.publicacoes
      .filter(function (p) {
        if (p.status !== 'publicada') return false;
        if (prestadorId && p.prestadorId !== prestadorId) return false;
        var empresa = porId(estado.prestadores, p.prestadorId);
        return !!empresa && empresa.status === 'ativo';
      })
      .sort(function (a, b) {
        return ms(b.publicadaEm || b.data) - ms(a.publicadaEm || a.data);
      });
  }

  // A aba "Seguindo": publicações das empresas seguidas e indicações feitas
  // pelas pessoas seguidas. Só o que a pessoa escolheu, do mais recente para o
  // mais antigo. Não há outra ordem nem sugestão no meio.
  function feed(estado, regras, membroId) {
    var s = seguidos(estado, membroId);
    var itens = [];
    publicacoesVisiveis(estado).forEach(function (p) {
      if (s.prestadores.indexOf(p.prestadorId) === -1) return;
      itens.push({ tipo: 'publicacao', id: 'pub:' + p.id, data: p.publicadaEm || p.data, publicacaoId: p.id, prestadorId: p.prestadorId });
    });
    estado.indicacoes.forEach(function (i) {
      if (s.membros.indexOf(i.membroId) === -1) return;
      var empresa = porId(estado.prestadores, i.prestadorId);
      if (!empresa || empresa.status !== 'ativo') return;
      itens.push({ tipo: 'indicacao', id: 'ind:' + i.id, data: i.data, indicacaoId: i.id, prestadorId: i.prestadorId, membroId: i.membroId });
    });
    return itens.sort(function (a, b) {
      return ms(b.data) - ms(a.data);
    });
  }

  // Para quem ainda não segue ninguém: as empresas que a pessoa contratou ou
  // indicou e quem indicou essas empresas. Poucas, e só como ponto de partida.
  function sugestoesParaSeguir(estado, membroId, limite) {
    limite = limite || 3;
    var empresas = [];
    var pessoas = [];
    var incluir = function (lista, id) {
      if (id && lista.indexOf(id) === -1) lista.push(id);
    };
    estado.confirmacoes.forEach(function (c) {
      if (c.clienteId !== membroId || c.status === 'recusada') return;
      incluir(empresas, c.prestadorId);
      incluir(pessoas, indicadorCreditado(estado, c));
    });
    estado.indicacoes.forEach(function (i) {
      if (i.membroId === membroId) incluir(empresas, i.prestadorId);
    });
    // Completa com quem teve indicação mais recente.
    estado.indicacoes
      .slice()
      .sort(function (a, b) {
        return ms(b.data) - ms(a.data);
      })
      .forEach(function (i) {
        incluir(empresas, i.prestadorId);
        incluir(pessoas, i.membroId);
      });
    return {
      prestadores: empresas
        .filter(function (id) {
          return !validarSeguir(estado, { membroId: membroId, tipo: 'prestador', alvoId: id }).length;
        })
        .slice(0, limite),
      membros: pessoas
        .filter(function (id) {
          return !validarSeguir(estado, { membroId: membroId, tipo: 'membro', alvoId: id }).length;
        })
        .slice(0, limite),
    };
  }

  // -------------------------------------------------------------------- trocas

  // Mês do calendário, no fuso da comunidade, para o teto de trocas.
  function mesDe(regras, data) {
    var d = new Date(ms(data) + (regras.fusoHorarioEmHoras || 0) * 60 * 60 * 1000);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  }

  // Quantas trocas a comunidade ainda banca neste mês. Vale para todos os
  // membros juntos. Troca cancelada ou vale vencido devolvem a vaga, porque
  // a comunidade não chegou a pagar o parceiro.
  function vagasDeTrocaNoMes(estado, regras, agora) {
    var teto = regras.tetoDeTrocasPorMes || null;
    var mes = mesDe(regras, agora);
    var usadas = estado.resgates.filter(function (r) {
      return (r.status === 'emitido' || r.status === 'usado') && mesDe(regras, r.data) === mes;
    }).length;
    return { teto: teto, usadas: usadas, restam: teto === null ? null : Math.max(0, teto - usadas) };
  }

  // pedido.data diz em que mês a troca acontece, para o teto mensal.
  function validarResgate(estado, regras, pedido) {
    var erros = [];
    if (!porId(estado.membros, pedido.membroId)) {
      erros.push({ campo: 'membro', mensagem: 'Entre com o seu perfil para trocar pontos.' });
      return erros;
    }
    var recompensa = porId(estado.recompensas, pedido.recompensaId);
    if (!recompensa || !recompensa.ativa) {
      erros.push({ campo: 'recompensa', mensagem: 'Este serviço não está mais disponível para troca.' });
      return erros;
    }
    var parceiro = porId(estado.prestadores, recompensa.prestadorId);
    if (parceiro && parceiro.status !== 'ativo') {
      erros.push({ campo: 'recompensa', mensagem: 'Este serviço não está disponível para troca no momento.' });
      return erros;
    }
    if (parceiro && parceiro.donoId === pedido.membroId) {
      erros.push({ campo: 'recompensa', mensagem: 'Você não pode trocar pontos por um serviço da sua própria empresa.' });
    }
    if (pedido.data && vagasDeTrocaNoMes(estado, regras, pedido.data).restam === 0) {
      erros.push({ campo: 'teto', mensagem: 'As trocas deste mês já foram todas usadas. Seus pontos ficam guardados para o mês que vem.' });
      return erros;
    }
    var disponivel = saldo(estado, regras, pedido.membroId).disponivel;
    if (disponivel < recompensa.custo) {
      var falta = recompensa.custo - disponivel;
      erros.push({ campo: 'saldo', mensagem: 'Faltam ' + falta + (falta === 1 ? ' ponto.' : ' pontos.') });
    }
    return erros;
  }

  // pedido = { id, membroId, recompensaId, data, codigo }
  function resgatar(estado, regras, pedido) {
    var erros = validarResgate(estado, regras, pedido);
    if (erros.length) return { estado: estado, erros: erros, resgate: null };
    var novo = clonar(estado);
    var recompensa = porId(novo.recompensas, pedido.recompensaId);
    var resgate = {
      id: pedido.id,
      membroId: pedido.membroId,
      recompensaId: recompensa.id,
      custo: recompensa.custo,
      codigo: pedido.codigo,
      data: pedido.data,
      status: 'emitido',
    };
    novo.resgates.push(resgate);
    return { estado: novo, erros: [], resgate: resgate };
  }

  // Até quando o vale pode ser usado.
  function validadeDoVale(regras, resgate) {
    return new Date(ms(resgate.data) + regras.validadeDoValeEmDias * DIA).toISOString();
  }

  function valeVencido(regras, resgate, agora) {
    return resgate.status === 'vencido' || (resgate.status === 'emitido' && ms(agora) > ms(validadeDoVale(regras, resgate)));
  }

  // Vale emitido e não usado até a validade é cancelado, e os pontos voltam.
  // Os pontos em si não vencem. Devolve o mesmo estado quando nada venceu.
  function vencerVales(estado, regras, agora) {
    var vencidos = estado.resgates
      .filter(function (r) {
        return r.status === 'emitido' && valeVencido(regras, r, agora);
      })
      .map(function (r) {
        return r.id;
      });
    if (!vencidos.length) return { estado: estado, vencidos: [] };
    var novo = clonar(estado);
    vencidos.forEach(function (id) {
      var r = porId(novo.resgates, id);
      r.status = 'vencido';
      r.vencidoEm = validadeDoVale(regras, r);
    });
    return { estado: novo, vencidos: vencidos };
  }

  // regras e agora são opcionais: quando vêm, vale vencido não pode mais ser usado.
  function mudarResgate(estado, id, para, regras, agora) {
    var atual = porId(estado.resgates, id);
    if (!atual) return { estado: estado, erros: [{ campo: 'id', mensagem: 'Troca não encontrada.' }] };
    if (para === 'usado' && regras && agora && valeVencido(regras, atual, agora)) {
      return { estado: estado, erros: [{ campo: 'id', mensagem: 'Este vale venceu. Os pontos voltaram para quem trocou.' }] };
    }
    if (atual.status !== 'emitido') return { estado: estado, erros: [{ campo: 'id', mensagem: 'Esta troca já foi usada, cancelada ou venceu.' }] };
    var novo = clonar(estado);
    porId(novo.resgates, id).status = para;
    return { estado: novo, erros: [] };
  }

  function cancelarResgate(estado, id) {
    return mudarResgate(estado, id, 'cancelado');
  }

  function marcarResgateUsado(estado, id, regras, agora) {
    return mudarResgate(estado, id, 'usado', regras, agora);
  }

  return {
    estadoVazio: estadoVazio,
    porId: porId,
    semAcento: semAcento,
    normalizarArroba: normalizarArroba,
    indicacoesDoPrestador: indicacoesDoPrestador,
    indicadorCreditado: indicadorCreditado,
    ehPrimeiraContratacao: ehPrimeiraContratacao,
    pontosDaConfirmacao: pontosDaConfirmacao,
    lancamentos: lancamentos,
    saldo: saldo,
    resumoPrestador: resumoPrestador,
    buscar: buscar,
    palavrasDaBusca: palavrasDaBusca,
    ehCuradoria: ehCuradoria,
    sinaisParaCuradoria: sinaisParaCuradoria,
    notaDaExperiencia: notaDaExperiencia,
    reputacaoDoServico: reputacaoDoServico,
    qualidadeDasIndicacoes: qualidadeDasIndicacoes,
    reputacaoPublica: reputacaoPublica,
    qualidadePublica: qualidadePublica,
    criteriosDasIndicacoes: criteriosDasIndicacoes,
    membrosParaConversar: membrosParaConversar,
    previsaoDeAprovacao: previsaoDeAprovacao,
    decidirPausa: decidirPausa,
    validarConfirmacao: validarConfirmacao,
    registrarConfirmacao: registrarConfirmacao,
    decidirConfirmacao: decidirConfirmacao,
    validarIndicacao: validarIndicacao,
    registrarIndicacao: registrarIndicacao,
    decidirPrestador: decidirPrestador,
    validarResgate: validarResgate,
    resgatar: resgatar,
    cancelarResgate: cancelarResgate,
    marcarResgateUsado: marcarResgateUsado,
    validadeDoVale: validadeDoVale,
    vagasDeTrocaNoMes: vagasDeTrocaNoMes,
    segue: segue,
    validarSeguir: validarSeguir,
    seguir: seguir,
    deixarDeSeguir: deixarDeSeguir,
    seguidos: seguidos,
    validarPublicacao: validarPublicacao,
    publicar: publicar,
    decidirPublicacao: decidirPublicacao,
    retirarPublicacao: retirarPublicacao,
    apagarPublicacao: apagarPublicacao,
    publicacoesVisiveis: publicacoesVisiveis,
    feed: feed,
    sugestoesParaSeguir: sugestoesParaSeguir,
    vencerVales: vencerVales,
  };
});
