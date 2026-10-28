// Netlify Blobs em memória, com as mesmas regras de escrita condicional (onlyIfNew / onlyIfMatch)
type Entrada = { valor: string | ArrayBuffer; etag: string; metadata: Record<string, unknown> }
type Opcoes = { type?: string }
type Escrita = { onlyIfNew?: boolean; onlyIfMatch?: string; metadata?: Record<string, unknown> }

export class LojaMemoria {
  dados = new Map<string, Entrada>()
  private versao = 0

  // devolve o controle ao loop antes de cada operação, como uma chamada de rede faria
  private async vez() {
    await new Promise((r) => setImmediate(r))
  }

  private ler(e: Entrada, opcoes?: Opcoes) {
    if (opcoes?.type === 'json') return JSON.parse(e.valor as string)
    return e.valor
  }

  async get(chave: string, opcoes?: Opcoes) {
    await this.vez()
    const e = this.dados.get(chave)
    return e ? this.ler(e, opcoes) : null
  }

  async getWithMetadata(chave: string, opcoes?: Opcoes) {
    await this.vez()
    const e = this.dados.get(chave)
    return e ? { data: this.ler(e, opcoes), etag: e.etag, metadata: e.metadata } : null
  }

  private async gravar(chave: string, valor: string | ArrayBuffer, opcoes?: Escrita) {
    await this.vez()
    const atual = this.dados.get(chave)
    if (opcoes?.onlyIfNew && atual) return { modified: false }
    if (opcoes?.onlyIfMatch && (!atual || atual.etag !== opcoes.onlyIfMatch)) return { modified: false }
    const etag = `"${++this.versao}"`
    this.dados.set(chave, { valor, etag, metadata: opcoes?.metadata ?? {} })
    return { modified: true, etag }
  }

  set(chave: string, valor: ArrayBuffer, opcoes?: Escrita) {
    return this.gravar(chave, valor, opcoes)
  }

  setJSON(chave: string, valor: unknown, opcoes?: Escrita) {
    return this.gravar(chave, JSON.stringify(valor), opcoes)
  }

  async delete(chave: string) {
    await this.vez()
    this.dados.delete(chave)
  }

  async list(opcoes?: { prefix?: string }) {
    await this.vez()
    const prefixo = opcoes?.prefix ?? ''
    return {
      blobs: [...this.dados.entries()].filter(([k]) => k.startsWith(prefixo)).map(([key, e]) => ({ key, etag: e.etag })),
      directories: [],
    }
  }
}
