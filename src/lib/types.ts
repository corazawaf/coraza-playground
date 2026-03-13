// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

export interface PlaygroundResult {
  transaction_id: string
  collections: string // JSON-encoded string
  matched_data: string // JSON-encoded string
  rules_matched_total: string
  audit_log: string
  disruptive_action: string
  disruptive_rule: string
  disruptive_status: number
  duration: number
  engine_status: string
  error?: string
}

export type RuleMatch = [string, string] // [ruleId, message]

export type Collection = [string, string, string, string] // [name, key, index, value]

export interface AnalysisState {
  transactionId: string
  disruptiveAction: string
  disruptiveRule: string
  disruptiveStatus: number
  customRules: RuleMatch[]
  crsRules: RuleMatch[]
  collections: Collection[]
  auditLog: string
  duration: number
  engineStatus: string
  rulesMatchedTotal: string
}

export type Theme = 'auto' | 'light' | 'dark'

declare global {
  // eslint-disable-next-line no-var
  var Go: new () => {
    run: (instance: WebAssembly.Instance) => void
    importObject: WebAssembly.Imports
  }
  function playground(
    directives: string,
    request: string,
    response: string,
    crs: boolean,
  ): PlaygroundResult
}
