// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

export function autoContentLength(request: string): string {
  const regex = /Content-length:.*\n/gi
  const sp = request.split('\n\n', 2)
  if (sp.length > 1) {
    const bodyLength = new TextEncoder().encode(sp[1]).length
    return request.replace(regex, `Content-Length: ${bodyLength}\n`)
  }
  return request
}

export function formatHttpMessage(content: string): string {
  const lines = content.split('\n')
  let formatted = ''
  let inHeaders = true

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (i === 0) {
      formatted += line + '\n'
    } else if (line === '' && inHeaders) {
      formatted += '\n'
      inHeaders = false
    } else if (inHeaders) {
      formatted += line + '\n'
    } else {
      formatted += line + (i < lines.length - 1 ? '\n' : '')
    }
  }
  return formatted
}
