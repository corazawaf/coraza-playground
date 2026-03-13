// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useCallback } from 'react'
import type { Theme } from '../lib/types'
import { useLocalStorage } from './useLocalStorage'

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme
}

export function useTheme(): [Theme, (theme: Theme) => void, 'light' | 'dark'] {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'auto')

  const effective = getEffectiveTheme(theme)

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if (theme === 'auto') {
        applyTheme('auto')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  return [theme, setTheme, effective]
}
