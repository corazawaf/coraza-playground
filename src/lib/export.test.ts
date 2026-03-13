// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { exportResults } from './export'

describe('exportResults', () => {
  it('generates valid JSON with all fields', () => {
    const result = exportResults({
      directives: 'SecRuleEngine On',
      request: 'GET / HTTP/1.1',
      response: 'HTTP/1.1 200 OK',
      useCrs: true,
      autoContentLength: false,
      analysis: {
        transactionId: 'abc-123',
        disruptiveAction: 'deny',
        disruptiveRule: '1001',
        rulesMatchedTotal: '3',
        duration: '500 \u03bcs',
      },
    })

    const parsed = JSON.parse(result)
    expect(parsed.directives).toBe('SecRuleEngine On')
    expect(parsed.config.use_crs).toBe(true)
    expect(parsed.config.auto_content_length).toBe(false)
    expect(parsed.analysis.transactionId).toBe('abc-123')
    expect(parsed.timestamp).toBeDefined()
  })

  it('works without analysis data', () => {
    const result = exportResults({
      directives: '',
      request: '',
      response: '',
      useCrs: false,
      autoContentLength: true,
    })

    const parsed = JSON.parse(result)
    expect(parsed.analysis).toBeUndefined()
    expect(parsed.config.auto_content_length).toBe(true)
  })
})
