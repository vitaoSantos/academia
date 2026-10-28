// A marca da plataforma num lugar só: trocar o nome, o domínio ou o e-mail é aqui.

export const MARCA = {
  nome: 'Turma',
  slogan: 'Sua academia, seu personal e a sua turma num app só.',
  dominio: 'turma.app',
  email: 'contato@turma.app',
  // a frase do check-in na rede
  checkin: 'Treino pago',
}

// O endereço público de uma página (a academia, o personal, o perfil)
export const enderecoPublico = (caminho: string) => `${MARCA.dominio}/${caminho.replace(/^\//, '')}`
