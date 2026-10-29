import { PiPlus } from 'react-icons/pi'

// As perguntas frequentes (seção 19 do estudo)

const PERGUNTAS: [string, string][] = [
  ['Preciso pagar para usar como aluno?', 'Não. A ficha do seu professor, o treino ao vivo, o histórico, as medidas, a rede, o chat e os desafios são grátis. O Turma+ é opcional: fichas suas sem limite, histórico completo e fotos de evolução lado a lado.'],
  ['Minha academia não está na Turma. Posso usar?', 'Pode. Você monta uma ficha sua, registra os treinos e entra na rede da sua cidade. Quando a academia (ou o seu personal) chegar, as fichas dele aparecem junto.'],
  ['Treino na academia e tenho personal. Como fica?', 'As duas fichas aparecem no mesmo lugar. Você escolhe qual marca o app veste e quem pode ver as suas medidas: um interruptor para cada um.'],
  ['Quem vê os meus treinos e o meu peso?', 'O perfil começa privado: só quem você aprova vê os seus posts. As medidas e as fotos de evolução são só suas; o professor vê se você deixar, e você pode tirar quando quiser.'],
  ['O professor que dá aula em mais de um lugar precisa de várias contas?', 'Não. É uma conta só: cada academia convida, e a página dele mostra todos os lugares onde dá aula.'],
  ['E as lutas, a dança, o pilates?', 'Cada modalidade tem a grade da semana, a reserva de vaga com fila de espera, o lugar marcado (spinning), a aula experimental e, nas lutas, a graduação de faixas e graus com o histórico.'],
  ['Como o aluno instala o app da academia?', 'Pelo link da academia: no celular, "Adicionar à tela inicial". O ícone, o nome e a cor são os da academia, e o app abre direto nela. Sem loja.'],
  ['Como funciona o teste da academia e do personal?', 'São 30 dias com tudo do Premium, sem cartão. No fim, você escolhe o Básico ou o Premium. A rede com 3 unidades ou mais tem desconto em todas.'],
  ['O exercício em 3D substitui o professor?', 'Não. O boneco mostra o movimento de referência, com os músculos e os pontos de atenção; quem ajusta para o seu corpo é o seu professor.'],
]

export function Perguntas() {
  return (
    <section className="margem mx-auto max-w-3xl py-16" aria-labelledby="perguntas">
      <p className="sobre">Perguntas frequentes</p>
      <h2 id="perguntas" className="titulo mt-2 text-5xl">
        Ficou alguma dúvida?
      </h2>
      <div className="mt-8 divide-y divide-linha border-y border-linha">
        {PERGUNTAS.map(([p, r]) => (
          <details key={p} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold [&::-webkit-details-marker]:hidden">
              {p}
              <PiPlus className="shrink-0 text-lg text-fraco transition-transform group-open:rotate-45" />
            </summary>
            <p className="pb-5 text-sm text-suave">{r}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
