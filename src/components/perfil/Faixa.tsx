// A faixa desenhada (a cor e os graus na ponta preta)
export function Faixa({ cor, graus = 0, largura = 64 }: { cor: string; graus?: number; largura?: number }) {
  return (
    <span className="relative inline-block h-3.5 shrink-0 rounded-sm border border-linha" style={{ width: largura, background: cor }} aria-hidden>
      <span className="absolute inset-y-0 right-2 flex w-5 items-center gap-0.5 rounded-[1px] bg-[#141414] px-0.5">
        {Array.from({ length: Math.min(graus, 6) }, (_, i) => (
          <span key={i} className="h-full w-0.5 bg-white" />
        ))}
      </span>
    </span>
  )
}
