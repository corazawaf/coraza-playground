// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect } from 'react'
import { initWasm } from '../lib/wasm'
import { categorizeRules } from '../lib/rules'
import { autoContentLength } from '../lib/format'
import type { AnalysisState, Collection, RuleMatch } from '../lib/types'

const emptyState: AnalysisState = {
  transactionId: '-',
  disruptiveAction: 'none',
  disruptiveRule: '-',
  disruptiveStatus: 0,
  customRules: [],
  crsRules: [],
  collections: [],
  auditLog: '',
  duration: 0,
  engineStatus: 'Ready',
  rulesMatchedTotal: '0',
}

export function usePlayground() {
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisState>(emptyState)
  const [wasmReady, setWasmReady] = useState(false)

  useEffect(() => {
    initWasm()
      .then(() => {
        setWasmReady(true)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(`Failed to initialize WAF engine: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      })
  }, [])

  const run = useCallback(
    (
      directivesValue: string,
      requestValue: string,
      responseValue: string,
      useCrs: boolean,
      useAutoContentLength: boolean,
    ): { updatedRequest: string; success: boolean } => {
      if (!wasmReady) return { updatedRequest: requestValue, success: false }

      setRunning(true)
      setError(null)

      let req = requestValue
      if (useAutoContentLength) {
        req = autoContentLength(req)
      }

      try {
        const result = playground(directivesValue, req, responseValue, useCrs)

        if (result.error) {
          setError(result.error)
          setRunning(false)
          return { updatedRequest: req, success: false }
        }

        const collections: Collection[] = JSON.parse(result.collections || '[]')
        const matchedData: RuleMatch[] = JSON.parse(result.matched_data || '[]')
        const { customRules, crsRules } = categorizeRules(matchedData)

        let auditLog = result.audit_log || ''
        try {
          if (auditLog) {
            auditLog = JSON.stringify(JSON.parse(auditLog), null, 2)
          }
        } catch {
          // Keep raw audit log if parsing fails
        }

        const disruptiveAction = result.disruptive_action || 'none'
        const disruptiveStatus = result.disruptive_status || 0

        setResults({
          transactionId: result.transaction_id || '-',
          disruptiveAction:
            disruptiveStatus > 0
              ? `${disruptiveAction} (${disruptiveStatus})`
              : disruptiveAction,
          disruptiveRule: result.disruptive_rule || '-',
          disruptiveStatus,
          customRules,
          crsRules,
          collections,
          auditLog,
          duration: result.duration || 0,
          engineStatus: result.engine_status || 'Unknown',
          rulesMatchedTotal: result.rules_matched_total || '0',
        })
      } catch (err: unknown) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
        setRunning(false)
        return { updatedRequest: req, success: false }
      }

      setRunning(false)
      return { updatedRequest: req, success: true }
    },
    [wasmReady],
  )

  const reset = useCallback(() => {
    setResults(emptyState)
    setError(null)
  }, [])

  return { loading, running, error, results, run, reset, setError }
}
