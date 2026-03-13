// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { BarChart3, AlertTriangle, Shield, Database, FileText } from 'lucide-react'
import { OverviewTab } from './tabs/OverviewTab'
import { RulesTab } from './tabs/RulesTab'
import { CollectionsTab } from './tabs/CollectionsTab'
import { AuditLogTab } from './tabs/AuditLogTab'
import type { AnalysisState } from '../lib/types'
import type { Extension } from '@codemirror/state'

type Tab = 'overview' | 'rules' | 'crs' | 'collections' | 'audit'

interface ResultsPanelProps {
  results: AnalysisState
  themeExtension: Extension
}

export function ResultsPanel({ results, themeExtension }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    {
      id: 'rules',
      label: 'Custom Rules',
      icon: <AlertTriangle size={14} />,
      badge: results.customRules.length,
    },
    {
      id: 'crs',
      label: 'CRS Rules',
      icon: <Shield size={14} />,
      badge: results.crsRules.length,
    },
    { id: 'collections', label: 'Collections', icon: <Database size={14} /> },
    { id: 'audit', label: 'Audit Log', icon: <FileText size={14} /> },
  ]

  return (
    <div className="results-panel">
      <div className="panel-header">
        <h5 className="panel-title">
          <BarChart3 size={16} className="text-info" style={{ marginRight: 8 }} />
          Analysis Results
        </h5>
      </div>

      <nav className="results-nav">
        <div className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`badge-count ${
                    tab.id === 'rules' ? 'badge-danger' : 'badge-info'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="results-content">
        {activeTab === 'overview' && <OverviewTab results={results} />}
        {activeTab === 'rules' && (
          <RulesTab
            rules={results.customRules}
            emptyMessage="No custom rules matched. Run an analysis to see results."
            badgeClass="badge-danger"
          />
        )}
        {activeTab === 'crs' && (
          <RulesTab
            rules={results.crsRules}
            emptyMessage="No CRS rules matched. Run an analysis to see results."
            badgeClass="badge-info"
          />
        )}
        {activeTab === 'collections' && (
          <CollectionsTab collections={results.collections} />
        )}
        {activeTab === 'audit' && (
          <AuditLogTab auditLog={results.auditLog} themeExtension={themeExtension} />
        )}
      </div>
    </div>
  )
}
