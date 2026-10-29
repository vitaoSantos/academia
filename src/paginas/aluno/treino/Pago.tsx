import { motion } from 'motion/react'
import { useState } from 'react'
import { PiCheckCircleFill, PiFire, PiTrophy } from 'react-icons/pi'
import { useAviso } from '../../../components/ui/Aviso'
import { easeSuave, Girando, Interruptor } from '../../../components/ui/basicos'
import { MARCA } from '../../../data/marca'
import { mensagemDeErro, rede } from '../../../lib/api'
import { esquecer } from '../../../lib/dados'
import { Link, navegar } from '../../../lib/rotas'
import type { ResultadoDoTreino } from '../../../shared/respostas'
import { kg, numero } from '../../../shared/texto'

// O fim do treino: o "treino pago" com os números, os recordes e a sequência, e o post para a rede
// (com a academia e o professor marcados)

export function Pago({ r, autorFicha }: { r: ResultadoDoTreino; autorFicha?: string }) {
  const avisar = useAviso()
  const t = r.treino
  const [texto, setTexto] = useState('')
  const [marcarProfessor, setMarcarProfessor] = useState(!!autorFicha)
  const [postando, setPostando] = useState(false)
  const [postado, setPostado] = useState<string | null>(null)

  const postar = async () => {
    setPostando(true)
    try {
      const { post } = await rede.publicar({
        tipo: t.modalidade ? 'aula' : 'treino',
        treino: t.id,
        ...(texto.trim() ? { texto: texto.trim() } : {}),
        ...(marcarProfessor && autorFicha ? { marcados: [{ tipo: 'profissional' as const, id: autorFicha }] } : {}),
        ...(t.local ? { local: t.local } : {}),
      })
      esquecer('feed:')
      setPostado(post.id)
      avisar('Postado! A sua turma já pode dar 💪.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setPostando(false)
    }
  }

  return (
    <div className="py-4">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: easeSuave }} className="grid size-20 place-items-center rounded-full bg-anilha text-5xl text-anilha-texto">
        <PiCheckCircleFill />
      </motion.div>
      <h1 className="titulo mt-5 text-5xl">{MARCA.checkin}!</h1>
      <p className="mt-1 text-suave">{t.nome}</p>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-3xl bg-sup p-5 text-center">
        <div>
          <p className="titulo dado text-4xl">{t.duracaoMin}</p>
          <p className="text-xs text-suave">minutos</p>
        </div>
        <div>
          <p className="titulo dado text-4xl">{t.volume >= 1000 ? numero(t.volume / 1000, 1) : numero(t.volume)}</p>
          <p className="text-xs text-suave">{t.volume >= 1000 ? 'toneladas' : 'kg de volume'}</p>
        </div>
        <div>
          <p className="titulo dado text-4xl">{t.series}</p>
          <p className="text-xs text-suave">séries</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-linha p-4">
        <PiFire className="text-3xl text-anilha-legivel" />
        <p className="text-sm">
          <span className="font-bold">
            {r.sequencia} {r.sequencia === 1 ? 'semana' : 'semanas'} seguidas
          </span>
          <span className="block text-xs text-suave">batendo a sua meta de treinos por semana</span>
        </p>
      </div>

      {t.recordes.length > 0 && (
        <div className="mt-3 rounded-2xl border border-anilha/50 bg-anilha-suave p-4">
          <p className="flex items-center gap-2 font-bold">
            <PiTrophy className="text-xl text-anilha-legivel" /> {t.recordes.length === 1 ? 'Recorde novo' : `${t.recordes.length} recordes novos`}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {t.recordes.map((x) => (
              <li key={x.exercicio}>
                {x.nome}: <span className="font-bold">{kg(x.valor)}</span>
                {x.antes ? <span className="text-suave"> (antes {kg(x.antes)})</span> : null}
                {x.tipo === 'forca' && <span className="text-xs text-fraco"> · força estimada</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* o post */}
      <section className="cartao mt-6 p-5" aria-labelledby="postar">
        {postado ? (
          <div className="text-center">
            <p id="postar" className="font-bold">
              Postado na rede
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Link para={`/rede/p/${postado}`} className="btn btn-sup btn-p">
                Ver o post
              </Link>
              <Link para="/rede" className="btn btn-sup btn-p">
                Abrir a rede
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 id="postar" className="font-bold">
              Postar o treino pago
            </h2>
            <p className="mt-1 text-xs text-suave">O resumo vai junto; quem segue você pode dar 💪 e comentar.</p>
            <textarea className="campo mt-3 min-h-20" maxLength={600} placeholder="Como foi? (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} />
            {autorFicha && (
              <div className="mt-3">
                <Interruptor ligado={marcarProfessor} aoMudar={setMarcarProfessor} rotulo="Marcar quem montou a ficha" />
              </div>
            )}
            <button type="button" className="btn btn-anilha btn-m mt-4 w-full" onClick={postar} disabled={postando}>
              {postando ? <Girando /> : 'Postar'}
            </button>
          </>
        )}
      </section>

      <button type="button" className="btn btn-fantasma btn-m mt-3 w-full" onClick={() => navegar('/app')}>
        Voltar ao início
      </button>
    </div>
  )
}
