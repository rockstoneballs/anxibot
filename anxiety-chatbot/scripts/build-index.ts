import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import OpenAI from 'openai'

// —— CONFIGURATION ——
const PDF_DIR    = path.join(process.cwd(), 'prompts')
const OUT_INDEX  = path.join(PDF_DIR, 'index.json')
const CHUNK_SIZE = 1000  // ~1k chars per chunk

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function chunkText(text: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

async function main() {
  const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'))
  const index: { text: string; embedding: number[]; source: string; chunk: number }[] = []

  for (const file of files) {
    console.log(`Parsing ${file}…`)
    const buffer = fs.readFileSync(path.join(PDF_DIR, file))
    const { text } = await pdfParse(buffer)
    const chunks = chunkText(text)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const resp = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      })
      index.push({
        text: chunk,
        embedding: resp.data[0].embedding,
        source: file,
        chunk: i,
      })
      await new Promise(r => setTimeout(r, 100))
    }
  }

  fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2))
  console.log(`✅ Wrote ${index.length} chunks to ${OUT_INDEX}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
