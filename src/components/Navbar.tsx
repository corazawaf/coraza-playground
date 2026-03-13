// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { Shield, Play, Share2, Trash2, Github, BookOpen, Loader2 } from 'lucide-react'

interface NavbarProps {
  onRun: () => void
  onShare: () => void
  onClear: () => void
  running: boolean
}

export function Navbar({ onRun, onShare, onClear, running }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a className="navbar-brand" href="#">
          <Shield size={20} className="text-primary" />
          <span className="fw-bold">Coraza WAF</span>
          <span className="badge-primary">Playground</span>
        </a>

        <div className="navbar-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={onRun}
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 size={14} className="spin" /> Analyzing...
              </>
            ) : (
              <>
                <Play size={14} /> Run Analysis
              </>
            )}
          </button>
          <button className="btn btn-outline btn-sm" onClick={onShare}>
            <Share2 size={14} /> Share
          </button>
          <button className="btn btn-outline btn-sm" onClick={onClear}>
            <Trash2 size={14} /> Clear
          </button>
          <a
            className="btn btn-outline btn-sm"
            href="https://github.com/corazawaf/coraza"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github size={14} /> GitHub
          </a>
          <a
            className="btn btn-outline btn-sm"
            href="https://www.coraza.io/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen size={14} /> Docs
          </a>
        </div>
      </div>
    </nav>
  )
}
