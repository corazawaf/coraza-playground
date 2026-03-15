// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { isCRSRule, isAdministrativeRule, categorizeRules } from './rules'
import type { RuleMatch } from './types'

describe('isAdministrativeRule', () => {
  it('returns true for CRS configuration rules (900000-900999)', () => {
    expect(isAdministrativeRule(900000)).toBe(true)
    expect(isAdministrativeRule(900100)).toBe(true)
    expect(isAdministrativeRule(900999)).toBe(true)
  })

  it('returns true for reporting rules (> 949000)', () => {
    expect(isAdministrativeRule(949001)).toBe(true)
    expect(isAdministrativeRule(980000)).toBe(true)
  })

  it('returns true for special rules 941010 and 921170', () => {
    expect(isAdministrativeRule(941010)).toBe(true)
    expect(isAdministrativeRule(921170)).toBe(true)
  })

  it('returns true for paranoia level detection rules', () => {
    expect(isAdministrativeRule(941011)).toBe(true)
    expect(isAdministrativeRule(941018)).toBe(true)
  })

  it('returns false for standard CRS security rules', () => {
    expect(isAdministrativeRule(941100)).toBe(false)
    expect(isAdministrativeRule(942100)).toBe(false)
  })

  it('returns false for custom rules', () => {
    expect(isAdministrativeRule(1001)).toBe(false)
    expect(isAdministrativeRule(100)).toBe(false)
  })
})

describe('isCRSRule', () => {
  it('returns true for CRS security rules', () => {
    expect(isCRSRule(941100)).toBe(true)
    expect(isCRSRule(942100)).toBe(true)
  })

  it('returns false for administrative rules', () => {
    expect(isCRSRule(900000)).toBe(false)
    expect(isCRSRule(949001)).toBe(false)
  })

  it('returns false for custom rules', () => {
    expect(isCRSRule(1001)).toBe(false)
    expect(isCRSRule(500)).toBe(false)
  })
})

describe('categorizeRules', () => {
  it('separates custom and CRS rules', () => {
    const rules: RuleMatch[] = [
      ['1001', 'Custom rule'],
      ['941100', 'CRS XSS rule'],
      ['1002', 'Another custom rule'],
    ]
    const { customRules, crsRules } = categorizeRules(rules)
    expect(customRules).toHaveLength(2)
    expect(crsRules).toHaveLength(1)
  })

  it('filters out administrative rules', () => {
    const rules: RuleMatch[] = [
      ['900100', 'Config rule'],
      ['1001', 'Custom rule'],
      ['949110', 'Anomaly scoring'],
      ['980000', 'Reporting rule'],
    ]
    const { customRules, crsRules } = categorizeRules(rules)
    expect(customRules).toHaveLength(1)
    expect(crsRules).toHaveLength(0)
  })

  it('sorts rules by ID', () => {
    const rules: RuleMatch[] = [
      ['1003', 'Third'],
      ['1001', 'First'],
      ['1002', 'Second'],
    ]
    const { customRules } = categorizeRules(rules)
    expect(customRules[0]![0]).toBe('1001')
    expect(customRules[1]![0]).toBe('1002')
    expect(customRules[2]![0]).toBe('1003')
  })

  it('handles empty input', () => {
    const { customRules, crsRules } = categorizeRules([])
    expect(customRules).toHaveLength(0)
    expect(crsRules).toHaveLength(0)
  })
})
