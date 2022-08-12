package main

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/corazawaf/coraza/v2"
	"github.com/corazawaf/coraza/v2/seclang"
	"github.com/corazawaf/coraza/v2/types"
	"github.com/corazawaf/coraza/v2/types/variables"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type logWriter struct {
	logs []string
}

func (l *logWriter) Write(p []byte) (int, error) {
	l.logs = append(l.logs, string(p))
	return len(p), nil
}

type corazav2 struct {
	coraza       *coraza.Waf
	parser       *seclang.Parser
	matchedRules []coraza.MatchedRule
	responseCode int
	debug        *logWriter
}

func (c *corazav2) Init() {
	c.debug = &logWriter{make([]string, 0)}
	c.coraza = coraza.NewWaf()
	c.coraza.SetErrorLogCb(func(mr coraza.MatchedRule) {
		c.matchedRules = append(c.matchedRules, mr)
	})
	c.setLogger()
	c.parser, _ = seclang.NewParser(c.coraza)
}

func (c *corazav2) AddDirectivesFromFile(path string) error {
	return c.parser.FromFile(path)
}

func (c *corazav2) AddDirectivesFromString(directives string) error {
	return c.parser.FromString(directives)
}

func (c *corazav2) Results(request *http.Request, response *http.Response, phases int) (*ServerResponse, error) {
	// we call it twice in case some directive overwrites the logger
	c.setLogger()
	tx := c.coraza.NewTransaction()
	c.responseCode = response.StatusCode
	cleaned := false
	defer func() {
		if !cleaned {
			tx.Clean()
		}
	}()
	if phases >= 1 {
		tx.ProcessConnection("200.200.200.1", 55555, "127.0.0.1", 80)
		tx.ProcessURI(request.URL.String(), request.Method, request.Proto)
		for k, v := range request.Header {
			for _, value := range v {
				tx.AddRequestHeader(k, value)
			}
		}
		tx.ProcessRequestHeaders()
	}
	if phases >= 2 {
		io.Copy(tx.RequestBodyBuffer, request.Body)
		if _, err := tx.ProcessRequestBody(); err != nil {
			return nil, err
		}
	}
	if phases >= 3 {
		for k, v := range response.Header {
			for _, value := range v {
				tx.AddResponseHeader(k, value)
			}
		}
		tx.ProcessResponseHeaders(response.StatusCode, response.Proto)
	}
	if phases >= 4 {
		io.Copy(tx.ResponseBodyBuffer, response.Body)
		if _, err := tx.ProcessResponseBody(); err != nil {
			return nil, err
		}
	}
	if phases >= 5 {
		tx.ProcessLogging()
	}
	res, err := c.buildResponse(tx)
	cleaned = true
	tx.Clean()
	return res, err
}

func (c *corazav2) buildResponse(tx *coraza.Transaction) (*ServerResponse, error) {
	jsonal, err := json.Marshal(tx.AuditLog())
	if err != nil {
		return nil, err
	}
	out := ""
	for _, mr := range c.matchedRules {
		out += mr.ErrorLog(c.responseCode) + "\n"
	}
	vars := make(map[string]map[string][]string)
	for v := byte(0); v < types.VariablesCount; v++ {
		rv := variables.RuleVariable(v)
		vars[rv.Name()] = tx.GetCollection(rv).Data()
	}
	return &ServerResponse{
		AuditLog:     string(jsonal),
		Output:       out,
		Variables:    vars,
		MatchedRules: nil,
		Debug:        c.debug.logs,
	}, nil
}

func (c *corazav2) setLogger() {
	config := zap.NewProductionEncoderConfig()
	fileEncoder := zapcore.NewJSONEncoder(config)
	core := zapcore.NewTee(
		zapcore.NewCore(fileEncoder, zapcore.AddSync(c.debug), zap.DebugLevel),
	)
	logger := zap.New(core)
	*c.coraza.Logger = *logger
}

var _ waf = &corazav2{}
