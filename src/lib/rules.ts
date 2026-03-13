// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import type { RuleMatch } from './types'

export function isCRSRule(ruleId: number): boolean {
  return ruleId >= 900000 && !isAdministrativeRule(ruleId)
}

export function isAdministrativeRule(ruleId: number): boolean {
  // CRS configuration rules (900000 to < 901000)
  if (ruleId >= 900000 && ruleId < 901000) return true
  // Reporting rules (above 949000)
  if (ruleId > 949000) return true
  // Special rules
  if (ruleId === 941010 || ruleId === 921170) return true
  // Paranoia level detection rules (900000-1000000 range ending in 11-18)
  if (ruleId >= 900000 && ruleId <= 1000000) {
    const lastTwoDigits = ruleId % 100
    if (lastTwoDigits >= 11 && lastTwoDigits <= 18) return true
  }
  return false
}

export function categorizeRules(matchedData: RuleMatch[]): {
  customRules: RuleMatch[]
  crsRules: RuleMatch[]
} {
  const customRules: RuleMatch[] = []
  const crsRules: RuleMatch[] = []

  for (const rule of matchedData) {
    const ruleId = parseInt(rule[0]!, 10)
    if (isAdministrativeRule(ruleId)) continue
    if (isCRSRule(ruleId)) {
      crsRules.push(rule)
    } else {
      customRules.push(rule)
    }
  }

  customRules.sort((a, b) => parseInt(a[0]!, 10) - parseInt(b[0]!, 10))
  crsRules.sort((a, b) => parseInt(a[0]!, 10) - parseInt(b[0]!, 10))

  return { customRules, crsRules }
}
