// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useRef, useEffect, useCallback } from 'react'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion } from '@codemirror/autocomplete'

interface EditorPanelProps {
  title: string
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  extensions?: Extension[]
  readOnly?: boolean
  actions?: React.ReactNode
}

export function EditorPanel({
  title,
  icon,
  value,
  onChange,
  extensions = [],
  readOnly = false,
  actions,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const createExtensions = useCallback((): Extension[] => {
    const exts: Extension[] = [
      lineNumbers(),
      history(),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
      ...extensions,
    ]
    if (!readOnly) {
      exts.push(autocompletion())
    }
    if (readOnly) {
      exts.push(EditorState.readOnly.of(true))
    }
    return exts
  }, [extensions, readOnly])

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: createExtensions(),
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Only run on mount and when extensions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createExtensions])

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      })
    }
  }, [value])

  return (
    <div className="editor-panel">
      <div className="panel-header">
        <h5 className="panel-title">
          {icon}
          {title}
        </h5>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      <div className="editor-container">
        <div ref={containerRef} />
      </div>
    </div>
  )
}
