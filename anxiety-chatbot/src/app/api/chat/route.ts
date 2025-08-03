// scripts/build-index.ts
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import OpenAI from 'openai'

// —— CONFIGURE ——
const PDF_DIR    = path.join(process.cwd(), 'prompts')
const OUT_INDEX  = path.join(PDF_DIR, 'index.json')
const CHUNK_SIZE = 1000  // ~1k chars per chunk

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Helper: split text into fixed-size chunks
function chunkText(text: string, size = CHUNK_SIZE) {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

async function main() {
  const files = fs
    .readdirSync(PDF_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))

  const index: {
    text: string
    embedding: number[]
    source: string
    chunkIndex: number
  }[] = []

  for (const file of files) {
    console.log(`📄 Processing ${file}`)
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
        chunkIndex: i,
      })
      // throttle to avoid rate‐limit
      await new Promise(r => setTimeout(r, 100))
    }
  }

  fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2))
  console.log(`✅ Built index with ${index.length} chunks → ${OUT_INDEX}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
