/*
 * Dados de exemplo da demonstração.
 *
 * TUDO AQUI É FICTÍCIO: pessoas, empresas, @ do Instagram, relatos e pontos.
 * Os @ terminam em ".exemplo" para não se confundirem com perfis de verdade.
 * As datas são calculadas a partir do dia em que a demonstração é aberta.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Dados = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIA = 24 * 60 * 60 * 1000;

  function exemplo(agora) {
    var base = new Date(agora || Date.now()).getTime();
    function dias(n) {
      return new Date(base - n * DIA).toISOString();
    }

    var membros = [
      { id: 'helena', nome: 'Helena Duarte', empresa: 'Ateliê Norte Arquitetura', arroba: 'atelienorte.exemplo' },
      { id: 'renato', nome: 'Renato Aguiar', empresa: 'Fonte Contábil', arroba: 'fontecontabil.exemplo' },
      { id: 'lucia', nome: 'Lúcia Prado', empresa: 'Lacerda & Prado Advogados', arroba: 'lacerdaprado.exemplo' },
      { id: 'tomas', nome: 'Tomás Vidal', empresa: 'Estúdio Vírgula', arroba: 'estudiovirgula.exemplo' },
      { id: 'beatriz', nome: 'Beatriz Sá', empresa: 'Trama Tecnologia', arroba: 'tramatec.exemplo' },
      { id: 'igor', nome: 'Igor Menezes', empresa: 'Raiz Pessoas', arroba: 'raizpessoas.exemplo' },
      { id: 'sofia', nome: 'Sofia Leme', empresa: 'Bússola Gestão', arroba: 'bussolagestao.exemplo' },
      { id: 'marcos', nome: 'Marcos Tavares', empresa: 'Clínica Vida Plena', arroba: 'vidaplena.exemplo' },
      { id: 'paula', nome: 'Paula Nogueira', empresa: 'Café Tipográfico', arroba: 'cafetipografico.exemplo' },
      { id: 'andre', nome: 'André Couto', empresa: 'Empório Cidreira', arroba: 'emporiocidreira.exemplo' },
      // Quem cuida da comunidade. Só este papel vê a área de curadoria.
      { id: 'clara', nome: 'Clara Monteiro', empresa: 'Curadoria da comunidade', arroba: 'comunidade.exemplo', papel: 'curadoria' },
    ];

    var prestadores = [
      {
        id: 'fonte',
        funcionaPara: ['Trocar de contador sem bagunçar o fechamento', 'Rever o regime tributário antes de crescer'],
        palavras: 'imposto impostos contador contadora contabilidade simples nacional regime tributario fiscal nota abrir empresa',
        nome: 'Fonte Contábil',
        setor: 'Contabilidade e fiscal',
        cidade: 'Campinas',
        resumo: 'Contabilidade para empresas de serviço de até 30 pessoas. Fechamento mensal explicado em português simples.',
        arroba: 'fontecontabil.exemplo',
        donoId: 'renato',
        status: 'ativo',
        criadoEm: dias(120),
        servicos: [
          { id: 'fonte-mensal', nome: 'Contabilidade mensal', premium: false },
          { id: 'fonte-tributario', nome: 'Planejamento tributário', premium: true },
        ],
      },
      {
        id: 'lacerda',
        funcionaPara: ['Escrever ou revisar um contrato com cliente ou fornecedor', 'Entrada e saída de sócios'],
        palavras: 'contrato empresarial revisar socio socia sociedade advogado advogada trabalhista acordo juridico',
        nome: 'Lacerda & Prado Advogados',
        setor: 'Jurídico',
        cidade: 'Campinas',
        resumo: 'Contratos, societário e trabalhista para pequenas e médias empresas.',
        arroba: 'lacerdaprado.exemplo',
        donoId: 'lucia',
        status: 'ativo',
        criadoEm: dias(100),
        servicos: [
          { id: 'lacerda-contratos', nome: 'Elaboração e revisão de contratos', premium: false },
          { id: 'lacerda-societario', nome: 'Estruturação societária', premium: true },
        ],
      },
      {
        id: 'virgula',
        funcionaPara: ['Reposicionar a marca de um negócio de serviço', 'Organizar o conteúdo das redes, com aprovação antes de publicar'],
        palavras: 'reorganizar marca reposicionamento identidade instagram conteudo marketing comunicacao',
        nome: 'Estúdio Vírgula',
        setor: 'Marketing e marca',
        cidade: 'São Paulo',
        resumo: 'Marca e conteúdo para negócios que vendem conhecimento: clínicas, escritórios e consultorias.',
        arroba: 'estudiovirgula.exemplo',
        donoId: 'tomas',
        status: 'ativo',
        criadoEm: dias(60),
        servicos: [
          { id: 'virgula-redes', nome: 'Gestão de redes sociais', premium: false },
          { id: 'virgula-posicionamento', nome: 'Posicionamento de marca', premium: true },
        ],
      },
      {
        id: 'trama',
        funcionaPara: ['Escritório sem equipe de TI', 'Organizar acessos e backup depois de um susto'],
        palavras: 'computador rede internet email seguranca site suporte tecnologia sistema ti',
        nome: 'Trama Tecnologia',
        setor: 'Tecnologia',
        cidade: 'Campinas',
        resumo: 'Suporte, site e segurança para escritórios sem equipe de TI.',
        arroba: 'tramatec.exemplo',
        donoId: 'beatriz',
        status: 'ativo',
        criadoEm: dias(80),
        servicos: [
          { id: 'trama-suporte', nome: 'Suporte de TI mensal', premium: false },
          { id: 'trama-site', nome: 'Site institucional', premium: false },
          { id: 'trama-seguranca', nome: 'Segurança e backup', premium: true },
        ],
      },
      {
        id: 'raiz',
        funcionaPara: ['Primeiras contratações de uma equipe pequena', 'Contratar uma liderança sem errar o perfil'],
        palavras: 'contratar lideranca gerente vaga recrutamento equipe pessoas rh salario',
        nome: 'Raiz Pessoas',
        setor: 'Pessoas e RH',
        cidade: 'Valinhos',
        resumo: 'Recrutamento e estrutura de cargos para equipes de 5 a 50 pessoas.',
        arroba: 'raizpessoas.exemplo',
        donoId: 'igor',
        status: 'ativo',
        criadoEm: dias(40),
        servicos: [
          { id: 'raiz-recrutamento', nome: 'Recrutamento e seleção', premium: false },
          { id: 'raiz-cargos', nome: 'Plano de cargos e salários', premium: false },
        ],
      },
      {
        id: 'bussola',
        funcionaPara: ['Tirar o financeiro das mãos da dona do negócio', 'Entender para onde a margem está indo'],
        palavras: 'organizar processos financeiros financeiro fluxo caixa margem contas pagar receber gestao',
        nome: 'Bússola Gestão',
        setor: 'Finanças e gestão',
        cidade: 'Campinas',
        resumo: 'Financeiro terceirizado e leitura mensal dos números com a dona do negócio.',
        arroba: 'bussolagestao.exemplo',
        donoId: 'sofia',
        status: 'ativo',
        criadoEm: dias(65),
        servicos: [
          { id: 'bussola-bpo', nome: 'Financeiro terceirizado (BPO)', premium: false },
          { id: 'bussola-diagnostico', nome: 'Diagnóstico financeiro', premium: false },
        ],
      },
      {
        id: 'selo',
        funcionaPara: ['Registrar a marca antes de investir em divulgação'],
        palavras: 'marca registro inpi nome proteger patente',
        nome: 'Selo Marcas e Patentes',
        setor: 'Jurídico',
        cidade: 'São Paulo',
        resumo: 'Registro e acompanhamento de marca no INPI.',
        arroba: 'selomarcas.exemplo',
        donoId: null,
        status: 'ativo',
        criadoEm: dias(55),
        servicos: [{ id: 'selo-registro', nome: 'Registro de marca', premium: false }],
      },
      {
        id: 'oficina',
        funcionaPara: [],
        palavras: 'dados indicadores painel relatorio planilha',
        nome: 'Oficina de Dados',
        setor: 'Tecnologia',
        cidade: 'Campinas',
        resumo: '',
        arroba: 'oficinadedados.exemplo',
        donoId: null,
        status: 'em_analise',
        criadoEm: dias(2),
        servicos: [{ id: 'oficina-paineis', nome: 'Painéis de indicadores', premium: false }],
      },
    ];

    var indicacoes = [
      { id: 'i01', paraQue: 'Contabilidade mensal de um escritório pequeno', prestadorId: 'fonte', membroId: 'helena', data: dias(120), texto: 'Contratei a contabilidade mensal quando abri o ateliê. Respondem no mesmo dia e explicam sem jargão.' },
      { id: 'i02', paraQue: 'Planejamento tributário de uma clínica', prestadorId: 'fonte', membroId: 'marcos', data: dias(90), texto: 'Fizeram o planejamento tributário da clínica. Mostraram os cenários antes de mexer em qualquer coisa.' },
      { id: 'i03', paraQue: 'Contratos de prestação de serviço', prestadorId: 'lacerda', membroId: 'tomas', data: dias(100), texto: 'Revisaram nossos contratos de prestação de serviço. Texto claro, que o cliente entende.' },
      { id: 'i04', paraQue: 'Entrada de uma sócia', prestadorId: 'lacerda', membroId: 'sofia', data: dias(70), texto: 'Cuidaram da entrada de uma sócia. Explicaram cada cláusula antes da assinatura.' },
      { id: 'i05', paraQue: 'Reposicionamento de marca', prestadorId: 'virgula', membroId: 'helena', data: dias(60), texto: 'Refizeram o posicionamento do ateliê. Entregaram no prazo, com um guia que a equipe usa de verdade.' },
      { id: 'i06', paraQue: 'Redes sociais de um café', prestadorId: 'virgula', membroId: 'paula', data: dias(45), texto: 'Cuidam das redes do café há um ano. Pedem aprovação de tudo antes de publicar.' },
      { id: 'i07', paraQue: 'Suporte e backup de um escritório', prestadorId: 'trama', membroId: 'renato', data: dias(80), texto: 'Cuidam do suporte e do backup do escritório. Quando o servidor parou, resolveram na mesma manhã.' },
      { id: 'i08', paraQue: 'Segurança depois de um e-mail falso', prestadorId: 'trama', membroId: 'lucia', data: dias(50), texto: 'Organizaram os acessos e o backup do escritório depois de um susto com e-mail falso.' },
      { id: 'i09', paraQue: 'Contratação de equipe técnica', prestadorId: 'raiz', membroId: 'beatriz', data: dias(40), texto: 'Contratei duas pessoas com eles. Trouxeram poucos candidatos, todos dentro do que pedi.' },
      { id: 'i10', paraQue: 'Financeiro terceirizado de uma clínica', prestadorId: 'bussola', membroId: 'marcos', data: dias(65), texto: 'Assumiram o financeiro da clínica. Recebo um resumo mensal de uma página, sem planilha gigante.' },
      { id: 'i11', paraQue: 'Diagnóstico de margem', prestadorId: 'bussola', membroId: 'igor', data: dias(30), texto: 'O diagnóstico mostrou onde a margem estava sumindo. Direto e sem enfeite.' },
      { id: 'i12', paraQue: 'Registro de marca', prestadorId: 'selo', membroId: 'andre', data: dias(55), texto: 'Registraram a marca do empório. Avisam a cada etapa do processo.' },
      { id: 'i13', paraQue: 'Painel de vendas', prestadorId: 'oficina', membroId: 'paula', data: dias(2), texto: 'Montaram o painel de vendas do café. Em uma tela vejo o que antes eram quatro planilhas.' },
    ];

    // Respostas por critério de cada relato, na ordem entrega, prazo,
    // comunicação e cuidado: a = acima, c = como combinado, b = abaixo.
    var PARTES = {
      c01: 'aaaa', c02: 'acaa', c03: 'aaaa', c04: 'acac', c05: 'ccac', c06: 'aaac', c07: 'cccc', c08: 'cbcc', c09: 'cccc',
      c10: 'aaaa', c11: 'ccca', c12: 'acaa', c13: 'cccc', c14: 'cccc', c15: 'cccc', c16: 'ccaa', c17: 'ccac', c18: 'cbbc', c19: 'cccc',
    };
    var LETRA = { a: 'acima', c: 'combinado', b: 'abaixo' };

    function criteriosDe(id) {
      var letras = PARTES[id] || 'cccc';
      return { entrega: LETRA[letras[0]], prazo: LETRA[letras[1]], comunicacao: LETRA[letras[2]], cuidado: LETRA[letras[3]] };
    }

    function conf(id, prestadorId, servicoId, clienteId, origem, indicadorId, diasAtras, status, contrataria, comentario) {
      return {
        id: id,
        prestadorId: prestadorId,
        servicoId: servicoId,
        clienteId: clienteId,
        origem: origem,
        indicadorId: origem === 'pessoa' ? indicadorId : null,
        concluido: true,
        criterios: criteriosDe(id),
        contratariaDeNovo: contrataria,
        comentario: comentario || '',
        mostrarNome: true,
        data: dias(diasAtras),
        status: status,
        motivoRecusa: '',
      };
    }

    var confirmacoes = [
      conf('c01', 'fonte', 'fonte-mensal', 'andre', 'pessoa', 'helena', 75, 'aprovada', true, 'Assumiram a contabilidade do empório sem eu precisar reenviar nada.'),
      conf('c02', 'fonte', 'fonte-tributario', 'paula', 'pessoa', 'helena', 40, 'aprovada', true, 'Mudamos de regime com tudo explicado antes. Valeu a conversa.'),
      conf('c03', 'virgula', 'virgula-posicionamento', 'marcos', 'pessoa', 'helena', 20, 'aprovada', true, ''),
      conf('c04', 'virgula', 'virgula-posicionamento', 'igor', 'pessoa', 'helena', 3, 'em_analise', true, 'Processo bem conduzido, com poucas reuniões.'),
      conf('c05', 'fonte', 'fonte-mensal', 'tomas', 'pessoa', 'marcos', 60, 'aprovada', true, ''),
      conf('c06', 'lacerda', 'lacerda-contratos', 'helena', 'pessoa', 'tomas', 85, 'aprovada', true, 'Contrato de projeto revisado em três dias, com as dúvidas respondidas por escrito.'),
      conf('c07', 'lacerda', 'lacerda-societario', 'paula', 'pessoa', 'sofia', 35, 'aprovada', true, ''),
      conf('c08', 'lacerda', 'lacerda-contratos', 'marcos', 'busca', null, 15, 'aprovada', false, 'O contrato ficou bom, mas a minuta demorou mais que o combinado.'),
      conf('c09', 'trama', 'trama-suporte', 'helena', 'pessoa', 'renato', 45, 'aprovada', true, ''),
      conf('c10', 'trama', 'trama-seguranca', 'andre', 'pessoa', 'lucia', 28, 'aprovada', true, 'Fizeram o inventário dos acessos e deixaram um passo a passo para a equipe.'),
      conf('c11', 'bussola', 'bussola-bpo', 'tomas', 'pessoa', 'marcos', 22, 'aprovada', true, ''),
      conf('c12', 'raiz', 'raiz-recrutamento', 'paula', 'pessoa', 'beatriz', 18, 'aprovada', true, 'A pessoa contratada está com a gente até hoje.'),
      conf('c13', 'selo', 'selo-registro', 'lucia', 'pessoa', 'andre', 30, 'aprovada', true, ''),
      conf('c14', 'trama', 'trama-suporte', 'renato', 'pessoa', 'lucia', 6, 'em_analise', true, ''),
      conf('c15', 'fonte', 'fonte-mensal', 'beatriz', 'pessoa', 'marcos', 1, 'em_analise', true, ''),
      conf('c16', 'trama', 'trama-site', 'paula', 'pessoa', 'renato', 12, 'aprovada', true, 'Site no ar na data combinada. Explicaram como atualizar sozinha.'),
      conf('c17', 'bussola', 'bussola-diagnostico', 'andre', 'pessoa', 'marcos', 10, 'aprovada', true, ''),
      conf('c19', 'lacerda', 'lacerda-contratos', 'igor', 'pessoa', 'sofia', 25, 'aprovada', true, ''),
      // Relato em análise que, se aprovado, derruba a reputação do escritório
      // de 76 para 71, abaixo do mínimo público de 75: serve para mostrar a pausa
      // pela curadoria. A mesma aprovação forma a qualidade das indicações da
      // Sofia em 69, que fica escondida dos outros membros.
      conf('c18', 'lacerda', 'lacerda-contratos', 'andre', 'pessoa', 'sofia', 2, 'em_analise', false, 'O prazo estourou de novo e precisei cobrar três vezes.'),
    ];

    var recompensas = [
      {
        id: 'r-fonte',
        titulo: 'Diagnóstico tributário de 1 hora',
        descricao: 'Conversa com o contador responsável sobre o regime da sua empresa, com um resumo por escrito.',
        prestadorId: 'fonte',
        custo: 60,
        ativa: true,
      },
      {
        id: 'r-lacerda',
        titulo: 'Revisão de um contrato',
        descricao: 'Leitura de um contrato de até 10 páginas, com apontamentos por escrito e uma chamada de 30 minutos.',
        prestadorId: 'lacerda',
        custo: 90,
        ativa: true,
      },
      {
        id: 'r-virgula',
        titulo: 'Sessão de posicionamento de marca',
        descricao: 'Duas horas com a equipe do estúdio para organizar o que a sua marca diz e para quem.',
        prestadorId: 'virgula',
        custo: 120,
        ativa: true,
      },
      {
        id: 'r-trama',
        titulo: 'Checagem de segurança e backup',
        descricao: 'Inventário dos acessos da empresa e teste de restauração do backup, com relatório.',
        prestadorId: 'trama',
        custo: 150,
        ativa: true,
      },
    ];

    // Publicações das empresas. A última ainda espera a curadoria conferir.
    function pub(id, prestadorId, autorId, diasAtras, status, texto) {
      return { id: id, prestadorId: prestadorId, autorId: autorId, texto: texto, data: dias(diasAtras), status: status, publicadaEm: status === 'publicada' ? dias(diasAtras) : null, motivo: '' };
    }

    var publicacoes = [
      pub('pb1', 'lacerda', 'lucia', 12, 'publicada', 'Contrato de prestação de serviço sem cláusula de reajuste é o pedido de revisão que mais recebemos. Quem assina contratos de mais de um ano deveria olhar esse ponto.'),
      pub('pb2', 'fonte', 'renato', 9, 'publicada', 'Quem pretende trocar de contador em janeiro precisa avisar o contador atual até o começo de dezembro. Montamos um passo a passo de uma página; é só pedir pelo direct.'),
      pub('pb3', 'raiz', 'igor', 8, 'publicada', 'Vaga de liderança costuma levar o dobro do tempo de uma vaga técnica para fechar. Começar a conversa dois meses antes de precisar faz diferença.'),
      pub('pb4', 'virgula', 'tomas', 6, 'publicada', 'Terminamos o reposicionamento de uma clínica de fisioterapia. O que mais mudou não foi o logotipo: foi a frase que a recepção usa ao atender o telefone.'),
      pub('pb5', 'trama', 'beatriz', 4, 'publicada', 'Fizemos teste de restauração de backup em doze escritórios neste mês. Três não conseguiram recuperar os arquivos. Vale testar antes de precisar.'),
      pub('pb6', 'bussola', 'sofia', 3, 'publicada', 'Fechamos outubro dos clientes de financeiro terceirizado. Na maioria, a margem caiu por desconto dado sem registro, não por aumento de custo.'),
      pub('pb7', 'fonte', 'renato', 2, 'publicada', 'Agenda de planejamento tributário para o ano que vem aberta. Atendemos poucas empresas por mês para conseguir explicar cada cenário com calma.'),
      pub('pb8', 'virgula', 'tomas', 1, 'em_analise', 'Abrimos duas vagas para gestão de redes sociais em dezembro. Trabalhamos com aprovação de tudo antes de publicar.'),
    ];

    // Quem a Helena já segue, para a aba "Seguindo" não abrir vazia.
    var seguindo = [
      { membroId: 'helena', tipo: 'prestador', alvoId: 'fonte', data: dias(30) },
      { membroId: 'helena', tipo: 'membro', alvoId: 'marcos', data: dias(25) },
      { membroId: 'helena', tipo: 'prestador', alvoId: 'virgula', data: dias(20) },
      { membroId: 'helena', tipo: 'membro', alvoId: 'paula', data: dias(15) },
      { membroId: 'helena', tipo: 'prestador', alvoId: 'trama', data: dias(10) },
    ];

    return {
      versao: 6,
      membros: membros,
      prestadores: prestadores,
      indicacoes: indicacoes,
      confirmacoes: confirmacoes,
      recompensas: recompensas,
      resgates: [],
      publicacoes: publicacoes,
      seguindo: seguindo,
    };
  }

  return { exemplo: exemplo, membroInicial: 'helena' };
});
