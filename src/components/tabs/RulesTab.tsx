// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import type { RuleMatch } from '../../lib/types'

interface RulesTabProps {
  rules: RuleMatch[]
  emptyMessage: string
  badgeClass: string
}

export function RulesTab({ rules, emptyMessage, badgeClass }: RulesTabProps) {
  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>Rule ID</th>
            <th style={{ width: '85%' }}>Message</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr className="no-data">
              <td colSpan={2}>{emptyMessage}</td>
            </tr>
          ) : (
            rules.map((rule) => (
              <tr key={`${rule[0]}-${rule[1]}`} className="fade-in">
                <td>
                  <span className={`badge ${badgeClass}`}>{rule[0]}</span>
                </td>
                <td>{rule[1]}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
