// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

export interface ExportData {
  directives: string
  request: string
  response: string
  useCrs: boolean
  autoContentLength: boolean
  analysis?: {
    transactionId: string
    disruptiveAction: string
    disruptiveRule: string
    rulesMatchedTotal: string
    duration: string
  }
}

export function exportResults(data: ExportData): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      directives: data.directives,
      request: data.request,
      response: data.response,
      config: {
        use_crs: data.useCrs,
        auto_content_length: data.autoContentLength,
      },
      analysis: data.analysis,
    },
    null,
    2,
  )
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
