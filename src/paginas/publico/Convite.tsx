import { useState } from 'react'
import { PiCheckCircleFill, PiWarningCircle } from 'react-icons/pi'
import { ComMarca, LogoDaMarca } from '../../components/marca/Marca'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Girando, Logo } from '../../components/ui/basicos'
import { aluno, mensagemDeErro } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { primeiroNome } from '../../shared/texto'

// O link do convite (seção 5 do estudo): a academia ou o personal manda pelo WhatsApp; quem abre vê a
// marca de quem convidou, cria a conta (ou entra) e já fica vinculado. O convite de professor põe a
// pessoa na equipe da academia.

export default function Convite({ codigo }: { codigo: string }) {
  const s = useSessao()
  const avisar = useAviso()
  const convite = useDados(`convite:${codigo}`, () => aluno.convite(codigo))
  const [aceitando, setAceitando] = useState(false)
  const c = convite.dados
  useTitulo(c ? `Convite de ${c.de.nome}` : 'Convite')
  const volta = encodeURIComponent(`/convite/${codigo}`)

  const aceitar = async () => {
    if (!c) return
    setAceitando(true)
    try {
      await aluno.aceitarConvite(codigo)
      esquecer('vinculos:')
      esquecer('inicio')
      await s.atualizar()
      if (c.tipo === 'professor') {
        avisar(`Você entrou na equipe da ${c.de.nome}.`)
        navegar(s.profissional ? '/pro' : '/comecar/personal?professor=1', { substituir: true })
      } else {
        avisar(c.de.tipo === 'empresa' ? `Pronto! Você é aluno da ${c.de.nome}.` : `Pronto! Você treina com ${primeiroNome(c.de.nome)}.`)
        navegar('/app', { substituir: true })
      }
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setAceitando(false)
    }
  }

  if (!c) {
    if (convite.erro)
      return (
        <main className="margem mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center py-16 text-center">
          <Logo />
          <PiWarningCircle className="mt-10 text-5xl text-fraco" />
          <h1 className="titulo mt-4 text-4xl">Convite não encontrado</h1>
          <p className="mt-2 text-suave">{mensagemDeErro(convite.erro)}</p>
          <Link para="/" className="btn btn-sup btn-m mt-8">
            Conhecer a Turma
          </Link>
        </main>
      )
    return <Carregando className="min-h-[100svh]" />
  }

  const deQuem = c.de.tipo === 'empresa' ? c.de.nome : primeiroNome(c.de.nome)
  const indisponivel = c.expirado || (c.usado && !s.usuario)
  const titulo = c.tipo === 'professor' ? `${c.de.nome} chamou você para a equipe` : c.de.tipo === 'empresa' ? `Seu app da ${c.de.nome}` : `${c.de.nome} quer treinar com você`
  const texto =
    c.tipo === 'professor'
      ? 'Monte as fichas dos alunos com os exercícios em 3D, dê as aulas da grade e tenha a sua página de professor.'
      : 'A ficha de treino no celular com cada exercício em 3D, o treino ao vivo com as cargas, a evolução e a sua turma.'

  return (
    <ComMarca visual={c.de.visual} className="flex min-h-[100svh] flex-col">
      <main className="margem mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
        <LogoDaMarca visual={c.de.visual} nome={c.de.nome} tamanho={88} className="shadow-xl" />
        {c.nome && <p className="mt-8 text-sm font-semibold text-suave">Oi, {primeiroNome(c.nome)}!</p>}
        <h1 className={`titulo text-5xl ${c.nome ? 'mt-2' : 'mt-8'}`}>{titulo}</h1>
        <p className="mt-4 text-suave">{texto}</p>

        {indisponivel ? (
          <div className="cartao mt-8 p-5">
            <p className="font-bold">{c.expirado ? 'Este convite venceu' : 'Este convite já foi usado'}</p>
            <p className="mt-1 text-sm text-suave">Peça um link novo para {deQuem}.</p>
          </div>
        ) : s.carregando ? (
          <Carregando className="py-10" />
        ) : s.usuario ? (
          <div className="mt-8">
            <button type="button" className="btn btn-anilha btn-g w-full" onClick={aceitar} disabled={aceitando}>
              {aceitando ? <Girando /> : <PiCheckCircleFill className="text-xl" />} Aceitar o convite
            </button>
            <p className="mt-3 text-center text-xs text-fraco">
              Entrando como {s.usuario.nome} (@{s.usuario.usuario}).{' '}
              <button
                type="button"
                className="underline hover:text-texto"
                onClick={async () => {
                  await s.sair()
                }}
              >
                Não é você?
              </button>
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-2">
            <Link para={`/cadastro?volta=${volta}${c.nome ? `&nome=${encodeURIComponent(c.nome)}` : ''}`} className="btn btn-anilha btn-g w-full">
              Criar a conta e aceitar
            </Link>
            <Link para={`/entrar?volta=${volta}`} className="btn btn-sup btn-g w-full">
              Já tenho conta
            </Link>
            <p className="pt-2 text-center text-xs text-fraco">Grátis para o aluno. Leva um minuto.</p>
          </div>
        )}
      </main>
      <footer className="margem flex justify-center pb-8">
        <Link para="/" className="flex items-center gap-2 text-xs text-fraco hover:text-texto">
          feito com <Logo tamanho={16} />
        </Link>
      </footer>
    </ComMarca>
  )
}
