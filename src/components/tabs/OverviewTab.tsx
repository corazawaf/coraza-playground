// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { Fingerprint, Ban, Shield, Code, Clock, Settings } from 'lucide-react'
import { MetricCard } from '../common/MetricCard'
import type { AnalysisState } from '../../lib/types'

interface OverviewTabProps {
  results: AnalysisState
}

export function OverviewTab({ results }: OverviewTabProps) {
  return (
    <div className="overview-grid">
      <MetricCard
        icon={<Fingerprint size={24} />}
        label="Transaction ID"
        value={results.transactionId}
      />
      <MetricCard
        icon={<Ban size={24} />}
        label="Disruptive Action"
        value={results.disruptiveAction}
        iconClass="text-danger"
      />
      <MetricCard
        icon={<Shield size={24} />}
        label="Disruptive Rule"
        value={results.disruptiveRule}
        iconClass="text-warning"
      />
      <MetricCard
        icon={<Code size={24} />}
        label="Custom Rules"
        value={results.customRules.length}
        iconClass="text-success"
      />
      <MetricCard
        icon={<Shield size={24} />}
        label="CRS Rules"
        value={results.crsRules.length}
        iconClass="text-info"
      />
      <MetricCard
        icon={<Clock size={24} />}
        label="Evaluation Time"
        value={`${results.duration.toLocaleString()} \u03bcs`}
        iconClass="text-info"
      />
      <MetricCard
        icon={<Settings size={24} />}
        label="Engine Status"
        value={results.engineStatus}
        iconClass="text-secondary"
      />
    </div>
  )
}
