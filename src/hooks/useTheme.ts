// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useCallback, useSyncExternalStore } from 'react'
import type { Theme } from '../lib/types'
import { useLocalStorage } from './useLocalStorage'

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme
}

function subscribeToColorScheme(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme(): [Theme, (theme: Theme) => void, 'light' | 'dark'] {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'auto')

  // Track system preference in React state so changes trigger re-renders
  const systemTheme = useSyncExternalStore(
    subscribeToColorScheme,
    getSystemTheme,
    () => 'light' as const,
  )

  const effective = theme === 'auto' ? systemTheme : theme

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  // Re-apply when system theme changes while in 'auto' mode
  useEffect(() => {
    if (theme === 'auto') {
      applyTheme('auto')
    }
  }, [theme, systemTheme, applyTheme])

  return [theme, setTheme, effective]
}
