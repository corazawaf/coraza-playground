// Copyright 2026 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

export async function initWasm(): Promise<void> {
  const go = new Go()
  const result = await WebAssembly.instantiateStreaming(
    fetch('/playground.wasm'),
    go.importObject,
  )
  go.run(result.instance)
}
