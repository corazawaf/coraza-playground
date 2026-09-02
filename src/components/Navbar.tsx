// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { Shield, Play, Share2, Trash2, BookOpen, Loader2 } from 'lucide-react'

// lucide-react removed brand/logo icons (e.g. Github) starting with v1.0, so we
// render the GitHub mark as an inline SVG matching the rest of the icon set.
function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  )
}

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
            <GithubIcon size={14} /> GitHub
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
