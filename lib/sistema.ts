// Mapa do sistema da Paróquia Nossa Senhora Rainha: a página /sistema lê tudo daqui.
// Por enquanto: os balões dos sistemas, a divisa entre o que é da internet e o que é interno e os
// sub-sistemas (balões menores ligados ao sistema a que pertencem).
// Página pública: nada de endereços de rede, portas, senhas, chaves ou dados de pessoas.

// "internet": qualquer pessoa com o link acessa. "interno": só dentro da rede da paróquia.
export type Lado = "internet" | "interno";

export type Sistema = {
  id: string;
  nome: string[]; // o nome já quebrado nas linhas que cabem no balão
  cor: string;
  lado: Lado;
  // posição do centro do balão, em % do quadro (solto, sem grade); a divisa fica em y = 50
  x: number;
  y: number;
  // em que parte do círculo os sub-sistemas se espalham (graus: 0 = direita, 90 = embaixo, 180 = esquerda, 270 = em cima)
  arco?: [number, number];
  // distância (px) do centro do sistema ao centro dos sub-sistemas; o padrão é colado ao balão
  orbita?: number;
};

export const sistemas: Sistema[] = [
  { id: "site", nome: ["Site da", "paróquia"], cor: "#0e7f8c", lado: "internet", x: 71.3, y: 33.08, arco: [200, 390], orbita: 290 },
  { id: "ide", nome: ["Portal IDE"], cor: "#a8326a", lado: "internet", x: 28.7, y: 31.55, arco: [200, 340] },
  { id: "ambulatorial", nome: ["Sistema", "ambulatorial"], cor: "#2558b0", lado: "interno", x: 30, y: 72.34, arco: [90, 300] },
  { id: "paroquial", nome: ["Sistema", "paroquial"], cor: "#63399a", lado: "interno", x: 58.7, y: 73.86, arco: [90, 255] },
  { id: "loja", nome: ["PDV e estoque", "da loja"], cor: "#c9611a", lado: "interno", x: 84, y: 71.58, arco: [-70, 70] },
];

// Sub-sistemas: balões menores, ligados ao sistema principal (pai).
export type Subsistema = {
  id: string;
  pai: string;
  nome: string[];
  r?: number; // raio do balão (px); mais alto para quem tem sistemas externos saindo dele
  projeto?: boolean; // projeto idealizado: aparece tracejado
  fs?: string; // tamanho da letra, quando o nome é comprido para o balão
  angulo?: number; // ângulo fixo em volta do sistema (graus), em vez de espalhar por igual no arco
  liga?: string[]; // outros balões a que também se liga (ids de sistemas, sub-sistemas ou externos)
};

export const subsistemas: Subsistema[] = [
  { id: "amb-pacientes", pai: "ambulatorial", nome: ["Pacientes"], angulo: 90 },
  { id: "amb-farmacia", pai: "ambulatorial", nome: ["Farmácia"], angulo: 195 },
  { id: "amb-analise", pai: "ambulatorial", nome: ["Análise", "de dados"], angulo: 145 },
  { id: "amb-agenda", pai: "ambulatorial", nome: ["Agenda", "médica"], angulo: 300, liga: ["ext-portal-ambulatorio"] },
  // a ordem decide onde cada um fica no arco do sistema: o último fica no ponto mais alto (perto da divisa)
  { id: "par-seguranca", pai: "paroquial", nome: ["Segurança"] },
  { id: "par-secretaria", pai: "paroquial", nome: ["Secretaria", "paroquial"], angulo: 200 },
  { id: "par-comunicacao", pai: "paroquial", nome: ["Comunicação"], r: 72 },
];

// Site da paróquia: o que ele tem, de um lado a outro do arco (da esquerda, por cima, até a direita).
const SITE = (id: string, nome: string[], extra: Partial<Subsistema> = {}): Subsistema => ({ id: `sit-${id}`, pai: "site", nome, r: 42, ...extra });
// Portal IDE: a área do aluno, a área do professor (ligadas entre si) e o conteúdo, que as duas usam
subsistemas.push(
  { id: "ide-aluno", pai: "ide", nome: ["Área do", "aluno"], angulo: 195, liga: ["ide-professor", "ide-conteudo"] },
  { id: "ide-conteudo", pai: "ide", nome: ["Conteúdo"], angulo: 255 },
  { id: "ide-professor", pai: "ide", nome: ["Área do", "professor"], angulo: 315, liga: ["ide-conteudo"] },
);

// PDV e estoque da loja: o que ele tem (cada um num ponto fixo em volta da loja)
subsistemas.push(
  { id: "loja-fornecedores", pai: "loja", nome: ["Fornecedores"], r: 62, angulo: -55, fs: "12.5px" },
  { id: "loja-caixa", pai: "loja", nome: ["Caixa"], angulo: 30 },
  { id: "loja-estoque", pai: "loja", nome: ["Estoque"], angulo: 100 },
  { id: "loja-analise", pai: "loja", nome: ["Análise", "de dados"], angulo: 165 },
);

subsistemas.push(
  SITE("contato", ["Contato"]),
  SITE("oracao", ["Pedido de", "oração"]),
  SITE("liturgia", ["Liturgia e", "santo do dia"]),
  SITE("blog", ["Blog"]),
  SITE("catequiz", ["Catequiz"]),
  SITE("historia", ["História da", "paróquia"]),
  SITE("pastorais", ["Pastorais"]),
  SITE("sacramentos", ["Sacramentos"]),
  SITE("doacoes", ["Doações e", "benfeitores"]),
  SITE("painel", ["Painel", "administrativo"], { fs: "10px" }),
  SITE("catalogo", ["Catálogo", "da loja"], { projeto: true, liga: ["loja"] }),
);

export const LADO_ROTULO: Record<Lado, string> = {
  internet: "na internet",
  interno: "dentro da paróquia",
};

// Quem se liga a quem (um traço entre os dois balões). Se um dos lados está na internet e o outro dentro da
// paróquia, o traço cruza a divisa e o de DENTRO é o ponto de contato com a internet: ganha um cadeado na borda.
export type Ligacao = { de: string; para: string };

export const ligacoes: Ligacao[] = [
  { de: "site", para: "ide" },
  { de: "site", para: "loja" },
];

// Posições (x, y) em % de 1500 x 1300 px. Balões que saem de um sub-sistema (ficam na internet, em cima da divisa) e as projeções (projetos
// idealizados, que ainda não existem) que saem deles. Cada um se liga ao que está em `de` por um traço; o que está
// dentro e recebe um traço vindo da internet é o ponto de contato e ganha o cadeado. Menores que o balão de origem.
export type Externo = {
  id: string;
  de: string; // id do sub-sistema (ou do sistema externo) de onde sai
  nome: string[];
  x: number; // centro, em % do quadro
  y: number;
  r: number; // raio do balão (px)
  projeto?: boolean; // projeto idealizado: aparece tracejado
  liga?: string[]; // outros balões a que também se liga (ids de sistemas, sub-sistemas ou externos)
  ligaFuturo?: string[]; // ligações que ainda vão acontecer: traço tracejado, sem cadeado
  lado?: Lado; // padrão: "internet"; "interno" para um balão de dentro com posição própria
  cadeado?: boolean; // projeto que já mostra o cadeado no ponto de contato de dentro (os demais projetos não mostram)
  curvas?: Record<string, number>; // traço curvo até o balão indicado (px que a curva se afasta da reta; positivo = para baixo)
};

export const externos: Externo[] = [
  { id: "ext-formulario-musica", de: "par-comunicacao", nome: ["Formulário", "da pastoral", "da música"], x: 46, y: 43.85, r: 52 },
  { id: "ext-artes", de: "par-comunicacao", nome: ["Artes da", "paróquia"], x: 62.33, y: 43.46, r: 52 },
  { id: "ext-portal-ambulatorio", de: "ambulatorial", nome: ["Portal do", "ambulatório"], x: 25.3, y: 43.82, r: 52 },
  // dentro da Secretaria paroquial: a agenda da paróquia, que o formulário da pastoral da música usa para montar a agenda dele
  { id: "sub-agenda-paroquial", de: "par-secretaria", nome: ["Agenda", "paroquial"], x: 44, y: 56.92, r: 46, lado: "interno", liga: ["ext-formulario-musica"] },
  // dentro da Segurança: os três sistemas, em linha (câmeras, alerta de pânico e chamados, botão), todos ligados entre si
  { id: "seg-cameras", de: "par-seguranca", nome: ["Sistema de", "câmeras"], x: 46.67, y: 99.23, r: 54, lado: "interno", liga: ["seg-alerta", "seg-botao"], curvas: { "seg-botao": 105 } },
  { id: "seg-alerta", de: "par-seguranca", nome: ["Sistema de", "alerta de", "pânico e", "chamados"], x: 58.67, y: 99.23, r: 54, lado: "interno", liga: ["seg-botao"] },
  { id: "seg-botao", de: "par-seguranca", nome: ["Sistema de", "botão do", "pânico"], x: 70.67, y: 99.23, r: 54, lado: "interno" },
  // projeto idealizado da Segurança: a tranca inteligente (ao lado da Segurança, à direita)
  { id: "proj-tranca", de: "par-seguranca", nome: ["Sistema de", "tranca", "inteligente"], x: 72.67, y: 87.62, r: 50, lado: "interno", projeto: true },
  // dentro da paróquia: os quiosques, que recebem as artes da paróquia (o traço cruza a divisa)
  { id: "sub-quiosques", de: "ext-artes", nome: ["Quiosques"], x: 67.33, y: 59.23, r: 50, lado: "interno", projeto: true },
  { id: "proj-multimidia", de: "par-comunicacao", nome: ["Página da", "multimídia"], x: 53.67, y: 41.92, r: 46, projeto: true, liga: ["ext-formulario-musica"] },
  // projeto idealizado da loja: página para os fornecedores gerenciarem os próprios produtos, sem tirar o controle interno
  { id: "proj-fornecedores", de: "loja-fornecedores", nome: ["Portal dos", "fornecedores"], x: 95.33, y: 45, r: 48, projeto: true, cadeado: true },
  { id: "proj-automacao", de: "ext-artes", nome: ["Automação", "de", "postagens"], x: 70.33, y: 45.38, r: 46, projeto: true, liga: ["site"] },
];

// ───────── Textos do balão que aparece ao passar o mouse ─────────
// Um por círculo (pelo id) e um por ligação (pelo par "de>para", em qualquer ordem). Onde uma ligação não tem texto aqui,
// a página escreve uma frase simples ("X faz parte de Y"). Sem endereços de rede, portas, senhas ou dados de pessoas.
export const descricoes: Record<string, string> = {
  // sistemas
  site: "O site público da paróquia: horários de celebração, blog, Catequiz, pastorais, sacramentos e contato. Qualquer pessoa acessa pela internet.",
  ide: "Portal do curso IDE: inscrição, aulas, notas e frequência dos participantes. Funciona só na internet.",
  ambulatorial: "O sistema da secretaria do ambulatório: pacientes, agenda médica e farmácia. Funciona dentro da rede da paróquia.",
  paroquial: "O sistema da secretaria da paróquia. Reúne a secretaria, a comunicação e a segurança. Funciona dentro da rede da paróquia.",
  "amb-analise": "Transforma os registros do ambulatório em gráficos para entender o serviço: quantas pessoas são atendidas, como o cadastro cresce, o perfil de quem é atendido e como a farmácia é usada. Cada setor mostra só os gráficos do próprio setor, para quem tem permissão, e nada disso sai da rede da paróquia.",
  "loja-analise": "O painel e os relatórios da loja. Mostram quanto se vende por dia, hora e forma de pagamento, os produtos que mais vendem e os que mais dão lucro, o desempenho de cada caixa, o estoque (o que repor primeiro e o que está parado) e o que é devido a cada fornecedor.",
  "ide-aluno": "Onde o aluno acompanha as aulas, as notas e a frequência.",
  "ide-professor": "Onde o professor dá as aulas, lança notas e frequência.",
  "ide-conteudo": "O conteúdo do curso: as aulas e os materiais, que o professor publica e o aluno acessa.",
  loja: "Ponto de venda e controle de estoque da loja: estoque, caixa e fornecedores. Funciona dentro da rede da paróquia.",
  "loja-estoque": "O controle de estoque da loja: o que há, o que entra e o que sai.",
  "loja-caixa": "O caixa da loja: o registro das vendas, no ponto de venda.",
  "loja-fornecedores": "O cadastro dos fornecedores da loja e dos produtos que cada um fornece. Hoje é controlado só por dentro.",
  "proj-fornecedores": "Projeto idealizado: uma página para os fornecedores gerenciarem os próprios produtos. O controle continua interno: tudo o que o fornecedor enviar passa pela aprovação da loja antes de valer.",
  // Sistema ambulatorial
  "amb-pacientes": "Cadastro e busca dos pacientes do ambulatório.",
  "amb-farmacia": "Controle dos medicamentos: entradas e saídas, estoque e vencimentos.",
  "amb-agenda": "Agenda das consultas por médico, com controle de presença e faltas. Se comunica com o Portal do ambulatório.",
  "ext-portal-ambulatorio": "A página do ambulatório aberta na internet. Se comunica com a Agenda médica, que fica dentro da paróquia.",
  // Sistema paroquial
  "par-secretaria": "Cadastros e documentos da secretaria da paróquia.",
  "par-seguranca": "Reúne os sistemas de câmeras, de botão do pânico e de alerta de pânico e chamados.",
  "par-comunicacao": "Avisos, montagem da Missa, editor de imagens e telão. Daqui saem os sistemas externos da pastoral da música e das artes da paróquia.",
  "sub-agenda-paroquial": "A agenda da paróquia. O formulário da pastoral da música usa essa agenda para montar a agenda dele.",
  "ext-formulario-musica": "Aplicativo na internet onde os músicos escolhem, de casa, as músicas de cada momento da Missa. Usa a Agenda paroquial para montar a agenda do formulário.",
  "ext-artes": "Sistema externo ligado à Comunicação, para as artes da paróquia. Alimentaria os quiosques, que ainda são um projeto.",
  "sub-quiosques": "Projeto idealizado: quiosques da paróquia, dentro da rede, que exibiriam as artes da paróquia.",
  "proj-multimidia": "Projeto idealizado: uma página para a equipe de multimídia acessar as informações que os músicos geram no formulário da pastoral da música.",
  "proj-automacao": "Projeto idealizado: facilitar a postagem em várias plataformas. Com um único clique, a postagem é enviada para o próprio Site da paróquia, o Instagram e o que mais puder ser feito.",
  // Segurança
  "seg-cameras": "As câmeras da paróquia, para quem cuida da segurança acompanhar as imagens.",
  "seg-alerta": "Recebe o alerta dos botões de pânico e os chamados, e avisa quem é da segurança.",
  "seg-botao": "Os botões físicos que chamam a segurança com um toque.",
  "proj-tranca": "Projeto idealizado: tranca inteligente, controlada pelo sistema de segurança.",
  // Site da paróquia
  "sit-contato": "Página para falar com a paróquia.",
  "sit-oracao": "Os fiéis enviam pedidos de oração pelo site, e a secretaria os recebe no painel.",
  "sit-liturgia": "A liturgia do dia e o santo do dia.",
  "sit-blog": "Textos e notícias publicados pela paróquia.",
  "sit-catequiz": "Jogo de perguntas e respostas sobre a fé, sem cadastro e sem ranking.",
  "sit-historia": "A história da paróquia e da sua padroeira.",
  "sit-pastorais": "As pastorais da paróquia.",
  "sit-sacramentos": "Informações sobre os sacramentos.",
  "sit-doacoes": "A página de doações e a lista de benfeitores.",
  "sit-painel": "Onde a secretaria edita o conteúdo do site (avisos, blog, horários, pastorais e mais) sem programar.",
  "sit-catalogo": "Projeto idealizado: mostrar no site os produtos da loja, usando os dados do PDV e estoque da loja.",
};

export const descricoesLigacoes: Record<string, string> = {
  "site>ide": "Ligação entre o Site da paróquia e o Portal IDE, que ficam abertos na internet.",
  "site>loja": "Liga o Site da paróquia ao PDV e estoque da loja. O traço cruza a divisa: o cadeado marca o ponto de contato, do lado de dentro.",
  "ext-portal-ambulatorio>ambulatorial": "O Portal do ambulatório se liga ao Sistema ambulatorial. O traço cruza a divisa: o cadeado marca o ponto de contato, do lado de dentro.",
  "amb-agenda>ext-portal-ambulatorio": "O portal se comunica com a agenda médica. O traço cruza a divisa: o cadeado marca o ponto de contato, do lado de dentro.",
  "sub-agenda-paroquial>ext-formulario-musica": "O formulário usa a agenda da paróquia para montar a agenda dele. O traço cruza a divisa: o cadeado marca o ponto de contato, do lado de dentro.",
  "proj-multimidia>ext-formulario-musica": "Projeto: trazer para a equipe de multimídia as informações que os músicos geram no formulário.",
  "proj-automacao>site": "Projeto: o Site da paróquia é uma das plataformas que receberiam a postagem feita com um único clique.",
  "proj-automacao>ext-artes": "Projeto: a automação de postagens parte das artes da paróquia.",
  "sub-quiosques>ext-artes": "Projeto: as artes da paróquia chegariam aos quiosques. O traço cruza a divisa: o cadeado marca o ponto de contato, do lado de dentro.",
  "proj-fornecedores>loja-fornecedores": "Projeto: o portal seria a porta do fornecedor para o cadastro de produtos. O traço cruza a divisa, e o controle segue dentro da paróquia.",
  "ide-aluno>ide-professor": "A área do aluno e a área do professor se comunicam: o que o professor lança aparece para o aluno.",
  "ide-aluno>ide-conteudo": "O aluno acessa o conteúdo do curso.",
  "ide-professor>ide-conteudo": "O professor publica e organiza o conteúdo do curso.",
  "sit-catalogo>loja": "Projeto: o catálogo da loja seria interligado ao sistema do PDV e estoque da loja. O traço cruza a divisa.",
  "seg-cameras>seg-alerta": "O sistema de câmeras e o de alerta de pânico e chamados conversam entre si.",
  "seg-alerta>seg-botao": "O alerta de pânico e chamados recebe o que o botão do pânico dispara.",
  "seg-cameras>seg-botao": "O sistema de câmeras e o de botão do pânico conversam entre si.",
};

// O que o balão do cadeado explica: para que o ponto de contato serve ali e qual é o formato de proteção. Chave = id do círculo
// que tem o cadeado. Texto geral, sem endereços, portas, senhas ou chaves.
export type TextoCadeado = { serve: string; protecao: string };

export const descricoesCadeados: Record<string, TextoCadeado> = {
  ambulatorial: {
    serve: "É o único ponto por onde o Sistema ambulatorial se comunica com o Portal do ambulatório.",
    protecao:
      "Não existe caminho direto da internet até o sistema. Quem vai buscar o que o portal deixou na internet é o sistema de dentro: a conexão sempre parte de dentro, e só passa o que o portal precisa trocar.",
  },
  "loja-fornecedores": {
    serve: "Seria o único ponto por onde o Portal dos fornecedores (projeto idealizado) se comunicaria com o cadastro de fornecedores da loja.",
    protecao:
      "Não haveria caminho direto da internet até a loja: quem busca o que o fornecedor enviou é o sistema de dentro, e tudo passa pela aprovação da loja antes de valer.",
  },
  "amb-agenda": {
    serve: "É por aqui que a Agenda médica troca informações com o portal.",
    protecao: "A internet não alcança a agenda. A agenda de dentro busca e entrega só o necessário, por este ponto único e controlado.",
  },
  "par-comunicacao": {
    serve: "É por aqui que a Comunicação troca informações com o formulário da pastoral da música e com as Artes da paróquia, que ficam na internet.",
    protecao:
      "A internet não alcança a Comunicação. Quem conversa é o sistema de dentro: a conexão parte de dentro, busca quando alguém pede (e não o tempo todo), usa uma chave secreta e só leva e traz o necessário.",
  },
  "sub-agenda-paroquial": {
    serve: "Deixa o formulário da pastoral da música usar a agenda da paróquia para montar a agenda dele.",
    protecao: "O formulário não acessa a agenda diretamente: recebe só o necessário para montar a agenda dele, por este ponto único.",
  },
  loja: {
    serve: "É o ponto de contato entre o Site da paróquia e o PDV e estoque da loja.",
    protecao: "O PDV continua dentro da rede, sem caminho direto da internet. Só este ponto conversa com o site.",
  },
  "sub-quiosques": {
    serve: "Levaria as artes da paróquia até os quiosques (projeto idealizado).",
    protecao: "A internet não alcança os quiosques: as artes chegam por este ponto único e controlado.",
  },
};

export const cadeadoPadrao: TextoCadeado = {
  serve: "É a única passagem entre a internet e este sistema.",
  protecao: "A internet não alcança o resto da rede da paróquia: só este ponto conversa com o lado de fora.",
};

