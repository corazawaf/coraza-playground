// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo } from 'react'
import type { Collection } from '../../lib/types'

interface CollectionsTabProps {
  collections: Collection[]
}

export function CollectionsTab({ collections }: CollectionsTabProps) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return collections
    const lower = filter.toLowerCase()
    return collections.filter((col) =>
      col.some((cell) => cell.toLowerCase().includes(lower)),
    )
  }, [collections, filter])

  return (
    <div>
      <div className="collections-header">
        <input
          className="filter-input"
          placeholder="Filter collections..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Collection</th>
              <th style={{ width: '25%' }}>Key</th>
              <th style={{ width: '10%' }}>Index</th>
              <th style={{ width: '40%' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="no-data">
                <td colSpan={4}>
                  {collections.length === 0
                    ? 'No collections data. Run an analysis to populate.'
                    : 'No matching collections found.'}
                </td>
              </tr>
            ) : (
              filtered.map((col) => (
                <tr key={`${col[0]}-${col[1]}-${col[2]}`} className="fade-in">
                  <td>{col[0]}</td>
                  <td>{col[1]}</td>
                  <td>{col[2]}</td>
                  <td>{col[3]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
