// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getEffectiveTheme } from './useTheme'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('getEffectiveTheme', () => {
  it('returns light or dark for auto based on system preference', () => {
    const result = getEffectiveTheme('auto')
    expect(['light', 'dark']).toContain(result)
  })

  it('returns light for light', () => {
    expect(getEffectiveTheme('light')).toBe('light')
  })

  it('returns dark for dark', () => {
    expect(getEffectiveTheme('dark')).toBe('dark')
  })
})
