// scripts/build-index.ts
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import OpenAI from 'openai'

// CONFIG
const PDF_PATH   = path.join(process.cwd(), 'prompts', 'combined.pdf')
const OUT_PATH   = path.join(process.cwd(), 'prompts', 'index.json')
const CHUNK_SIZE = 1000  // ~1k characters per chunk

// Init OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Helper: split text into fixed‐size chunks
function chunkText(str: string, size = CHUNK_SIZE) {
  const chunks = []
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size))
  }
  return chunks
}

async function main() {
  // 1) Parse the PDF
  const pdfData = await pdfParse(fs.readFileSync(PDF_PATH))
  const rawText = pdfData.text
  console.log(`Parsed PDF, length=${rawText.length} chars.`)

  // 2) Chunk it
  const texts = chunkText(rawText)
  console.log(`Split into ${texts.length} chunks of ~${CHUNK_SIZE} chars each.`)

  // 3) Embed each chunk
  const index: { text: string; embedding: number[] }[] = []
  for (const txt of texts) {
    const resp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: txt,
    })
    index.push({
      text: txt,
      embedding: resp.data[0].embedding,
    })
    // small delay to avoid rate-limits
    await new Promise((r) => setTimeout(r, 100))
  }

  // 4) Write the index JSON
  fs.writeFileSync(OUT_PATH, JSON.stringify(index))
  console.log(`✅ Wrote ${index.length} embeddings to ${OUT_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
