// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { autoContentLength, formatHttpMessage } from './format'

describe('autoContentLength', () => {
  it('updates content-length header', () => {
    const req = 'POST / HTTP/1.1\nContent-length: 0\n\nhello'
    const result = autoContentLength(req)
    expect(result).toContain('Content-Length: 5')
  })

  it('handles missing body gracefully', () => {
    const req = 'GET / HTTP/1.1\nHost: localhost'
    const result = autoContentLength(req)
    expect(result).toBe(req)
  })

  it('handles multibyte characters correctly', () => {
    const req = 'POST / HTTP/1.1\nContent-length: 0\n\n\u00e9'
    const result = autoContentLength(req)
    expect(result).toContain('Content-Length: 2')
  })

  it('is case-insensitive for Content-Length header', () => {
    const req = 'POST / HTTP/1.1\nCONTENT-LENGTH: 0\n\ntest'
    const result = autoContentLength(req)
    expect(result).toContain('Content-Length: 4')
  })
})

describe('formatHttpMessage', () => {
  it('trims whitespace from lines', () => {
    const input = '  GET / HTTP/1.1  \n  Host: localhost  \n\nbody'
    const result = formatHttpMessage(input)
    expect(result).toBe('GET / HTTP/1.1\nHost: localhost\n\nbody')
  })

  it('handles empty input', () => {
    expect(formatHttpMessage('')).toBe('\n')
  })
})
