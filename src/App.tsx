// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useMemo } from 'react'
import { Settings, ArrowRight, ArrowLeft, Wand2 } from 'lucide-react'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { EditorPanel } from './components/EditorPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { Toast } from './components/common/Toast'
import { usePlayground } from './hooks/usePlayground'
import { useTheme } from './hooks/useTheme'
import { useLocalStorage } from './hooks/useLocalStorage'
import { seclang } from './lang/seclang'
import { ayuDark, ayuLight } from './lang/themes'
import { formatHttpMessage } from './lib/format'
import { exportResults, downloadJson, copyToClipboard } from './lib/export'

const DEFAULT_REQUEST = 'GET / HTTP/1.1\nHost: localhost\nUser-Agent: Example User-Agent\n\n'

const EXAMPLE_DIRECTIVES = `# Example WAF Configuration

# Change SecRuleEngine to DetectionOnly if you want to see all rules matched
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess On

# SQL Injection Detection Rule
SecRule ARGS "@detectSQLi" \\
    "id:1001,\\
     phase:2,\\
     block,\\
     msg:'SQL Injection Attack',\\
     logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\\
     tag:'attack-sqli',\\
     severity:'CRITICAL'"

# XSS Detection Rule
SecRule ARGS "@detectXSS" \\
    "id:1002,\\
     phase:2,\\
     block,\\
     msg:'XSS Attack Detected',\\
     logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\\
     tag:'attack-xss',\\
     severity:'CRITICAL'"

# Variable and Operator Examples
SecRule &REQUEST_HEADERS:Host "@eq 0" \\
    "id:1003,\\
     phase:1,\\
     deny,\\
     status:400,\\
     msg:'Request Missing a Host Header'"

# Collection and Action Examples
SecAction \\
    "id:1004,\\
     phase:1,\\
     setvar:tx.anomaly_score=0,\\
     setvar:tx.sql_injection_score=0,\\
     setvar:tx.xss_score=0,\\
     nolog,\\
     pass"

# Pattern matching with regular expressions
SecRule REQUEST_URI "@rx \\\\.php$" \\
    "id:1005,\\
     phase:1,\\
     setvar:tx.is_php=1,\\
     nolog,\\
     pass"`

const EXAMPLE_REQUEST = `POST /login HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Content-Type: application/x-www-form-urlencoded
Content-Length: 53

username=admin'-- &password=test&submit=Login`

const EXAMPLE_RESPONSE = `HTTP/1.1 200 OK
Server: nginx/1.18.0
Content-Type: text/html; charset=UTF-8
Content-Length: 145

<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body><h1>Welcome</h1><p>Login successful!</p></body>
</html>`

interface ToastState {
  type: 'success' | 'error'
  message: string
}

export function App() {
  const [theme, setTheme, effectiveTheme] = useTheme()
  const { loading, running, error, results, run, reset, setError } = usePlayground()

  const [directivesValue, setDirectivesValue] = useLocalStorage('directives', '')
  const [requestValue, setRequestValue] = useLocalStorage('httprequest', DEFAULT_REQUEST)
  const [responseValue, setResponseValue] = useLocalStorage('httpresponse', '')
  const [useCrs, setUseCrs] = useLocalStorage('use_crs', true)
  const [autoContentLength, setAutoContentLength] = useLocalStorage('auto_content_length', false)
  const [lastAnalysis, setLastAnalysis] = useState('-')
  const [toast, setToast] = useState<ToastState | null>(null)

  const themeExtension = useMemo(
    () => (effectiveTheme === 'dark' ? ayuDark() : ayuLight()),
    [effectiveTheme],
  )

  const seclangExtensions = useMemo(
    () => [seclang(), themeExtension],
    [themeExtension],
  )

  const httpExtensions = useMemo(() => [themeExtension], [themeExtension])

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }, [])

  const handleRun = useCallback(() => {
    const updatedRequest = run(
      directivesValue,
      requestValue,
      responseValue,
      useCrs,
      autoContentLength,
    )
    if (updatedRequest !== requestValue) {
      setRequestValue(updatedRequest)
    }
    setLastAnalysis(new Date().toLocaleTimeString())
    if (!error) {
      showToast('success', 'Analysis completed successfully!')
    }
  }, [
    run,
    directivesValue,
    requestValue,
    responseValue,
    useCrs,
    autoContentLength,
    setRequestValue,
    error,
    showToast,
  ])

  const handleShare = useCallback(async () => {
    const shareData = JSON.stringify(
      {
        directives: directivesValue,
        request: requestValue,
        response: responseValue,
        use_crs: useCrs,
      },
      null,
      2,
    )
    const ok = await copyToClipboard(shareData)
    showToast(
      ok ? 'success' : 'error',
      ok ? 'Configuration copied to clipboard' : 'Could not copy to clipboard',
    )
  }, [directivesValue, requestValue, responseValue, useCrs, showToast])

  const handleClear = useCallback(() => {
    setDirectivesValue('')
    setRequestValue(DEFAULT_REQUEST)
    setResponseValue('')
    reset()
    setLastAnalysis('-')
    showToast('success', 'All data cleared')
  }, [setDirectivesValue, setRequestValue, setResponseValue, reset, showToast])

  const handleLoadExample = useCallback(() => {
    setDirectivesValue(EXAMPLE_DIRECTIVES)
    setRequestValue(EXAMPLE_REQUEST)
    setResponseValue(EXAMPLE_RESPONSE)
    showToast('success', 'Example configuration loaded')
  }, [setDirectivesValue, setRequestValue, setResponseValue, showToast])

  const handleExport = useCallback(() => {
    const json = exportResults({
      directives: directivesValue,
      request: requestValue,
      response: responseValue,
      useCrs,
      autoContentLength,
      analysis: {
        transactionId: results.transactionId,
        disruptiveAction: results.disruptiveAction,
        disruptiveRule: results.disruptiveRule,
        rulesMatchedTotal: results.rulesMatchedTotal,
        duration: `${results.duration} \u03bcs`,
      },
    })
    downloadJson(json, `coraza-analysis-${Date.now()}.json`)
    showToast('success', 'Results exported successfully')
  }, [directivesValue, requestValue, responseValue, useCrs, autoContentLength, results, showToast])

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner-container">
          <div className="spinner" />
          <div className="loading-text">Initializing Coraza WAF...</div>
        </div>
      </div>
    )
  }

  const rulesMatched = results.customRules.length + results.crsRules.length

  return (
    <>
      <Navbar
        onRun={handleRun}
        onShare={handleShare}
        onClear={handleClear}
        running={running}
      />

      <div className="app-layout">
        <Sidebar
          autoContentLength={autoContentLength}
          onAutoContentLengthChange={setAutoContentLength}
          useCrs={useCrs}
          onUseCrsChange={setUseCrs}
          theme={theme}
          onThemeChange={setTheme}
          onLoadExample={handleLoadExample}
          onExport={handleExport}
          lastAnalysis={lastAnalysis}
          rulesMatched={rulesMatched}
        />

        <div className="main-content">
          <div className="content-grid">
            <EditorPanel
              title="WAF Directives"
              icon={<Settings size={16} className="text-primary" style={{ marginRight: 8 }} />}
              value={directivesValue}
              onChange={setDirectivesValue}
              extensions={seclangExtensions}
            />

            <EditorPanel
              title="HTTP Request"
              icon={<ArrowRight size={16} className="text-success" style={{ marginRight: 8 }} />}
              value={requestValue}
              onChange={setRequestValue}
              extensions={httpExtensions}
              actions={
                <button
                  className="btn-icon"
                  onClick={() => setRequestValue(formatHttpMessage(requestValue))}
                  title="Format request"
                >
                  <Wand2 size={14} />
                </button>
              }
            />

            <EditorPanel
              title="HTTP Response"
              icon={<ArrowLeft size={16} className="text-warning" style={{ marginRight: 8 }} />}
              value={responseValue}
              onChange={setResponseValue}
              extensions={httpExtensions}
              actions={
                <button
                  className="btn-icon"
                  onClick={() => setResponseValue(formatHttpMessage(responseValue))}
                  title="Format response"
                >
                  <Wand2 size={14} />
                </button>
              }
            />

            <ResultsPanel results={results} themeExtension={themeExtension} />
          </div>
        </div>
      </div>

      {error && (
        <div className="toast-container">
          <Toast type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}
      {toast && (
        <div className="toast-container">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </>
  )
}
