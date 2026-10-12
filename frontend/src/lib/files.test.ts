import { describe, expect, it } from 'vitest'
import { checkFile, formatSize, MAX_FILE_SIZE } from './files'

function file(name: string, type: string, size = 100) {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('checkFile', () => {
  it('accepts PDF, PNG, JPG and WEBP up to 10 MB', () => {
    expect(checkFile(file('a.pdf', 'application/pdf'))).toBeNull()
    expect(checkFile(file('a.PNG', 'image/png'))).toBeNull()
    expect(checkFile(file('a.jpeg', ''))).toBeNull() // some systems send no type
    expect(checkFile(file('a.webp', 'image/webp', MAX_FILE_SIZE))).toBeNull()
  })

  it('rejects other types and big files', () => {
    expect(checkFile(file('a.svg', 'image/svg+xml'))).toBe('type')
    expect(checkFile(file('a.docx', 'application/msword'))).toBe('type')
    expect(checkFile(file('a.pdf', 'application/pdf', MAX_FILE_SIZE + 1))).toBe('size')
  })
})

describe('formatSize', () => {
  it('uses B, KB and MB', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(9_500_000)).toBe('9.1 MB')
  })
})
