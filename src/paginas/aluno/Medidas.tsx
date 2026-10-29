import { useState } from 'react'
import { PiShieldCheck } from 'react-icons/pi'
import { AppAluno, useVinculos } from '../../components/layout/AppAluno'
import { PainelMedidas } from '../../components/medidas/Medidas'
import { useAviso } from '../../components/ui/Aviso'
import { Interruptor } from '../../components/ui/basicos'
import { mensagemDeErro, sessao } from '../../lib/api'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'

// As medidas do aluno, com quem pode ver (um interruptor por personal e por academia: a LGPD trata
// medida do corpo como dado sensível, então começa fechado)

export default function Medidas() {
  useTitulo('Medidas')
  return (
    <AppAluno titulo="Medidas">
      <PainelMedidas />
      <QuemVe />
    </AppAluno>
  )
}

function QuemVe() {
  const s = useSessao()
  const avisar = useAviso()
  const vinculos = useVinculos()
  const [mudando, setMudando] = useState<string | null>(null)
  const ativos = (vinculos.dados ?? []).filter((v) => v.status === 'ativo')
  const liberados = new Set(s.usuario?.consentimentos.medidas ?? [])
  if (!ativos.length) return null
  const mudar = async (alvo: string, permitir: boolean) => {
    setMudando(alvo)
    try {
      s.aplicar(await sessao.consentimento(alvo, permitir))
      avisar(permitir ? 'Liberado.' : 'Fechado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setMudando(null)
    }
  }
  return (
    <section className="cartao mt-8 p-5" aria-labelledby="quem-ve">
      <h2 id="quem-ve" className="flex items-center gap-2 font-bold">
        <PiShieldCheck className="text-xl text-ok" /> Quem pode ver as suas medidas
      </h2>
      <p className="mt-1 text-sm text-suave">Os seus treinos quem monta a ficha já vê. As medidas e as fotos, só com a sua permissão. Mude quando quiser.</p>
      <div className="mt-4 space-y-4">
        {ativos.map((v) => {
          const alvo = v.tipo === 'empresa' ? `empresa:${v.id}` : v.id
          return (
            <Interruptor
              key={alvo}
              ligado={liberados.has(alvo)}
              desativado={mudando === alvo}
              aoMudar={(x) => mudar(alvo, x)}
              rotulo={v.tipo === 'empresa' ? `Professores da ${v.nome}` : v.nome}
              descricao={v.tipo === 'empresa' ? 'Os professores que cuidam de você lá veem as medidas e as fotos de evolução' : 'Vê as medidas e as fotos de evolução e lança a avaliação física'}
            />
          )
        })}
      </div>
    </section>
  )
}
