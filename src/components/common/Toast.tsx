// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}

export function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-header">
        {type === 'success' ? (
          <CheckCircle size={16} />
        ) : (
          <AlertTriangle size={16} />
        )}
        <strong>{type === 'success' ? 'Success' : 'Error'}</strong>
        <button className="toast-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="toast-body">{message}</div>
    </div>
  )
}
