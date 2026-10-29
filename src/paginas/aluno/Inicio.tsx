import { PiArrowRight, PiBarbellBold, PiCalendarBlank, PiClipboardText, PiFire, PiMapPinLine, PiTrophy } from 'react-icons/pi'
import { AppAluno, marcaDoAluno } from '../../components/layout/AppAluno'
import { LogoDaMarca } from '../../components/marca/Marca'
import { Carregando, Erro, Selo } from '../../components/ui/basicos'
import { aluno, mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { situacao } from '../../shared/ficha'
import { familiaDe, nomeModalidade } from '../../shared/modalidades'
import type { InicioDoAluno } from '../../shared/respostas'
import { agoraNoFuso, dataDe, diaDaSemana, diasEntre, inicioDaSemana, NOMES_DIAS_CURTOS, somarDias, textoData } from '../../shared/tempo'
import { formatarDuracao, numero, primeiroNome } from '../../shared/texto'

// O início do aluno (seção 9 do estudo): o treino de hoje (a próxima divisão da ficha), a semana com
// a meta, a sequência, o que vem por aí (aulas e sessões com o personal), os desafios e os lugares
// onde treina

export function useInicio() {
  const s = useSessao()
  return useDados(s.usuario ? `inicio:${s.usuario.id}` : null, () => aluno.inicio())
}

export default function Inicio() {
  useTitulo('Início')
  const inicio = useInicio()
  return (
    <AppAluno>
      {inicio.dados ? <Conteudo d={inicio.dados} /> : inicio.erro ? <Erro mensagem={mensagemDeErro(inicio.erro)} aoTentar={inicio.recarregar} /> : <Carregando />}
    </AppAluno>
  )
}

function saudacao() {
  const h = Math.floor(agoraNoFuso().minutos / 60)
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Conteudo({ d }: { d: InicioDoAluno }) {
  const s = useSessao()
  const u = s.usuario!
  const marca = marcaDoAluno(d.vinculos, u.principal)
  const hoje = agoraNoFuso().data
  const novas = d.fichas.filter((f) => f.status === 'ativa' && f.publicadaEm && !f.vistaEm)
  const trocar = d.fichas.filter((f) => f.status === 'ativa' && f.contexto.tipo !== 'propria' && ['vencendo', 'vencida'].includes(situacao(f, hoje)))
  const ativos = d.vinculos.filter((v) => v.status === 'ativo')
  const pendentes = d.vinculos.filter((v) => v.status === 'pendente')
  const proximos = [
    ...d.reservas.map((r) => ({ chave: `r${r.aula}${r.data}`, data: r.data, inicio: r.inicio, titulo: nomeModalidade(r.modalidade), sub: r.nome.split(' · ').slice(1).join(' · ') + (r.lugar ? ` · lugar ${r.lugar}` : ''), cor: familiaDe(r.modalidade).cor, link: `/${r.empresa}?unidade=${r.unidade}`, fila: r.situacao === 'espera' })),
    ...d.sessoes.map((x) => ({ chave: `s${x.id}`, data: x.data, inicio: x.inicio, titulo: `Sessão com ${primeiroNome(x.profissionalNome)}`, sub: x.local ?? '', cor: 'var(--anilha)', link: '/agenda', fila: false })),
  ]
    .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
    .slice(0, 4)

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-suave">
          {saudacao()}, {primeiroNome(u.nome)}
        </p>
        <h1 className="titulo mt-1 text-4xl">{marca?.visual.boasVindas || 'Bora treinar?'}</h1>
      </header>

      {/* a ficha nova e a ficha para trocar */}
      {novas.map((f) => (
        <Link key={f.id} para={`/fichas/${f.id}`} className="cartao flex items-center gap-3 border-anilha p-4">
          <PiClipboardText className="shrink-0 text-2xl text-anilha-legivel" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Ficha nova: {f.titulo}</span>
            <span className="block text-xs text-suave">Montada por {f.autorNome}. Toque para ver.</span>
          </span>
          <PiArrowRight className="shrink-0 text-fraco" />
        </Link>
      ))}

      <TreinoDeHoje d={d} />
      <Semana d={d} />

      {trocar.map((f) => (
        <div key={f.id} className="cartao flex items-center gap-3 p-4">
          <PiCalendarBlank className="shrink-0 text-2xl text-alerta" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-bold">{situacao(f, hoje) === 'vencida' ? 'Hora de trocar a ficha' : `A ficha troca ${textoData(f.previsao)}`}</span>
            <span className="block text-xs text-suave">
              {f.titulo} · combine a próxima com {primeiroNome(f.autorNome)}
            </span>
          </p>
        </div>
      ))}

      {proximos.length > 0 && (
        <section aria-labelledby="proximos">
          <div className="flex items-baseline justify-between">
            <h2 id="proximos" className="font-bold">
              Próximos
            </h2>
            <Link para="/aulas" className="text-xs font-semibold text-suave hover:text-texto">
              Aulas e agenda
            </Link>
          </div>
          <ul className="mt-2 space-y-2">
            {proximos.map((p) => (
              <li key={p.chave}>
                <Link para={p.link} className="cartao flex items-center gap-3 p-3.5 hover:border-linha-2">
                  <span className="w-14 shrink-0 text-center">
                    <span className="block text-[0.65rem] font-bold text-fraco uppercase">{textoData(p.data)}</span>
                    <span className="dado block font-bold">{p.inicio}</span>
                  </span>
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: p.cor }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.titulo}</span>
                    <span className="block truncate text-xs text-suave">{p.sub}</span>
                  </span>
                  {p.fila && <Selo tom="alerta">Na fila</Selo>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.desafios.length > 0 && (
        <section aria-labelledby="desafios">
          <div className="flex items-baseline justify-between">
            <h2 id="desafios" className="font-bold">
              Desafios
            </h2>
            <Link para="/desafios" className="text-xs font-semibold text-suave hover:text-texto">
              Ver todos
            </Link>
          </div>
          <div className="sem-barra -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {d.desafios.map((x) => (
              <Link key={x.id} para={`/desafios/${x.id}`} className="cartao flex w-64 shrink-0 flex-col p-4 hover:border-linha-2">
                <span className="flex items-center gap-2 text-xs text-fraco">
                  <PiTrophy className="text-base text-anilha-legivel" /> {x.oficial?.nome ?? 'Entre amigos'} · até {textoData(x.fim)}
                </span>
                <span className="mt-1.5 font-bold">{x.nome}</span>
                <span className="mt-3 flex items-end justify-between">
                  <span>
                    <span className="titulo dado text-3xl">{x.posicao ? `${x.posicao}º` : '–'}</span>
                    <span className="ml-1.5 text-xs text-suave">de {x.participantes}</span>
                  </span>
                  <span className="text-right text-xs text-suave">
                    {numero(x.pontos ?? 0)} {x.pontuacao === 'minutos' ? 'min' : x.pontuacao === 'dias' ? 'dias' : 'check-ins'}
                    {x.lider && x.posicao !== 1 && <span className="block text-fraco">1º: {primeiroNome(x.lider.nome)}</span>}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="onde">
        <h2 id="onde" className="font-bold">
          Onde você treina
        </h2>
        {ativos.length + pendentes.length === 0 ? (
          <div className="cartao mt-2 p-5">
            <p className="font-semibold">Ainda sem academia ou personal na Turma</p>
            <p className="mt-1 text-sm text-suave">Ache quem atende perto de você, ou abra o link de convite que a academia mandou. Dá para treinar sozinho também: monte a sua ficha.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link para="/explorar" className="btn btn-anilha btn-p">
                <PiMapPinLine /> Achar perto de mim
              </Link>
              <Link para="/fichas" className="btn btn-sup btn-p">
                Montar a minha ficha
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {[...ativos, ...pendentes].map((v) => (
              <li key={`${v.tipo}:${v.id}`}>
                <Link para={`/${v.slug}${v.unidade ? `?unidade=${v.unidade}` : ''}`} className="cartao flex items-center gap-3 p-3.5 hover:border-linha-2">
                  <LogoDaMarca visual={v.visual} nome={v.nome} tamanho={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.unidadeNome ?? v.nome}</span>
                    <span className="block text-xs text-suave">{v.tipo === 'empresa' ? 'Academia' : 'Personal'}</span>
                  </span>
                  {v.status === 'pendente' && <Selo tom="alerta">Aguardando</Selo>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function TreinoDeHoje({ d }: { d: InicioDoAluno }) {
  const p = d.proximaDivisao
  const ficha = p ? d.fichas.find((f) => f.id === p.ficha) : undefined
  const treinouHoje = d.ultimo && dataDe(d.ultimo.inicio) === agoraNoFuso().data
  if (!p)
    return (
      <div className="cartao overflow-hidden p-5">
        <p className="sobre">Treino de hoje</p>
        <p className="titulo mt-2 text-3xl">Sem ficha ativa</p>
        <p className="mt-1 text-sm text-suave">Quando o seu professor publicar a ficha, ela aparece aqui. Enquanto isso, registre um treino livre.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link para="/treinar" className="btn btn-anilha btn-m">
            <PiBarbellBold /> Treino livre
          </Link>
          <Link para="/fichas" className="btn btn-sup btn-m">
            Montar a minha ficha
          </Link>
        </div>
      </div>
    )
  return (
    <div className="relative overflow-hidden rounded-[var(--m-raio,1.5rem)] bg-anilha p-5 text-anilha-texto sm:p-6">
      <PiBarbellBold aria-hidden className="pointer-events-none absolute -right-6 -bottom-8 text-[9rem] opacity-[0.13]" />
      <p className="text-xs font-bold tracking-widest uppercase opacity-75">{treinouHoje ? 'Próximo treino' : 'Treino de hoje'}</p>
      <p className="titulo mt-2 text-5xl">{p.nome}</p>
      {p.foco && <p className="mt-1 font-semibold opacity-85">{p.foco}</p>}
      {ficha && (
        <p className="mt-1 text-xs opacity-70">
          {ficha.titulo} · {ficha.autorNome}
        </p>
      )}
      <div className="relative mt-5 flex flex-wrap gap-2">
        <Link para={`/treinar?ficha=${p.ficha}&divisao=${p.divisao}`} className="btn btn-m bg-[var(--anilha-texto)] text-[var(--anilha)]">
          Começar o treino <PiArrowRight />
        </Link>
        <Link para={`/fichas/${p.ficha}`} className="btn btn-m border border-current/25">
          Ver a ficha
        </Link>
      </div>
    </div>
  )
}

function Semana({ d }: { d: InicioDoAluno }) {
  const hoje = agoraNoFuso().data
  const segunda = inicioDaSemana(hoje)
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i))
  const feitos = new Set(d.semana.dias)
  const bateu = d.semana.feitos >= d.semana.meta
  return (
    <section aria-label="A semana" className="cartao p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">
            {Math.min(d.semana.feitos, 99)} de {d.semana.meta} treinos na semana
          </p>
          <p className="mt-0.5 text-xs text-suave">{bateu ? 'Meta batida! A semana conta na sequência.' : `Faltam ${d.semana.meta - d.semana.feitos} para a meta.`}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-sup-2 px-3 py-1.5" title="Semanas seguidas batendo a meta">
          <PiFire className={`text-lg ${d.sequencia > 0 ? 'text-anilha-legivel' : 'text-fraco'}`} />
          <span className="dado font-bold">{d.sequencia}</span>
          <span className="text-xs text-suave">{d.sequencia === 1 ? 'semana' : 'semanas'}</span>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1.5">
        {dias.map((dia) => {
          const feito = feitos.has(dia)
          const eHoje = dia === hoje
          const futuro = diasEntre(hoje, dia) > 0
          return (
            <li key={dia} className="flex flex-col items-center gap-1.5">
              <span className={`text-[0.65rem] font-bold uppercase ${eHoje ? 'text-texto' : 'text-fraco'}`}>{NOMES_DIAS_CURTOS[diaDaSemana(dia)]}</span>
              <span
                className={`grid size-9 place-items-center rounded-full text-xs font-bold ${feito ? 'bg-anilha text-anilha-texto' : eHoje ? 'border-2 border-anilha' : futuro ? 'border border-dashed border-linha-2 text-fraco' : 'bg-sup-2 text-fraco'}`}
                aria-label={`${textoData(dia)}${feito ? ', treinou' : ''}`}
              >
                {feito ? <PiBarbellBold /> : Number(dia.slice(8))}
              </span>
            </li>
          )
        })}
      </ol>
      {d.ultimo && (
        <p className="mt-4 border-t border-linha pt-3 text-xs text-suave">
          Último: <span className="font-semibold text-texto">{d.ultimo.nome}</span> · {textoData(dataDe(d.ultimo.inicio))} · {formatarDuracao(d.ultimo.duracaoMin)}
          {d.ultimo.volume ? ` · ${numero(d.ultimo.volume)} kg` : ''}
        </p>
      )}
    </section>
  )
}
