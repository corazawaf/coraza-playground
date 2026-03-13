// Copyright 2024 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

import { parser } from './seclang-parser'
import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { styleTags, tags as t } from '@lezer/highlight'

const seclangHighlighting = styleTags({
  DirectiveName: t.keyword,
  Variable: t.variableName,
  Operator: t.operatorKeyword,
  Action: t.function(t.name),
  QuotedString: t.string,
  Number: t.number,
  Comment: t.lineComment,
  Word: t.atom,
})

const seclangLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [seclangHighlighting],
  }),
  languageData: {
    commentTokens: { line: '#' },
  },
})

export function seclang(): LanguageSupport {
  return new LanguageSupport(seclangLanguage)
}
