// types/pdf-parse.d.ts
declare module 'pdf-parse' {
  interface PdfParseResult { text: string; /* …other fields if you like… */ }
  function pdfParse(
    data: Buffer | Uint8Array | string,
    options?: any
  ): Promise<PdfParseResult>
  export default pdfParse
}
