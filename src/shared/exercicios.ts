// O catálogo de exercícios (seção 11 do estudo). Cada um tem o boneco 3D com o mesmo id
// (src/components/three/boneco/movimentos.ts), os músculos que acendem, o equipamento, o passo a
// passo, os erros comuns e os pontos de atenção que aparecem na fase certa da repetição.

export type Musculo =
  | 'peitoral'
  | 'deltoide-anterior'
  | 'deltoide-lateral'
  | 'deltoide-posterior'
  | 'trapezio'
  | 'dorsal'
  | 'romboides'
  | 'lombar'
  | 'biceps'
  | 'triceps'
  | 'antebraco'
  | 'abdomen'
  | 'obliquos'
  | 'gluteos'
  | 'quadriceps'
  | 'posteriores'
  | 'adutores'
  | 'panturrilha'

export const MUSCULOS: Record<Musculo, string> = {
  peitoral: 'Peitoral',
  'deltoide-anterior': 'Deltoide anterior',
  'deltoide-lateral': 'Deltoide lateral',
  'deltoide-posterior': 'Deltoide posterior',
  trapezio: 'Trapézio',
  dorsal: 'Dorsal',
  romboides: 'Romboides',
  lombar: 'Lombar',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  abdomen: 'Abdômen',
  obliquos: 'Oblíquos',
  gluteos: 'Glúteos',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores da coxa',
  adutores: 'Adutores',
  panturrilha: 'Panturrilha',
}

export type Grupo = 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps' | 'pernas' | 'abdomen' | 'funcional'

export const GRUPOS: Record<Grupo, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  pernas: 'Pernas e glúteos',
  abdomen: 'Abdômen',
  funcional: 'Funcional e cardio',
}

export type Equipamento =
  | 'barra'
  | 'halter'
  | 'banco'
  | 'banco-inclinado'
  | 'banco-declinado'
  | 'banco-scott'
  | 'polia'
  | 'leg-press'
  | 'extensora'
  | 'flexora'
  | 'barra-fixa'
  | 'colchonete'
  | 'kettlebell'
  | 'esteira'
  | 'bike'
  | 'peso-corporal'
  | 'suporte'

export const EQUIPAMENTOS: Record<Equipamento, string> = {
  barra: 'Barra',
  halter: 'Halteres',
  banco: 'Banco reto',
  'banco-inclinado': 'Banco inclinado',
  'banco-declinado': 'Banco declinado',
  'banco-scott': 'Banco Scott',
  polia: 'Polia',
  'leg-press': 'Leg press',
  extensora: 'Cadeira extensora',
  flexora: 'Mesa flexora',
  'barra-fixa': 'Barra fixa',
  colchonete: 'Colchonete',
  kettlebell: 'Kettlebell',
  esteira: 'Esteira',
  bike: 'Bike',
  'peso-corporal': 'Peso do corpo',
  suporte: 'Suporte (rack)',
}

export type Camera = 'frente' | 'lado' | 'tres-quartos' | 'cima' | 'costas'

// Um ponto de atenção: aparece em volta da fase `em` da repetição (0 = começo, 0,5 = o meio)
export type Atencao = { em: number; texto: string }

export type Exercicio = {
  id: string
  nome: string
  grupo: Grupo
  principais: Musculo[]
  secundarios: Musculo[]
  equipamento: Equipamento[]
  nivel: 'iniciante' | 'intermediario' | 'avancado'
  medida: 'reps' | 'tempo' // repetições ou segundos (prancha, esteira)
  passos: string[]
  erros: string[]
  atencao: Atencao[]
  camera: Camera
  series: number
  reps: string
  descanso: number
  variacoes?: string[]
  cardio?: boolean
}

type Base = Omit<Exercicio, 'series' | 'reps' | 'descanso' | 'medida' | 'secundarios' | 'nivel' | 'camera'> &
  Partial<Pick<Exercicio, 'series' | 'reps' | 'descanso' | 'medida' | 'secundarios' | 'nivel' | 'camera'>>

const e = (x: Base): Exercicio => ({ series: 3, reps: '10-12', descanso: 60, medida: 'reps', secundarios: [], nivel: 'iniciante', camera: 'tres-quartos', ...x })

export const EXERCICIOS: Exercicio[] = [
  // ---------- Peito ----------
  e({
    id: 'supino-reto',
    nome: 'Supino reto com barra',
    grupo: 'peito',
    principais: ['peitoral'],
    secundarios: ['deltoide-anterior', 'triceps'],
    equipamento: ['barra', 'banco'],
    nivel: 'intermediario',
    reps: '8-12',
    descanso: 90,
    camera: 'tres-quartos',
    passos: [
      'Deite no banco com os olhos embaixo da barra e os pés firmes no chão.',
      'Segure a barra um pouco mais aberto que a largura dos ombros, punhos retos.',
      'Junte as escápulas e tire a barra do suporte com os braços esticados acima dos ombros.',
      'Desça controlando (2 segundos) até a barra encostar no meio do peito, antebraços na vertical.',
      'Empurre de volta até esticar os braços, sem tirar os ombros do banco.',
    ],
    erros: ['Quicar a barra no peito', 'Abrir os cotovelos a 90° do tronco (força o ombro)', 'Tirar o quadril do banco', 'Punho dobrado para trás'],
    atencao: [
      { em: 0.12, texto: 'Escápulas juntas e o peito alto' },
      { em: 0.45, texto: 'A barra desce até o meio do peito' },
      { em: 0.55, texto: 'Cotovelos a uns 45° do tronco' },
      { em: 0.85, texto: 'Pés firmes, empurre a barra de volta' },
    ],
    variacoes: ['supino-inclinado-halteres', 'supino-declinado', 'flexao'],
  }),
  e({
    id: 'supino-inclinado-halteres',
    nome: 'Supino inclinado com halteres',
    grupo: 'peito',
    principais: ['peitoral'],
    secundarios: ['deltoide-anterior', 'triceps'],
    equipamento: ['halter', 'banco-inclinado'],
    nivel: 'intermediario',
    passos: [
      'Ajuste o banco entre 30° e 45° e sente com um halter em cada coxa.',
      'Deite levando os halteres para a altura do peito, palmas para a frente.',
      'Empurre os halteres para cima até quase se tocarem acima do peito.',
      'Desça devagar até os cotovelos ficarem um pouco abaixo da linha do banco.',
    ],
    erros: ['Banco inclinado demais (vira ombro)', 'Bater um halter no outro', 'Descer rápido sem controle'],
    atencao: [
      { em: 0.2, texto: 'Banco entre 30° e 45°' },
      { em: 0.5, texto: 'Cotovelos um pouco abaixo do banco' },
      { em: 0.9, texto: 'Os halteres quase se tocam em cima' },
    ],
  }),
  e({
    id: 'supino-declinado',
    nome: 'Supino declinado com barra',
    grupo: 'peito',
    principais: ['peitoral'],
    secundarios: ['triceps', 'deltoide-anterior'],
    equipamento: ['barra', 'banco-declinado'],
    nivel: 'intermediario',
    passos: [
      'Prenda as pernas no apoio do banco declinado e deite com a barra sobre os olhos.',
      'Segure a barra um pouco mais aberto que os ombros e tire do suporte.',
      'Desça até a parte de baixo do peito, controlando.',
      'Empurre de volta até esticar os braços.',
    ],
    erros: ['Descer a barra no pescoço', 'Soltar as pernas do apoio', 'Arquear demais as costas'],
    atencao: [
      { em: 0.45, texto: 'A barra desce na parte de baixo do peito' },
      { em: 0.85, texto: 'Pernas presas no apoio' },
    ],
  }),
  e({
    id: 'crucifixo-halteres',
    nome: 'Crucifixo com halteres',
    grupo: 'peito',
    principais: ['peitoral'],
    secundarios: ['deltoide-anterior'],
    equipamento: ['halter', 'banco'],
    passos: [
      'Deite no banco com os halteres acima do peito, palmas uma para a outra.',
      'Dobre um pouco os cotovelos e mantenha esse ângulo o tempo todo.',
      'Abra os braços em arco até sentir o peito alongar, na linha do ombro.',
      'Feche o arco de volta, como se abraçasse uma árvore.',
    ],
    erros: ['Esticar e dobrar o cotovelo (vira supino)', 'Descer demais e forçar o ombro', 'Carga alta demais'],
    atencao: [
      { em: 0.3, texto: 'Cotovelos levemente dobrados, sempre iguais' },
      { em: 0.5, texto: 'Abra até a linha do ombro' },
      { em: 0.85, texto: 'Feche como num abraço' },
    ],
  }),
  e({
    id: 'crossover',
    nome: 'Crossover na polia',
    grupo: 'peito',
    principais: ['peitoral'],
    secundarios: ['deltoide-anterior'],
    equipamento: ['polia'],
    nivel: 'intermediario',
    camera: 'frente',
    passos: [
      'Com as polias no alto, segure um pegador em cada mão e dê um passo à frente.',
      'Incline um pouco o tronco, cotovelos levemente dobrados.',
      'Traga as mãos para baixo e para a frente até se encontrarem na frente do quadril.',
      'Volte devagar até os braços abrirem na linha do peito.',
    ],
    erros: ['Puxar com os braços dobrando o cotovelo', 'Deixar a polia puxar o ombro para trás', 'Balançar o tronco'],
    atencao: [
      { em: 0.45, texto: 'As mãos se encontram na frente do quadril' },
      { em: 0.85, texto: 'Volte devagar, sem deixar o ombro ir para trás' },
    ],
  }),
  e({
    id: 'flexao',
    nome: 'Flexão de braço',
    grupo: 'peito',
    principais: ['peitoral'],
    secundarios: ['triceps', 'deltoide-anterior', 'abdomen'],
    equipamento: ['peso-corporal'],
    reps: '10-15',
    camera: 'lado',
    passos: [
      'Mãos no chão um pouco mais abertas que os ombros, corpo reto da cabeça aos pés.',
      'Contraia o abdômen e o glúteo.',
      'Desça o peito até perto do chão, cotovelos a uns 45° do corpo.',
      'Empurre o chão e volte com o corpo inteiro reto.',
    ],
    erros: ['Quadril caindo (dói a lombar)', 'Quadril para cima', 'Descer só a cabeça'],
    atencao: [
      { em: 0.2, texto: 'Corpo reto como uma prancha' },
      { em: 0.5, texto: 'O peito desce perto do chão' },
      { em: 0.85, texto: 'Empurre o chão com o corpo inteiro' },
    ],
    variacoes: ['supino-reto'],
  }),

  // ---------- Costas ----------
  e({
    id: 'puxada-frontal',
    nome: 'Puxada frontal',
    grupo: 'costas',
    principais: ['dorsal'],
    secundarios: ['biceps', 'romboides', 'deltoide-posterior'],
    equipamento: ['polia'],
    camera: 'tres-quartos',
    passos: [
      'Sente com as coxas presas no apoio e segure a barra aberta, palmas para a frente.',
      'Incline um pouco o tronco para trás e estufe o peito.',
      'Puxe a barra até a parte de cima do peito, levando os cotovelos para baixo e para trás.',
      'Suba devagar até esticar os braços.',
    ],
    erros: ['Puxar atrás da nuca', 'Jogar o tronco para trás para ajudar', 'Subir rápido'],
    atencao: [
      { em: 0.25, texto: 'Peito estufado, leve inclinação para trás' },
      { em: 0.5, texto: 'A barra vem até a parte de cima do peito' },
      { em: 0.55, texto: 'Cotovelos para baixo e para trás' },
    ],
    variacoes: ['barra-fixa'],
  }),
  e({
    id: 'remada-curvada',
    nome: 'Remada curvada com barra',
    grupo: 'costas',
    principais: ['dorsal', 'romboides'],
    secundarios: ['biceps', 'lombar', 'deltoide-posterior', 'trapezio'],
    equipamento: ['barra'],
    nivel: 'intermediario',
    camera: 'lado',
    passos: [
      'Em pé com a barra, joelhos levemente dobrados, incline o tronco a uns 45° com a coluna reta.',
      'Deixe a barra pendurada embaixo dos ombros, pegada na largura dos ombros.',
      'Puxe a barra até o umbigo, levando os cotovelos para trás e juntando as escápulas.',
      'Desça controlando até esticar os braços.',
    ],
    erros: ['Arredondar as costas', 'Levantar o tronco a cada repetição', 'Puxar com o embalo'],
    atencao: [
      { em: 0.15, texto: 'Coluna reta, tronco a uns 45°' },
      { em: 0.5, texto: 'A barra sobe até o umbigo' },
      { em: 0.55, texto: 'Junte as escápulas no alto' },
    ],
  }),
  e({
    id: 'remada-unilateral',
    nome: 'Remada unilateral com halter (serrote)',
    grupo: 'costas',
    principais: ['dorsal'],
    secundarios: ['romboides', 'biceps', 'deltoide-posterior'],
    equipamento: ['halter', 'banco'],
    camera: 'lado',
    passos: [
      'Apoie o joelho e a mão do mesmo lado no banco, a outra perna no chão.',
      'Com as costas retas, segure o halter com o braço esticado.',
      'Puxe o halter até a lateral do quadril, cotovelo junto ao corpo.',
      'Desça devagar, sentindo as costas alongarem.',
    ],
    erros: ['Girar o tronco para subir', 'Puxar até o ombro (vira bíceps)', 'Costas arredondadas'],
    atencao: [
      { em: 0.2, texto: 'Costas retas, paralelas ao chão' },
      { em: 0.5, texto: 'O halter vai até o quadril' },
    ],
  }),
  e({
    id: 'remada-baixa',
    nome: 'Remada baixa na polia',
    grupo: 'costas',
    principais: ['dorsal', 'romboides'],
    secundarios: ['biceps', 'trapezio', 'deltoide-posterior'],
    equipamento: ['polia'],
    camera: 'lado',
    passos: [
      'Sente com os pés no apoio, joelhos levemente dobrados, e segure o triângulo.',
      'Coluna reta e peito alto, braços esticados.',
      'Puxe o triângulo até o abdômen, cotovelos colados ao corpo.',
      'Volte devagar até esticar os braços, sem curvar a coluna.',
    ],
    erros: ['Balançar o tronco para frente e para trás', 'Encolher os ombros', 'Curvar as costas na volta'],
    atencao: [
      { em: 0.2, texto: 'Peito alto, coluna reta' },
      { em: 0.5, texto: 'O triângulo vem até o abdômen' },
    ],
  }),
  e({
    id: 'barra-fixa',
    nome: 'Barra fixa',
    grupo: 'costas',
    principais: ['dorsal'],
    secundarios: ['biceps', 'romboides', 'antebraco'],
    equipamento: ['barra-fixa'],
    nivel: 'avancado',
    reps: '6-10',
    descanso: 90,
    camera: 'tres-quartos',
    passos: [
      'Pendure na barra com as mãos um pouco mais abertas que os ombros, palmas para a frente.',
      'Encaixe os ombros (puxe para baixo) antes de subir.',
      'Suba até o queixo passar da barra, levando os cotovelos para baixo.',
      'Desça controlando até esticar os braços.',
    ],
    erros: ['Balançar as pernas para subir', 'Subir só até a metade', 'Despencar na descida'],
    atencao: [
      { em: 0.15, texto: 'Ombros encaixados antes de subir' },
      { em: 0.5, texto: 'O queixo passa da barra' },
    ],
    variacoes: ['puxada-frontal'],
  }),
  e({
    id: 'levantamento-terra',
    nome: 'Levantamento terra',
    grupo: 'costas',
    principais: ['gluteos', 'posteriores', 'lombar'],
    secundarios: ['quadriceps', 'trapezio', 'dorsal', 'antebraco'],
    equipamento: ['barra'],
    nivel: 'avancado',
    reps: '5-8',
    descanso: 120,
    camera: 'lado',
    passos: [
      'Pés na largura do quadril, a barra no meio do pé, encostando na canela.',
      'Agache segurando a barra por fora das pernas, coluna reta e peito alto.',
      'Empurre o chão com os pés e suba com a barra colada nas pernas.',
      'No alto, estenda o quadril sem inclinar para trás.',
      'Desça empurrando o quadril para trás, a barra raspando as coxas.',
    ],
    erros: ['Arredondar a coluna', 'Afastar a barra do corpo', 'Subir o quadril antes da barra', 'Inclinar para trás no alto'],
    atencao: [
      { em: 0.1, texto: 'Coluna reta, peito alto' },
      { em: 0.3, texto: 'A barra sobe colada nas pernas' },
      { em: 0.5, texto: 'Estenda o quadril no alto' },
      { em: 0.8, texto: 'Desça com o quadril para trás' },
    ],
  }),

  // ---------- Ombros ----------
  e({
    id: 'desenvolvimento-halteres',
    nome: 'Desenvolvimento com halteres',
    grupo: 'ombros',
    principais: ['deltoide-anterior', 'deltoide-lateral'],
    secundarios: ['triceps', 'trapezio'],
    equipamento: ['halter', 'banco'],
    camera: 'frente',
    passos: [
      'Sente com as costas apoiadas e os halteres na altura das orelhas, palmas para a frente.',
      'Empurre os halteres para cima até quase esticar os braços.',
      'Desça devagar até os cotovelos ficarem um pouco abaixo dos ombros.',
    ],
    erros: ['Arquear a lombar', 'Bater os halteres em cima', 'Descer pouco'],
    atencao: [
      { em: 0.5, texto: 'Os halteres sobem sem bater' },
      { em: 0.95, texto: 'Cotovelos um pouco abaixo do ombro' },
    ],
  }),
  e({
    id: 'elevacao-lateral',
    nome: 'Elevação lateral',
    grupo: 'ombros',
    principais: ['deltoide-lateral'],
    secundarios: ['trapezio', 'deltoide-anterior'],
    equipamento: ['halter'],
    reps: '12-15',
    camera: 'frente',
    passos: [
      'Em pé, um halter em cada mão ao lado do corpo, cotovelos levemente dobrados.',
      'Suba os braços pelas laterais até a altura dos ombros.',
      'Desça devagar, sem deixar os halteres baterem no corpo.',
    ],
    erros: ['Subir acima do ombro encolhendo o trapézio', 'Usar o embalo do corpo', 'Punho acima do cotovelo'],
    atencao: [
      { em: 0.45, texto: 'Suba até a altura dos ombros' },
      { em: 0.5, texto: 'Cotovelo guia o movimento' },
    ],
  }),
  e({
    id: 'elevacao-frontal',
    nome: 'Elevação frontal',
    grupo: 'ombros',
    principais: ['deltoide-anterior'],
    secundarios: ['peitoral', 'deltoide-lateral'],
    equipamento: ['halter'],
    camera: 'lado',
    passos: [
      'Em pé, halteres na frente das coxas, palmas para o corpo.',
      'Suba os braços esticados pela frente até a altura dos ombros.',
      'Desça devagar.',
    ],
    erros: ['Jogar o tronco para trás', 'Subir acima da cabeça', 'Balançar'],
    atencao: [{ em: 0.5, texto: 'Até a altura dos ombros' }],
  }),
  e({
    id: 'face-pull',
    nome: 'Face pull na polia',
    grupo: 'ombros',
    principais: ['deltoide-posterior'],
    secundarios: ['romboides', 'trapezio'],
    equipamento: ['polia'],
    reps: '12-15',
    camera: 'tres-quartos',
    passos: [
      'Polia na altura do rosto, com a corda; segure com as palmas para baixo.',
      'Dê um passo para trás, braços esticados.',
      'Puxe a corda em direção ao rosto, abrindo as mãos e levando os cotovelos para fora e para trás.',
      'Volte devagar.',
    ],
    erros: ['Puxar para o pescoço', 'Cotovelos baixos', 'Inclinar o corpo para trás'],
    atencao: [{ em: 0.5, texto: 'Cotovelos altos, as mãos abrem ao lado do rosto' }],
  }),

  // ---------- Bíceps ----------
  e({
    id: 'rosca-direta',
    nome: 'Rosca direta com barra',
    grupo: 'biceps',
    principais: ['biceps'],
    secundarios: ['antebraco'],
    equipamento: ['barra'],
    camera: 'lado',
    passos: [
      'Em pé, segure a barra na largura dos ombros, palmas para a frente.',
      'Cotovelos colados ao corpo.',
      'Suba a barra dobrando só os cotovelos até a altura do peito.',
      'Desça devagar até esticar os braços.',
    ],
    erros: ['Balançar o tronco', 'Levar os cotovelos para a frente', 'Descer pela metade'],
    atencao: [
      { em: 0.2, texto: 'Cotovelos parados ao lado do corpo' },
      { em: 0.5, texto: 'Suba até a altura do peito' },
      { em: 0.85, texto: 'Desça até esticar' },
    ],
  }),
  e({
    id: 'rosca-alternada',
    nome: 'Rosca alternada com halteres',
    grupo: 'biceps',
    principais: ['biceps'],
    secundarios: ['antebraco'],
    equipamento: ['halter'],
    camera: 'frente',
    passos: [
      'Em pé, halteres ao lado do corpo, palmas para dentro.',
      'Suba um halter girando a palma para cima, cotovelo parado.',
      'Desça devagar e repita com o outro braço.',
    ],
    erros: ['Balançar o corpo', 'Cotovelo indo para a frente'],
    atencao: [{ em: 0.25, texto: 'Gire a palma para cima ao subir' }],
  }),
  e({
    id: 'rosca-martelo',
    nome: 'Rosca martelo',
    grupo: 'biceps',
    principais: ['biceps', 'antebraco'],
    equipamento: ['halter'],
    camera: 'lado',
    passos: [
      'Em pé, halteres ao lado do corpo com as palmas uma para a outra.',
      'Suba os dois halteres sem girar o punho, como um martelo.',
      'Desça devagar.',
    ],
    erros: ['Girar o punho', 'Embalo do tronco'],
    atencao: [{ em: 0.5, texto: 'Palmas uma para a outra o tempo todo' }],
  }),
  e({
    id: 'rosca-scott',
    nome: 'Rosca Scott',
    grupo: 'biceps',
    principais: ['biceps'],
    secundarios: ['antebraco'],
    equipamento: ['banco-scott', 'barra'],
    camera: 'lado',
    passos: [
      'Sente no banco Scott com a parte de trás dos braços apoiada.',
      'Segure a barra com as palmas para cima.',
      'Suba a barra até perto dos ombros.',
      'Desça devagar até quase esticar (sem travar o cotovelo).',
    ],
    erros: ['Tirar o braço do apoio', 'Soltar a barra embaixo'],
    atencao: [{ em: 0.9, texto: 'Desça devagar, sem travar o cotovelo' }],
  }),

  // ---------- Tríceps ----------
  e({
    id: 'triceps-polia',
    nome: 'Tríceps na polia com barra',
    grupo: 'triceps',
    principais: ['triceps'],
    equipamento: ['polia'],
    camera: 'lado',
    passos: [
      'De frente para a polia alta, segure a barra com as palmas para baixo.',
      'Cotovelos colados ao corpo, tronco levemente inclinado.',
      'Empurre a barra para baixo até esticar os braços.',
      'Suba devagar até os antebraços passarem da horizontal.',
    ],
    erros: ['Abrir os cotovelos', 'Usar o peso do corpo', 'Subir demais e soltar o cotovelo'],
    atencao: [
      { em: 0.2, texto: 'Cotovelos colados ao corpo' },
      { em: 0.5, texto: 'Estique os braços embaixo' },
    ],
    variacoes: ['triceps-corda'],
  }),
  e({
    id: 'triceps-corda',
    nome: 'Tríceps corda',
    grupo: 'triceps',
    principais: ['triceps'],
    equipamento: ['polia'],
    camera: 'frente',
    passos: [
      'De frente para a polia alta, segure a corda com as palmas uma para a outra.',
      'Cotovelos colados ao corpo.',
      'Empurre a corda para baixo e abra as mãos no fim, ao lado das coxas.',
      'Suba devagar.',
    ],
    erros: ['Cotovelos soltos', 'Inclinar demais o tronco'],
    atencao: [{ em: 0.5, texto: 'Abra a corda no fim do movimento' }],
  }),
  e({
    id: 'triceps-testa',
    nome: 'Tríceps testa',
    grupo: 'triceps',
    principais: ['triceps'],
    equipamento: ['barra', 'banco'],
    nivel: 'intermediario',
    camera: 'lado',
    passos: [
      'Deite no banco com a barra acima do peito, braços esticados.',
      'Dobre só os cotovelos, levando a barra até perto da testa.',
      'Estique os braços de volta, sem mexer os ombros.',
    ],
    erros: ['Abrir os cotovelos', 'Mexer o braço inteiro (vira pullover)'],
    atencao: [
      { em: 0.5, texto: 'A barra desce até perto da testa' },
      { em: 0.55, texto: 'Os braços não saem do lugar' },
    ],
  }),
  e({
    id: 'triceps-frances',
    nome: 'Tríceps francês com halter',
    grupo: 'triceps',
    principais: ['triceps'],
    equipamento: ['halter', 'banco'],
    camera: 'lado',
    passos: [
      'Sente com as costas retas e segure um halter com as duas mãos acima da cabeça.',
      'Desça o halter atrás da cabeça dobrando os cotovelos, que apontam para cima.',
      'Estique os braços de volta.',
    ],
    erros: ['Cotovelos abrindo para os lados', 'Arquear a lombar'],
    atencao: [{ em: 0.5, texto: 'Cotovelos apontando para cima' }],
  }),
  e({
    id: 'mergulho-banco',
    nome: 'Mergulho no banco',
    grupo: 'triceps',
    principais: ['triceps'],
    secundarios: ['peitoral', 'deltoide-anterior'],
    equipamento: ['banco', 'peso-corporal'],
    camera: 'lado',
    passos: [
      'Apoie as mãos na beira do banco, atrás do corpo, e estique as pernas à frente.',
      'Desça o quadril dobrando os cotovelos até uns 90°.',
      'Empurre o banco e suba esticando os braços.',
    ],
    erros: ['Descer demais (força o ombro)', 'Afastar o quadril do banco'],
    atencao: [{ em: 0.5, texto: 'Cotovelos a 90°, o quadril perto do banco' }],
  }),

  // ---------- Pernas e glúteos ----------
  e({
    id: 'agachamento-livre',
    nome: 'Agachamento livre com barra',
    grupo: 'pernas',
    principais: ['quadriceps', 'gluteos'],
    secundarios: ['posteriores', 'adutores', 'lombar', 'abdomen'],
    equipamento: ['barra', 'suporte'],
    nivel: 'intermediario',
    reps: '8-12',
    descanso: 120,
    camera: 'lado',
    passos: [
      'A barra apoiada no trapézio (não no pescoço), pés na largura dos ombros, pontas um pouco para fora.',
      'Respire fundo e trave o abdômen.',
      'Desça levando o quadril para trás e para baixo, os joelhos acompanhando a ponta dos pés.',
      'Desça até as coxas ficarem paralelas ao chão (ou o quanto conseguir com a coluna reta).',
      'Suba empurrando o chão, sem tirar o calcanhar.',
    ],
    erros: ['Joelhos entrando para dentro', 'Tirar o calcanhar do chão', 'Arredondar a lombar embaixo', 'Inclinar demais o tronco'],
    atencao: [
      { em: 0.12, texto: 'Abdômen travado, peito aberto' },
      { em: 0.35, texto: 'Quadril para trás, joelhos na direção dos pés' },
      { em: 0.5, texto: 'Coxas paralelas ao chão' },
      { em: 0.75, texto: 'Calcanhar no chão, empurre o chão' },
    ],
    variacoes: ['agachamento-sumo', 'agachamento-bulgaro', 'leg-press'],
  }),
  e({
    id: 'leg-press',
    nome: 'Leg press 45°',
    grupo: 'pernas',
    principais: ['quadriceps', 'gluteos'],
    secundarios: ['posteriores', 'adutores'],
    equipamento: ['leg-press'],
    descanso: 90,
    camera: 'lado',
    passos: [
      'Sente com as costas e o quadril colados no encosto, pés no meio da plataforma na largura do quadril.',
      'Destrave a plataforma e desça dobrando os joelhos até uns 90°.',
      'Empurre a plataforma com o pé inteiro até quase esticar as pernas.',
    ],
    erros: ['Tirar o quadril do banco embaixo', 'Travar os joelhos em cima', 'Joelhos para dentro'],
    atencao: [
      { em: 0.5, texto: 'Joelhos a 90°, o quadril não sai do banco' },
      { em: 0.95, texto: 'Não trave os joelhos em cima' },
    ],
  }),
  e({
    id: 'cadeira-extensora',
    nome: 'Cadeira extensora',
    grupo: 'pernas',
    principais: ['quadriceps'],
    equipamento: ['extensora'],
    reps: '12-15',
    camera: 'lado',
    passos: [
      'Sente com as costas apoiadas e o rolo na frente do tornozelo; o joelho alinhado ao eixo da máquina.',
      'Estique as pernas até em cima e segure um instante.',
      'Desça devagar.',
    ],
    erros: ['Chutar o peso', 'Tirar o quadril do banco', 'Eixo da máquina desalinhado do joelho'],
    atencao: [
      { em: 0.5, texto: 'Estique e segure um instante' },
      { em: 0.85, texto: 'Desça devagar' },
    ],
  }),
  e({
    id: 'mesa-flexora',
    nome: 'Mesa flexora',
    grupo: 'pernas',
    principais: ['posteriores'],
    secundarios: ['panturrilha'],
    equipamento: ['flexora'],
    reps: '12-15',
    camera: 'lado',
    passos: [
      'Deite de bruços com o rolo logo acima dos calcanhares, joelhos fora do banco.',
      'Dobre as pernas trazendo o rolo em direção ao glúteo.',
      'Desça devagar, sem deixar o peso bater.',
    ],
    erros: ['Tirar o quadril do banco', 'Descer rápido'],
    atencao: [{ em: 0.5, texto: 'O quadril colado no banco' }],
  }),
  e({
    id: 'afundo',
    nome: 'Afundo com halteres',
    grupo: 'pernas',
    principais: ['quadriceps', 'gluteos'],
    secundarios: ['posteriores', 'adutores'],
    equipamento: ['halter'],
    camera: 'lado',
    passos: [
      'Em pé com um halter em cada mão, dê um passo largo à frente.',
      'Desça até o joelho de trás quase tocar o chão, os dois joelhos a 90°.',
      'Empurre com a perna da frente e volte.',
    ],
    erros: ['Joelho da frente passando muito do pé', 'Tronco caindo para a frente', 'Passo curto'],
    atencao: [
      { em: 0.5, texto: 'Os dois joelhos a 90°' },
      { em: 0.55, texto: 'Tronco reto' },
    ],
  }),
  e({
    id: 'stiff',
    nome: 'Stiff com barra',
    grupo: 'pernas',
    principais: ['posteriores', 'gluteos'],
    secundarios: ['lombar'],
    equipamento: ['barra'],
    nivel: 'intermediario',
    camera: 'lado',
    passos: [
      'Em pé com a barra na frente das coxas, joelhos levemente dobrados (e parados).',
      'Desça a barra rente às pernas levando o quadril para trás, coluna reta.',
      'Desça até sentir a parte de trás da coxa alongar (perto do meio da canela).',
      'Suba empurrando o quadril para a frente.',
    ],
    erros: ['Arredondar as costas', 'Dobrar os joelhos ao descer (vira terra)', 'Barra longe das pernas'],
    atencao: [
      { em: 0.3, texto: 'Quadril para trás, coluna reta' },
      { em: 0.5, texto: 'Sinta a parte de trás da coxa' },
    ],
  }),
  e({
    id: 'elevacao-pelvica',
    nome: 'Elevação pélvica com barra',
    grupo: 'pernas',
    principais: ['gluteos'],
    secundarios: ['posteriores', 'abdomen'],
    equipamento: ['barra', 'banco'],
    nivel: 'intermediario',
    camera: 'lado',
    passos: [
      'Sente no chão com a parte de cima das costas apoiada no banco e a barra sobre o quadril.',
      'Pés no chão na largura do quadril, joelhos dobrados.',
      'Suba o quadril até o tronco ficar reto, alinhado às coxas, contraindo o glúteo.',
      'Desça controlando.',
    ],
    erros: ['Arquear a lombar em cima', 'Pés longe demais (puxa o posterior)', 'Empurrar com a ponta do pé'],
    atencao: [
      { em: 0.5, texto: 'Tronco e coxas na mesma linha' },
      { em: 0.55, texto: 'Contraia o glúteo em cima' },
    ],
  }),
  e({
    id: 'agachamento-bulgaro',
    nome: 'Agachamento búlgaro',
    grupo: 'pernas',
    principais: ['quadriceps', 'gluteos'],
    secundarios: ['adutores', 'posteriores'],
    equipamento: ['halter', 'banco'],
    nivel: 'intermediario',
    camera: 'lado',
    passos: [
      'De costas para o banco, apoie o peito do pé de trás nele.',
      'Com um halter em cada mão, desça até a coxa da frente ficar paralela ao chão.',
      'Suba empurrando com a perna da frente.',
    ],
    erros: ['Pé da frente perto demais do banco', 'Joelho entrando para dentro'],
    atencao: [{ em: 0.5, texto: 'Coxa da frente paralela ao chão' }],
  }),
  e({
    id: 'agachamento-sumo',
    nome: 'Agachamento sumô',
    grupo: 'pernas',
    principais: ['gluteos', 'adutores', 'quadriceps'],
    equipamento: ['kettlebell'],
    camera: 'frente',
    passos: [
      'Pés bem afastados, pontas para fora, segurando o kettlebell com as duas mãos na frente do corpo.',
      'Desça com o tronco reto, os joelhos abrindo na direção dos pés.',
      'Suba contraindo o glúteo.',
    ],
    erros: ['Joelhos fechando', 'Curvar o tronco'],
    atencao: [{ em: 0.5, texto: 'Joelhos abertos, na direção dos pés' }],
  }),
  e({
    id: 'panturrilha-em-pe',
    nome: 'Panturrilha em pé',
    grupo: 'pernas',
    principais: ['panturrilha'],
    equipamento: ['halter', 'peso-corporal'],
    reps: '15-20',
    descanso: 45,
    camera: 'lado',
    passos: [
      'Em pé, com a ponta dos pés num degrau e um halter em cada mão.',
      'Suba na ponta dos pés o mais alto que conseguir e segure um instante.',
      'Desça até o calcanhar ficar abaixo do degrau.',
    ],
    erros: ['Movimento curto', 'Quicar embaixo'],
    atencao: [
      { em: 0.5, texto: 'Suba o máximo e segure' },
      { em: 0.95, texto: 'O calcanhar desce abaixo do degrau' },
    ],
  }),

  // ---------- Abdômen ----------
  e({
    id: 'prancha',
    nome: 'Prancha',
    grupo: 'abdomen',
    principais: ['abdomen'],
    secundarios: ['obliquos', 'deltoide-anterior', 'gluteos'],
    equipamento: ['colchonete'],
    medida: 'tempo',
    reps: '30s',
    descanso: 45,
    camera: 'lado',
    passos: [
      'Apoie os antebraços no chão, cotovelos embaixo dos ombros.',
      'Estique as pernas, corpo reto da cabeça aos calcanhares.',
      'Contraia o abdômen e o glúteo e segure, respirando.',
    ],
    erros: ['Quadril caindo', 'Quadril alto demais', 'Prender a respiração'],
    atencao: [
      { em: 0.3, texto: 'Corpo reto da cabeça aos pés' },
      { em: 0.7, texto: 'Respire sem soltar o abdômen' },
    ],
  }),
  e({
    id: 'abdominal-supra',
    nome: 'Abdominal supra',
    grupo: 'abdomen',
    principais: ['abdomen'],
    secundarios: ['obliquos'],
    equipamento: ['colchonete'],
    reps: '15-20',
    descanso: 45,
    camera: 'lado',
    passos: [
      'Deite com os joelhos dobrados e os pés no chão, mãos ao lado da cabeça.',
      'Suba só a parte de cima das costas, aproximando as costelas do quadril.',
      'Desça devagar.',
    ],
    erros: ['Puxar o pescoço com as mãos', 'Subir o tronco inteiro com embalo'],
    atencao: [{ em: 0.5, texto: 'As costelas vêm em direção ao quadril' }],
  }),
  e({
    id: 'elevacao-pernas',
    nome: 'Elevação de pernas',
    grupo: 'abdomen',
    principais: ['abdomen'],
    secundarios: ['obliquos'],
    equipamento: ['colchonete'],
    reps: '12-15',
    descanso: 45,
    camera: 'lado',
    passos: [
      'Deite de barriga para cima, mãos ao lado do corpo ou embaixo do quadril.',
      'Suba as pernas esticadas até formarem 90° com o tronco.',
      'Desça devagar sem encostar os pés no chão.',
    ],
    erros: ['Arquear a lombar ao descer', 'Usar o embalo'],
    atencao: [{ em: 0.85, texto: 'A lombar fica no chão ao descer' }],
  }),

  // ---------- Funcional e cardio ----------
  e({
    id: 'burpee',
    nome: 'Burpee',
    grupo: 'funcional',
    principais: ['quadriceps', 'peitoral'],
    secundarios: ['gluteos', 'triceps', 'abdomen', 'deltoide-anterior'],
    equipamento: ['peso-corporal'],
    nivel: 'intermediario',
    reps: '10',
    camera: 'lado',
    passos: [
      'Em pé, agache e apoie as mãos no chão.',
      'Jogue os pés para trás e fique em prancha.',
      'Faça uma flexão (opcional), traga os pés de volta.',
      'Suba e salte com os braços para cima.',
    ],
    erros: ['Quadril caindo na prancha', 'Aterrissar com as pernas duras'],
    atencao: [
      { em: 0.3, texto: 'Prancha com o corpo reto' },
      { em: 0.85, texto: 'Salte e aterrisse macio' },
    ],
  }),
  e({
    id: 'polichinelo',
    nome: 'Polichinelo',
    grupo: 'funcional',
    principais: ['panturrilha', 'deltoide-lateral'],
    secundarios: ['gluteos', 'adutores'],
    equipamento: ['peso-corporal'],
    medida: 'tempo',
    reps: '40s',
    descanso: 30,
    camera: 'frente',
    cardio: true,
    passos: ['Em pé, braços ao lado do corpo.', 'Salte abrindo as pernas e subindo os braços acima da cabeça.', 'Salte de volta fechando pernas e braços.'],
    erros: ['Aterrissar com o calcanhar', 'Braços pela metade'],
    atencao: [{ em: 0.5, texto: 'Aterrisse na ponta dos pés' }],
  }),
  e({
    id: 'kettlebell-swing',
    nome: 'Kettlebell swing',
    grupo: 'funcional',
    principais: ['gluteos', 'posteriores'],
    secundarios: ['lombar', 'deltoide-anterior', 'abdomen'],
    equipamento: ['kettlebell'],
    nivel: 'intermediario',
    reps: '15',
    camera: 'lado',
    passos: [
      'Pés um pouco mais abertos que os ombros, o kettlebell com as duas mãos.',
      'Leve o kettlebell para trás entre as pernas, quadril para trás, coluna reta.',
      'Estenda o quadril com força e deixe o kettlebell subir até a altura do peito.',
      'Deixe descer e repita no embalo do quadril (não dos braços).',
    ],
    erros: ['Agachar em vez de levar o quadril para trás', 'Levantar com os braços', 'Arredondar as costas'],
    atencao: [
      { em: 0.15, texto: 'Quadril para trás, coluna reta' },
      { em: 0.5, texto: 'A força vem do quadril' },
    ],
  }),
  e({
    id: 'esteira',
    nome: 'Esteira',
    grupo: 'funcional',
    principais: ['quadriceps', 'panturrilha'],
    secundarios: ['gluteos', 'posteriores'],
    equipamento: ['esteira'],
    medida: 'tempo',
    series: 1,
    reps: '20min',
    descanso: 0,
    camera: 'lado',
    cardio: true,
    passos: ['Suba com a esteira parada e prenda a chave de segurança.', 'Comece caminhando e aumente a velocidade aos poucos.', 'Corra com o tronco reto, pisando embaixo do quadril.'],
    erros: ['Segurar nas laterais o tempo todo', 'Passada longa demais'],
    atencao: [{ em: 0.5, texto: 'Tronco reto, passada curta' }],
  }),
  e({
    id: 'bike',
    nome: 'Bike',
    grupo: 'funcional',
    principais: ['quadriceps'],
    secundarios: ['gluteos', 'posteriores', 'panturrilha'],
    equipamento: ['bike'],
    medida: 'tempo',
    series: 1,
    reps: '20min',
    descanso: 0,
    camera: 'lado',
    cardio: true,
    passos: ['Ajuste o banco na altura do quadril.', 'Pedale com o joelho quase esticado embaixo.', 'Mantenha o tronco firme, sem balançar.'],
    erros: ['Banco baixo demais (força o joelho)', 'Balançar o quadril'],
    atencao: [{ em: 0.5, texto: 'Joelho quase esticado embaixo' }],
  }),
]

export const EXERCICIO = Object.fromEntries(EXERCICIOS.map((x) => [x.id, x])) as Record<string, Exercicio>

export const nomeExercicio = (id: string) => EXERCICIO[id]?.nome ?? id

// Os do mesmo grupo (para trocar no meio do treino)
export const parecidos = (id: string) => {
  const x = EXERCICIO[id]
  if (!x) return []
  return EXERCICIOS.filter((o) => o.id !== id && (o.grupo === x.grupo || o.principais.some((mu) => x.principais.includes(mu)))).slice(0, 6)
}

export function buscarExercicios(termo: string, grupo?: Grupo) {
  const t = termo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
  return EXERCICIOS.filter((x) => {
    if (grupo && x.grupo !== grupo) return false
    if (!t) return true
    const alvo = `${x.nome} ${MUSCULOS[x.principais[0]]} ${x.equipamento.map((q) => EQUIPAMENTOS[q]).join(' ')}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
    return t.split(/\s+/).every((p) => alvo.includes(p))
  })
}
