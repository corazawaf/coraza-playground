// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { json } from '@codemirror/lang-json'
import { EditorPanel } from '../EditorPanel'
import type { Extension } from '@codemirror/state'

interface AuditLogTabProps {
  auditLog: string
  themeExtension: Extension
}

export function AuditLogTab({ auditLog, themeExtension }: AuditLogTabProps) {
  const extensions = useMemo(
    () => [json(), themeExtension],
    [themeExtension],
  )

  return (
    <div className="audit-log-container">
      <EditorPanel
        title="Audit Log (JSON)"
        icon={null}
        value={auditLog || 'No audit log data available'}
        onChange={() => {}}
        extensions={extensions}
        readOnly
      />
    </div>
  )
}
