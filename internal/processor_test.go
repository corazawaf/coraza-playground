// Copyright 2023 The OWASP Coraza contributors
// SPDX-License-Identifier: Apache-2.0

package internal

import (
	"strings"
	"testing"

	"github.com/corazawaf/coraza/v3"
)

const testResponse = `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Wed, 28 Jul 2021 16:00:00 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 15

<html>
<body>
</body>
</html>
`
const testRequest = `POST / HTTP/1.1
Host: localhost:3000
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Content-Lengt: 15
Content-Type: application/x-www-form-urlencoded

foo=bar&bar=foo
`

func TestReadRequest(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	if err := RequestProcessor(tx, strings.NewReader(testRequest)); err != nil {
		t.Error(err)
	}
}

func TestReadResponse(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	if err := ResponseProcessor(tx, strings.NewReader(testResponse)); err != nil {
		t.Error(err)
	}
}

func TestBuildResults(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	if err := RequestProcessor(tx, strings.NewReader(testRequest)); err != nil {
		t.Error(err)
	}
	results := BuildResults(tx, 1000, "DetectionOnly")
	if results["transaction_id"] == "" {
		t.Error("transaction_id is empty")
	}
	if r := results["collections"].(string); !strings.Contains(r, "RESPONSE_CONTENT_TYPE") {
		t.Error("unexpected value for RESPONSE_CONTENT_TYPE, got: " + r)
	}
}

func TestRequestProcessor_InvalidRequestLine(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	err := RequestProcessor(tx, strings.NewReader("INVALID REQUEST\n"))
	if err == nil {
		t.Error("expected error for invalid request line")
	}
}

func TestRequestProcessor_InvalidHeader(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	err := RequestProcessor(tx, strings.NewReader("GET / HTTP/1.1\nBadHeader\n\n"))
	if err == nil {
		t.Error("expected error for invalid header")
	}
}

func TestRequestProcessor_EmptyBody(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	err := RequestProcessor(tx, strings.NewReader("GET / HTTP/1.1\nHost: localhost\n\n"))
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}
}

func TestResponseProcessor_InvalidStatusLine(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	err := ResponseProcessor(tx, strings.NewReader("INVALID\n"))
	if err == nil {
		t.Error("expected error for invalid status line")
	}
}

func TestResponseProcessor_InvalidHeader(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	// Response headers split on ":" (not ": "), so a header without colon fails
	err := ResponseProcessor(tx, strings.NewReader("HTTP/1.1 200 OK\nBadHeader\n\n"))
	if err == nil {
		t.Error("expected error for invalid response header")
	}
}

func TestBuildResults_WithMatchedRules(t *testing.T) {
	waf, err := coraza.NewWAF(coraza.NewWAFConfig().WithDirectives(`
		SecRuleEngine On
		SecRule ARGS "@contains test" "id:1001,phase:2,deny,status:403,msg:'Test rule'"
	`))
	if err != nil {
		t.Fatal(err)
	}
	tx := waf.NewTransaction()
	req := "GET /?foo=test HTTP/1.1\nHost: localhost\n\n"
	if err := RequestProcessor(tx, strings.NewReader(req)); err != nil {
		t.Fatal(err)
	}
	results := BuildResults(tx, 500, "On")
	if results["transaction_id"] == "" {
		t.Error("transaction_id is empty")
	}
	if results["engine_status"] != "On" {
		t.Errorf("expected engine_status 'On', got '%s'", results["engine_status"])
	}
}

func TestBuildResults_Duration(t *testing.T) {
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	if err := RequestProcessor(tx, strings.NewReader("GET / HTTP/1.1\nHost: localhost\n\n")); err != nil {
		t.Fatal(err)
	}
	results := BuildResults(tx, 12345, "DetectionOnly")
	if results["duration"] != int64(12345) {
		t.Errorf("expected duration 12345, got %v", results["duration"])
	}
}
