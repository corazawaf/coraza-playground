// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { Code, Download, Palette } from 'lucide-react'
import type { Theme } from '../lib/types'

interface SidebarProps {
  autoContentLength: boolean
  onAutoContentLengthChange: (value: boolean) => void
  useCrs: boolean
  onUseCrsChange: (value: boolean) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onLoadExample: () => void
  onExport: () => void
  lastAnalysis: string
  rulesMatched: number
}

export function Sidebar({
  autoContentLength,
  onAutoContentLengthChange,
  useCrs,
  onUseCrsChange,
  theme,
  onThemeChange,
  onLoadExample,
  onExport,
  lastAnalysis,
  rulesMatched,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-section">
          <h6 className="sidebar-heading">Configuration</h6>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoContentLength}
              onChange={(e) => onAutoContentLengthChange(e.target.checked)}
            />
            <span>Auto Content Length</span>
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useCrs}
              onChange={(e) => onUseCrsChange(e.target.checked)}
            />
            <span>Use CRS (latest)</span>
          </label>

          <div className="theme-selector">
            <label className="form-label">
              <Palette size={14} />
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as Theme)}
            >
              <option value="auto">Auto (System)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="sidebar-section">
          <h6 className="sidebar-heading">Quick Actions</h6>
          <div className="sidebar-actions">
            <button className="btn btn-outline btn-sm btn-block" onClick={onLoadExample}>
              <Code size={14} /> Load Example
            </button>
            <button className="btn btn-outline btn-sm btn-block" onClick={onExport}>
              <Download size={14} /> Export Results
            </button>
          </div>
        </div>

        <div className="stats-panel">
          <h6 className="sidebar-heading">Statistics</h6>
          <div className="stat-item">
            <span className="stat-label">Last Analysis</span>
            <span className="stat-value">{lastAnalysis}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Rules Matched</span>
            <span className="stat-value">{rulesMatched}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
