import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export async function extractText(buffer, fileName) {
  const ext = fileName.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    const data = await pdfParse(buffer)
    return data.text
  }

  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (['txt', 'csv', 'md'].includes(ext)) {
    return buffer.toString('utf-8')
  }

  if (ext === 'xlsx' || ext === 'xls') {
    // For Excel, return a note — full parsing would need xlsx library
    return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim() || 
      '[Excel file detected — text extraction limited. For best results, export as CSV or paste content directly.]'
  }

  return buffer.toString('utf-8')
}
