// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

const ayuDarkHighlighting = HighlightStyle.define([
  { tag: t.keyword, color: '#ffb454', fontWeight: 'bold' },
  { tag: t.variableName, color: '#39bae6' },
  { tag: t.operatorKeyword, color: '#f29668' },
  { tag: t.function(t.name), color: '#c2d94c' },
  { tag: t.string, color: '#c2d94c' },
  { tag: t.number, color: '#e6b450' },
  { tag: t.lineComment, color: '#626a73', fontStyle: 'italic' },
  { tag: t.atom, color: '#ffee99' },
])

const ayuDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#bfbdb6',
    },
    '.cm-content': {
      caretColor: '#e6b450',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.875rem',
    },
    '.cm-cursor': {
      borderLeftColor: '#e6b450',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#626a73',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
  },
  { dark: true },
)

const ayuLightHighlighting = HighlightStyle.define([
  { tag: t.keyword, color: '#fa8d3e', fontWeight: 'bold' },
  { tag: t.variableName, color: '#399ee6' },
  { tag: t.operatorKeyword, color: '#f2590c' },
  { tag: t.function(t.name), color: '#86b300' },
  { tag: t.string, color: '#86b300' },
  { tag: t.number, color: '#a37acc' },
  { tag: t.lineComment, color: '#abb0b6', fontStyle: 'italic' },
  { tag: t.atom, color: '#a37acc' },
])

const ayuLightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#5c6166',
    },
    '.cm-content': {
      caretColor: '#ff6a00',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.875rem',
    },
    '.cm-cursor': {
      borderLeftColor: '#ff6a00',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(37, 99, 235, 0.15)',
    },
    '.cm-gutters': {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
      color: '#abb0b6',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
  },
  { dark: false },
)

export function ayuDark(): Extension {
  return [ayuDarkTheme, syntaxHighlighting(ayuDarkHighlighting)]
}

export function ayuLight(): Extension {
  return [ayuLightTheme, syntaxHighlighting(ayuLightHighlighting)]
}
