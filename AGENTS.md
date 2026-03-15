# Coraza Playground - Agent Guide

## Overview
Browser-based WAF testing tool for the Coraza Web Application Firewall. Users write SecLang rules, provide HTTP request/response pairs, and run analysis through a WASM-compiled Coraza engine. Deployed at playground.coraza.io.

## Architecture
```
Browser → WASM (Go) → Coraza WAF Engine
  ↑                        ↓
  └── Results (JSON) ←─────┘
```

- **Frontend**: Vanilla JS + CodeMirror 5 + Bootstrap 5 (in `public/`)
- **Backend**: Go compiled to WebAssembly (`GOOS=js GOARCH=wasm`)
- **Grammar**: Lezer parser for SecLang syntax highlighting

## Build Commands
```bash
go run mage.go build     # Build WASM + frontend → ./www/
go run mage.go test      # Run Go tests
go run mage.go lint      # Lint Go code
go run mage.go format    # Format Go code
npm ci                   # Install frontend dependencies
npm run build-grammar    # Rebuild SecLang parser from grammar
```

## Key Constraints
- WASM build uses `GOOS=js GOARCH=wasm` with `-tags=no_fs_access`
- Uses experimental API: `plugintypes.TransactionState` at `processor.go`
- Go `syscall/js` for JavaScript interop — no HTTP server in WASM
- The `playground()` JS function is the WASM entry point, called from frontend

## Code Style
- Go: `gofmt`, `gosimports`, Apache 2.0 license headers
- All Go files need `// Copyright <year> The OWASP Coraza contributors` header

## Testing
- Go tests: `internal/processor_test.go`
- CI runs on PRs and pushes to main

## CI/CD
- **test.yaml**: Lint + test + build on PRs and main pushes
- **publish.yaml**: Build and deploy to GitHub Pages on main push
- **nightly-coraza-check.yaml**: Test against latest Coraza HEAD

## SecLang Grammar
Edit `grammar/seclang.grammar`, then run `npm run build-grammar` to regenerate `seclang-parser.js` and `seclang-parser.terms.js`.
