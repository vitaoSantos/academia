// O endereço da página da empresa e do personal (turma.app/forca-total). Fica na raiz do site,
// então os endereços do próprio sistema são reservados.

export const RESERVADOS = new Set([
  'admin', 'agenda', 'ajuda', 'api', 'app', 'assets', 'aulas', 'avisos', 'cadastro', 'chat', 'conta', 'contato',
  'convite', 'demo', 'desafio', 'desafios', 'empresa', 'empresas', 'entrar', 'exercicio', 'exercicios', 'explorar',
  'favicon', 'ficha', 'fichas', 'historico', 'img', 'inicio', 'lab', 'login', 'logout', 'manifest', 'mapa', 'medidas',
  'mensagens', 'midia', 'netlify', 'novo', 'p', 'painel', 'perfil', 'personal', 'planos', 'privacidade', 'pro', 'rede',
  'robots', 'sair', 'sitemap', 'sobre', 'static', 'suporte', 'termos', 'treinar', 'treino', 'treinos', 'turma', 'u',
  'www', 'evolucao', 'mais', 'comecar', 'academias', 'personais', 'modalidades', 'conversas', 'busca', 'configuracoes',
])

export const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

export function slugificar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export const slugValido = (slug: string) => SLUG.test(slug) && !slug.includes('--') && !RESERVADOS.has(slug)

// O @ do perfil da pessoa: letras, números, ponto e sublinhado (como no Instagram)
export const USUARIO = /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])$/

export function usuarioDe(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24)
    .replace(/\.+$/g, '')
}
