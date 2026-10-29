import type { ReactNode } from 'react'
import { PiCheckBold, PiHeartFill, PiMapPinFill, PiPlayFill, PiStarFill } from 'react-icons/pi'

// As telas de exemplo da landing (desenhadas em HTML, sem 3D: a capa já tem a cena do boneco)

export function Celular({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-[17.5rem] rounded-[2.6rem] border border-linha-2 bg-[#0b0b0d] p-2.5 shadow-2xl ${className}`}>
      <div className="relative overflow-hidden rounded-[2.1rem] bg-fundo">
        <div className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
        <div className="h-[33rem] overflow-hidden pt-9">{children}</div>
      </div>
    </div>
  )
}

const Linha = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`border-b border-linha px-4 py-3 ${className}`}>{children}</div>

export function TelaFicha() {
  const itens = [
    ['Supino reto com barra', '4 × 8-12', '40 kg'],
    ['Supino inclinado com halteres', '3 × 10-12', '16 kg'],
    ['Crucifixo com halteres', '3 × 12', '10 kg'],
    ['Tríceps na polia', '4 × 12', '25 kg'],
  ]
  return (
    <div className="text-[0.8rem]">
      <div className="px-4">
        <p className="text-[0.62rem] font-bold tracking-widest text-fraco uppercase">Rafael Moreira · personal</p>
        <p className="titulo mt-1 text-2xl">Hipertrofia, fase 2</p>
        <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-ok">
          <span className="size-1.5 rounded-full bg-ok" /> Em dia · troca em 12/11
        </p>
        <div className="mt-3 flex gap-1.5">
          {['A', 'B', 'C'].map((l, i) => (
            <span key={l} className={`grid size-8 place-items-center rounded-lg font-bold ${i === 0 ? 'bg-anilha text-anilha-texto' : 'bg-sup-2 text-suave'}`}>
              {l}
            </span>
          ))}
          <span className="ml-1 self-center text-[0.7rem] text-suave">Peito e tríceps</span>
        </div>
      </div>
      <div className="mt-3 border-t border-linha">
        {itens.map(([nome, series, carga], i) => (
          <Linha key={nome} className="flex items-center gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${i === 0 ? 'bg-anilha-suave text-anilha-legivel' : 'bg-sup-2 text-fraco'}`}>
              <PiPlayFill />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{nome}</span>
              <span className="text-[0.7rem] text-suave">
                {series} · {carga}
              </span>
            </span>
          </Linha>
        ))}
      </div>
      <div className="px-4 pt-4">
        <span className="btn btn-anilha btn-m w-full">Treinar A</span>
      </div>
    </div>
  )
}

export function TelaTreino() {
  const series = [
    [12, '40', true],
    [10, '42,5', true],
    [8, '45', false],
    [8, '45', false],
  ] as const
  return (
    <div className="px-4 text-[0.8rem]">
      <div className="flex items-center justify-between text-[0.7rem] text-suave">
        <span>A · Peito e tríceps</span>
        <span className="dado font-bold text-texto">32:14</span>
      </div>
      <p className="titulo mt-3 text-2xl">Supino reto</p>
      <p className="text-[0.7rem] text-suave">Última vez: 10 × 40 kg</p>
      <div className="mt-3 space-y-1.5">
        <div className="grid grid-cols-[1.5rem_1fr_1fr_2rem] gap-2 px-1 text-[0.62rem] font-bold tracking-wide text-fraco uppercase">
          <span>#</span>
          <span>Reps</span>
          <span>Kg</span>
          <span />
        </div>
        {series.map(([reps, carga, feita], i) => (
          <div key={i} className={`grid grid-cols-[1.5rem_1fr_1fr_2rem] items-center gap-2 rounded-xl px-1 py-1.5 ${feita ? 'bg-ok/10' : i === 2 ? 'bg-sup-2 ring-1 ring-anilha' : 'bg-sup-2'}`}>
            <span className="text-center font-bold text-suave">{i + 1}</span>
            <span className="dado font-bold">{reps}</span>
            <span className="dado font-bold">{carga}</span>
            <span className={`grid size-7 place-items-center rounded-lg ${feita ? 'bg-ok text-white' : 'border border-linha-2'}`}>{feita && <PiCheckBold />}</span>
          </div>
        ))}
      </div>
      {/* o descanso */}
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-sup-2 p-4">
        <svg viewBox="0 0 44 44" className="size-16 -rotate-90" aria-hidden>
          <circle cx="22" cy="22" r="19" fill="none" stroke="var(--sup-3)" strokeWidth="4" />
          <circle cx="22" cy="22" r="19" fill="none" stroke="var(--anilha)" strokeWidth="4" strokeLinecap="round" strokeDasharray="119.4" strokeDashoffset="42" />
        </svg>
        <div>
          <p className="text-[0.62rem] font-bold tracking-widest text-fraco uppercase">Descanso</p>
          <p className="titulo dado text-3xl">01:12</p>
          <p className="text-[0.7rem] text-suave">O celular vibra no fim</p>
        </div>
      </div>
    </div>
  )
}

export function PostTreinoPago() {
  return (
    <div className="cartao w-full max-w-sm p-4 text-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-[#ff4fa3] font-bold text-white">AS</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Ana Souza</p>
          <p className="text-xs text-fraco">Força Total · Centro · há 12 min</p>
        </div>
      </div>
      <p className="mt-3">Treino C pago! 🔥 Recorde no agachamento.</p>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-sup-2 p-3 text-center">
        <div>
          <p className="titulo dado text-2xl">52</p>
          <p className="text-[0.65rem] text-suave">minutos</p>
        </div>
        <div>
          <p className="titulo dado text-2xl">6,8 t</p>
          <p className="text-[0.65rem] text-suave">de volume</p>
        </div>
        <div>
          <p className="titulo dado text-2xl text-anilha-legivel">1</p>
          <p className="text-[0.65rem] text-suave">recorde</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-4 text-xs text-suave">
        <span>💪 18</span>
        <span>💬 4</span>
      </p>
    </div>
  )
}

export function RankingDesafio() {
  const linhas = [
    ['Lucas P.', 14],
    ['Ana S.', 13],
    ['Você', 11],
    ['Gabi L.', 9],
  ] as const
  return (
    <div className="cartao w-full max-w-xs p-4 text-sm">
      <p className="text-[0.62rem] font-bold tracking-widest text-fraco uppercase">Desafio · Força Total</p>
      <p className="titulo mt-1 text-2xl">20 dias de outubro</p>
      <ol className="mt-3 space-y-1.5">
        {linhas.map(([nome, pts], i) => (
          <li key={nome} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${nome === 'Você' ? 'bg-anilha-suave font-bold' : 'bg-sup-2'}`}>
            <span className="dado w-4 text-suave">{i + 1}</span>
            <span className="flex-1">{nome}</span>
            <span className="dado font-bold">{pts} dias</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// O mapa da região, desenhado: o raio de 50 km em volta de São Lourenço; Poços fica de fora
export function MapaRegiao() {
  const pinos = [
    [205, 168, '#f5c518'],
    [228, 190, '#e3262f'],
    [188, 205, '#5f8a6e'],
    [250, 150, '#ff4fa3'],
    [160, 140, '#f0560e'],
    [270, 230, '#2ec5e8'],
  ] as const
  return (
    <svg viewBox="0 0 440 340" className="h-auto w-full max-w-md" role="img" aria-label="O mapa da região: as academias num raio de 50 km; Poços de Caldas, a 161 km, fica de fora">
      <rect width="440" height="340" rx="28" fill="var(--sup)" />
      <g stroke="var(--linha-2)" strokeWidth="1" opacity="0.6">
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M0 ${30 + i * 32} C 120 ${10 + i * 30}, 300 ${50 + i * 34}, 440 ${25 + i * 31}`} fill="none" />
        ))}
      </g>
      <circle cx="215" cy="185" r="112" fill="var(--anilha)" fillOpacity="0.07" stroke="var(--anilha)" strokeOpacity="0.7" strokeDasharray="6 6" strokeWidth="1.5" />
      <text x="215" y="66" textAnchor="middle" fill="var(--anilha-legivel)" fontSize="12" fontWeight="700">
        50 km
      </text>
      {pinos.map(([x, y, cor], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="11" fill={cor} stroke="var(--fundo)" strokeWidth="3" />
        </g>
      ))}
      <g transform="translate(215 185)">
        <circle r="7" fill="var(--texto)" />
        <circle r="15" fill="none" stroke="var(--texto)" strokeOpacity="0.4" strokeWidth="2" />
      </g>
      <text x="215" y="214" textAnchor="middle" fill="var(--texto)" fontSize="12" fontWeight="700">
        São Lourenço
      </text>
      <g transform="translate(52 286)" opacity="0.55">
        <circle r="8" fill="var(--fraco)" />
        <text x="16" y="4" fill="var(--suave)" fontSize="12">
          Poços de Caldas · 161 km
        </text>
      </g>
    </svg>
  )
}

export function GradeDeAulas() {
  const aulas = [
    ['07:00', 'Spinning', 'Lugar 14 marcado', '12/20', '#22d3ee'],
    ['18:30', 'Jiu-jitsu adulto', 'Faixa azul ou mais', '9/16', '#e3262f'],
    ['19:30', 'Zumba', 'Livre', '21/30', '#ff4fa3'],
    ['20:00', 'Pilates solo', 'Fila de espera: 2', '12/12', '#5f8a6e'],
  ] as const
  return (
    <div className="cartao w-full max-w-sm p-4 text-sm">
      <p className="text-[0.62rem] font-bold tracking-widest text-fraco uppercase">Hoje · Força Total Centro</p>
      <ul className="mt-3 space-y-2">
        {aulas.map(([h, nome, info, vagas, cor]) => (
          <li key={nome} className="flex items-center gap-3 rounded-xl bg-sup-2 p-3">
            <span className="dado w-11 font-bold">{h}</span>
            <span className="h-8 w-1 rounded-full" style={{ background: cor }} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{nome}</span>
              <span className="text-xs text-suave">{info}</span>
            </span>
            <span className="dado text-xs text-suave">{vagas}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-linha p-3">
        {/* a faixa azul com dois graus */}
        <span className="relative h-4 w-20 rounded-sm bg-[#1f4fbf]" aria-hidden>
          <span className="absolute inset-y-0 right-2 w-5 rounded-sm bg-black">
            <span className="absolute inset-y-0 left-1 w-0.5 bg-white" />
            <span className="absolute inset-y-0 left-2.5 w-0.5 bg-white" />
          </span>
        </span>
        <span className="text-xs text-suave">Faixa azul · 2 graus, desde março</span>
      </div>
    </div>
  )
}

export function PerfilPersonal() {
  return (
    <div className="cartao w-full max-w-sm overflow-hidden text-sm">
      <div className="h-20" style={{ background: 'linear-gradient(120deg, #b6f22e, #22d3ee)' }} />
      <div className="-mt-9 px-5 pb-5">
        <span className="grid size-[4.5rem] place-items-center rounded-full border-4 border-sup bg-[#101416] text-xl font-bold text-[#b6f22e]">RM</span>
        <p className="titulo mt-2 text-3xl">Rafael Moreira</p>
        <p className="text-xs text-suave">Personal · CREF 012345-G/MG</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-sup-2 p-2.5">
            <p className="titulo dado text-2xl">143</p>
            <p className="text-[0.62rem] text-suave">alunos instruídos</p>
          </div>
          <div className="rounded-xl bg-sup-2 p-2.5">
            <p className="titulo dado flex items-center justify-center gap-1 text-2xl">
              <PiStarFill className="text-base text-anilha-legivel" />
              4,9
            </p>
            <p className="text-[0.62rem] text-suave">37 avaliações</p>
          </div>
          <div className="rounded-xl bg-sup-2 p-2.5">
            <p className="titulo dado text-2xl">2,1 mil</p>
            <p className="text-[0.62rem] text-suave">treinos dos alunos</p>
          </div>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold tracking-widest text-fraco uppercase">Onde atende</p>
        <ul className="mt-2 space-y-1.5 text-xs">
          {['Força Total · Centro', 'CT Tatame Sul', 'Na sua casa (até 15 km)'].map((l) => (
            <li key={l} className="flex items-center gap-2">
              <PiMapPinFill className="text-fraco" /> {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function AgendaEChat() {
  const dias = ['seg', 'ter', 'qua', 'qui', 'sex']
  const ocupado = [
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 1, 0, 0, 1],
  ]
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="cartao p-4 text-xs">
        <p className="text-[0.62rem] font-bold tracking-widest text-fraco uppercase">A semana do Rafael</p>
        <div className="mt-3 grid grid-cols-[2.6rem_repeat(5,1fr)] gap-1.5">
          <span />
          {dias.map((d) => (
            <span key={d} className="text-center font-bold text-suave">
              {d}
            </span>
          ))}
          {['06:00', '07:00', '18:00'].map((h, i) => (
            <div key={h} className="contents">
              <span className="dado self-center text-fraco">{h}</span>
              {ocupado[i].map((o, j) => (
                <span key={j} className={`h-7 rounded-md ${o ? 'bg-anilha text-anilha-texto' : 'border border-dashed border-linha-2'}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="cartao space-y-2 p-4 text-sm">
        <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-anilha px-3 py-2 text-anilha-texto">Rafa, posso trocar quinta para as 7h?</p>
        <p className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-sup-2 px-3 py-2">Pode! Já mudei na agenda 👍</p>
        <p className="flex items-center gap-1 text-[0.65rem] text-fraco">
          <PiHeartFill className="text-perigo" /> O chat entre aluno e personal fica no app, sem passar o seu número
        </p>
      </div>
    </div>
  )
}
