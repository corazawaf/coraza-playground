package internal

import (
	"strings"
	"testing"

	"github.com/corazawaf/coraza/v3"
)

func TestReadRequest(t *testing.T) {
	request := `POST / HTTP/1.1
Host: localhost:3000
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Content-Lengt: 15
Content-Type: application/x-www-form-urlencoded

foo=bar&bar=foo
`
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	if err := RequestProcessor(tx, strings.NewReader(request)); err != nil {
		t.Error(err)
	}
}

func TestReadResponse(t *testing.T) {
	response := `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Wed, 28 Jul 2021 16:00:00 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 15

<html>
<body>
</body>
</html>
`
	waf, _ := coraza.NewWAF(coraza.NewWAFConfig())
	tx := waf.NewTransaction()
	if err := ResponseProcessor(tx, strings.NewReader(response)); err != nil {
		t.Error(err)
	}
}
