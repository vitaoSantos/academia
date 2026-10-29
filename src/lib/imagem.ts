// Reduz a foto no próprio celular antes de enviar (perfil, logo, capa, post, evolução): no máximo
// `lado` pixels, em JPEG (ou WebP, que guarda o fundo transparente da logo), para caber no envio e não
// gastar a internet de quem está na academia.
export async function reduzirImagem(arquivo: File | Blob, lado = 1400, qualidade = 0.82, tipo: 'image/jpeg' | 'image/webp' = 'image/jpeg'): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL(tipo, qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Lê um arquivo de fonte (a fonte da marca) em base64, sem mexer
export function lerArquivo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(arquivo)
  })
}
