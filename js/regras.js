/*
 * Regras de pontos da Comunidade de Indicações.
 *
 * Versão de 12/11/2026. O que a Gabriela decidiu está marcado como DECISÃO;
 * o resto continua sendo proposta. Todos os números e limites ficam neste
 * arquivo: para mudar uma regra, mude aqui. O motor (motor.js) e a página "Como os
 * pontos funcionam" leem daqui, então os dois mudam juntos.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Regras = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    versao: 'Versão de 12/11/2026, com os valores dos pontos e das trocas ainda em proposta',
    nomeDaComunidade: 'Comunidade de Indicações',

    // Enquanto os dados forem fictícios, a página avisa no topo e no rodapé de
    // cada tela. Trocar para false só quando os dados forem de verdade.
    demonstracao: true,

    // Pontos por contratação concluída e confirmada por quem contratou.
    // DECISÃO (12/11): quem indicou e a empresa indicada acumulam e trocam; os
    // valores ficam assim por enquanto, até existir o preço real dos serviços.
    pontos: {
      indicador: { padrao: 10, premium: 30 }, // quem indicou
      prestador: { padrao: 5, premium: 15 }, // a empresa indicada
    },

    // DECISÃO (12/11): é a curadoria que marca um serviço como premium, seguindo
    // um critério escrito na página de regras. O texto do critério é proposta.
    criterioDoPremium: 'serviço feito sob medida para a empresa, de maior porte',

    // DECISÃO (12/11): a comunidade paga o parceiro pelo serviço trocado. Os
    // pontos não vencem; o vale vence e, se não for usado, os pontos voltam.
    quemPagaATroca: 'comunidade',
    validadeDoValeEmDias: 90,

    // DECISÃO (12/11): o dinheiro das trocas vem de quatro fontes, que entram
    // aos poucos. Começa com orçamento próprio de quem organiza, com um teto de
    // trocas por mês para a comunidade inteira. As outras fontes vêm depois e
    // ainda não têm valor nem data.
    tetoDeTrocasPorMes: 5,
    fontesPrevistas: ['taxa do prestador por contratação confirmada', 'mensalidade dos membros', 'patrocínio de marcas'],
    // Define quando o mês vira para o teto: horário de Brasília.
    fusoHorarioEmHoras: -3,

    // Reputação: separada dos pontos. Nota não rende ponto e ponto não compra nota.
    // Quem contratou responde, para cada critério, em relação ao combinado.
    reputacao: {
      criterios: [
        { id: 'entrega', nome: 'Entrega', dica: 'O que foi entregue', peso: 40 },
        { id: 'prazo', nome: 'Prazo', dica: 'As datas combinadas', peso: 20 },
        { id: 'comunicacao', nome: 'Comunicação', dica: 'Respostas e clareza', peso: 20 },
        { id: 'cuidado', nome: 'Cuidado', dica: 'Atenção ao seu caso', peso: 20 },
      ],
      respostas: [
        { id: 'abaixo', rotulo: 'Abaixo', valor: 0 },
        { id: 'combinado', rotulo: 'Como combinado', valor: 75 },
        { id: 'acima', rotulo: 'Acima', valor: 100 },
      ],
      // Toda nota parte de "como combinado" e se ajusta a cada experiência
      // confirmada, para um único relato não decidir tudo.
      pontoDePartida: { valor: 75, peso: 2 },
      // Antes disso, aparece "em formação", sem nota.
      minimoParaAparecer: 3,
      // Faixa abaixo desta nota não aparece para os membros. Quando a nota de um
      // prestador cai abaixo dela, ele é pausado e vai para a curadoria decidir;
      // a de quem indica deixa de aparecer para os outros membros.
      // DECISÕES (12/11): "Curadoria pausa antes"; "Sim, escondida"; e o limite
      // em 75 ("Mais rigoroso: 75"), que é a nota de "como combinado".
      // A faixa "Consistente" começa no mesmo número, para o limite e a faixa
      // dizerem a mesma coisa.
      minimoPublico: 75,
      faixasDoServico: [
        { minimo: 85, nome: 'Referência' },
        { minimo: 75, nome: 'Consistente' },
        { minimo: 50, nome: 'Irregular' },
        { minimo: 0, nome: 'Abaixo do combinado' },
      ],
      faixasDasIndicacoes: [
        { minimo: 85, nome: 'Certeiras' },
        { minimo: 75, nome: 'Consistentes' },
        { minimo: 50, nome: 'Irregulares' },
        { minimo: 0, nome: 'Abaixo do combinado' },
      ],
      // Como a média de cada critério é lida, em palavras.
      leituras: [
        { minimo: 88, texto: 'acima do combinado' },
        { minimo: 62, texto: 'como combinado' },
        { minimo: 38, texto: 'irregular' },
        { minimo: 0, texto: 'abaixo do combinado' },
      ],
    },

    // DECISÃO (12/11): cada pessoa escolhe quem segue, pessoas e empresas, e a
    // aba "Seguindo" mostra só o que vem delas ("voce escolhe quem quer seguirm
    // quais conteudos de empresa quer").
    // PROVISÓRIO: quem segue quem fica só para a própria pessoa, sem números à
    // mostra. Perguntada, a Gabriela respondeu "ainda nao sei".
    seguir: { publico: false, mostrarNumeros: false },

    // DECISÃO (12/11): publicação de empresa só aparece depois de a curadoria
    // conferir ("Curadoria confere antes"). O tamanho do texto é proposta.
    publicacao: { minimo: 20, maximo: 400, curadoriaConfereAntes: true },

    // DECISÃO (12/11): só indica quem já contratou.
    indicarExigeTerContratado: true,
    minimoDeTextoNaIndicacao: 20,

    // Aviso para a curadoria (não aparece para os membros): prestador com
    // pelo menos N contratações confirmadas e menos de X% de "contrataria de novo".
    observacao: { minimoDeContratacoes: 5, minimoDeRecontratacao: 0.6 },

    // Aviso para a curadoria: muitas contratações creditadas à mesma dupla
    // (quem indicou + prestador) em pouco tempo.
    concentracao: { quantidade: 3, dias: 30 },

    prazoDaCuradoriaEmDias: 5,

    // Exemplos de situação mostrados na busca. São só atalhos: a pessoa pode
    // escrever a própria frase.
    situacoes: ['Preciso reorganizar a minha marca', 'Quero contratar uma liderança', 'Tenho um contrato para revisar', 'Preciso organizar o financeiro'],

    setores: [
      'Contabilidade e fiscal',
      'Jurídico',
      'Marketing e marca',
      'Tecnologia',
      'Pessoas e RH',
      'Finanças e gestão',
    ],
  };
});
