// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  iconClass?: string
}

export function MetricCard({ icon, label, value, iconClass = '' }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${iconClass}`}>{icon}</div>
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  )
}
