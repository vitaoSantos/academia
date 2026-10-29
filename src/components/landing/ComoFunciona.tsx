import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { PiCheckCircleFill } from 'react-icons/pi'
import { FAMILIAS, MODALIDADES } from '../../shared/modalidades'
import { easeSuave } from '../ui/basicos'
import { AgendaEChat, Celular, GradeDeAulas, MapaRegiao, PerfilPersonal, PostTreinoPago, RankingDesafio, TelaFicha, TelaTreino } from './Mockups'

// Como funciona, rolando (seção 19 do estudo): cada parte com a tela de exemplo do lado

function Bloco({ sobre, titulo, texto, pontos, visual, invertido = false }: { sobre: string; titulo: ReactNode; texto: ReactNode; pontos: string[]; visual: ReactNode; invertido?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: easeSuave }}
      className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16"
    >
      <div className={invertido ? 'lg:order-2' : ''}>
        <p className="sobre">{sobre}</p>
        <h3 className="titulo mt-2 text-4xl sm:text-5xl">{titulo}</h3>
        <p className="mt-4 max-w-lg text-suave">{texto}</p>
        <ul className="mt-5 space-y-2.5">
          {pontos.map((p) => (
            <li key={p} className="flex gap-2.5 text-sm">
              <PiCheckCircleFill className="mt-0.5 shrink-0 text-lg text-anilha-legivel" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={`flex justify-center ${invertido ? 'lg:order-1' : ''}`}>{visual}</div>
    </motion.div>
  )
}

export function ComoFunciona() {
  const familias = Object.entries(FAMILIAS).filter(([id]) => MODALIDADES.some((m) => m.familia === id))
  return (
    <section className="margem mx-auto max-w-7xl py-10" aria-labelledby="como-funciona" id="como-funciona">
      <p className="sobre">Como funciona</p>
      <h2 id="como-funciona-titulo" className="titulo mt-2 text-5xl sm:text-6xl">
        Do mapa ao treino pago
      </h2>

      <Bloco
        sobre="A ficha"
        titulo="A ficha no celular, com o exercício em 3D"
        texto="O professor monta a ficha com o catálogo de exercícios e o aluno recebe o aviso na hora. Cada exercício tem o boneco fazendo o movimento certo, com os músculos acesos na cor da academia."
        pontos={['A data de previsão: o aluno sabe quando trocar, o professor vê quem está vencendo', 'O personal reaproveita a mesma ficha em outro aluno com um toque', 'Os pontos de atenção aparecem na fase certa do movimento']}
        visual={
          <Celular>
            <TelaFicha />
          </Celular>
        }
      />

      <Bloco
        invertido
        sobre="O treino ao vivo"
        titulo="Carga, repetições e o descanso contando"
        texto="Toque para marcar a série e o descanso começa. O app lembra a carga da última vez, mostra o recorde e funciona mesmo com a internet ruim da academia."
        pontos={['A série que falta fica marcada; o celular vibra no fim do descanso', 'Recordes de carga e de força calculados sozinhos', 'O treino vai para o histórico e para os gráficos de evolução']}
        visual={
          <Celular>
            <TelaTreino />
          </Celular>
        }
      />

      <Bloco
        sobre="A rede"
        titulo="Treino pago, 💪 e desafios"
        texto="Terminou? Poste o “treino pago” com o resumo de verdade (do treino feito, não digitado), marque a academia e o professor e entre nos desafios da turma."
        pontos={['O feed da sua região, de quem você segue e da sua academia', 'Perfil privado de padrão: só quem você aprova vê os seus treinos', 'Desafios por dias, check-ins ou minutos, com ranking']}
        visual={
          <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
            <PostTreinoPago />
            <RankingDesafio />
          </div>
        }
      />

      <Bloco
        invertido
        sobre="A sua região"
        titulo="Só o que fica perto de você"
        texto="Escolha a cidade ou use o GPS: o mapa, a rede e os desafios mostram o que está a até 50 km (ou 10, 25, 100). Quem treina em São Lourenço não vê Poços de Caldas."
        pontos={['Academias, estúdios, CTs, escolas de dança e personais no mesmo mapa', 'O professor que dá aula em três lugares aparece nos três', 'Os destaques da região são das academias e dos personais premium']}
        visual={<MapaRegiao />}
      />

      <Bloco
        sobre="Modalidades"
        titulo="Muito além da musculação"
        texto="Lutas com as faixas e os graus, dança, pilates, yoga, natação, cross e as aulas coletivas: cada uma com a grade da semana, a reserva de vaga, a fila de espera e a aula experimental."
        pontos={['Lugar marcado no spinning, check-in na chegada', 'Graduação de faixa com o histórico (jiu-jitsu, judô, karatê, taekwondo, muay thai, capoeira)', 'Eventos e aulões com quem vai']}
        visual={
          <div className="flex w-full flex-col items-center gap-4">
            <GradeDeAulas />
            <div className="flex max-w-sm flex-wrap justify-center gap-1.5">
              {familias.map(([id, f]) => (
                <span key={id} className="chip">
                  <span className="size-2 rounded-full" style={{ background: f.cor }} /> {f.nome}
                </span>
              ))}
            </div>
          </div>
        }
      />

      <Bloco
        invertido
        sobre="O perfil do personal"
        titulo="Os seus números falam por você"
        texto="A página do personal e do professor mostra os alunos que já instruiu, a nota de quem treinou de verdade e onde atende. Vira um cartão pronto para os stories."
        pontos={['Perfil público ou fechado, quando quiser', 'Avaliação só de quem treinou (ou treina) com você, com a sua resposta', 'O cartão com o QR do seu perfil para o Instagram']}
        visual={<PerfilPersonal />}
      />

      <Bloco
        sobre="Agenda e chat"
        titulo="Os horários e a conversa no mesmo lugar"
        texto="O personal abre os horários da semana e o aluno marca sozinho (ou fixa o horário de sempre). A conversa fica no app: aluno com aluno, com o professor e com a academia."
        pontos={['Horário fixo semanal e o desmarcar com antecedência', 'A agenda do professor da academia, se ela quiser', 'Telefone e link não passam entre alunos que não se seguem']}
        visual={<AgendaEChat />}
      />
    </section>
  )
}
