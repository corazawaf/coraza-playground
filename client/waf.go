package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

type ClientRequest struct {
	Request    string  `json:"request"`
	Response   string  `json:"response"`
	Directives string  `json:"directives"`
	CrsVersion *string `json:"crs"`
}

type ServerResponse struct {
	Error        string                         `json:"error"`
	AuditLog     string                         `json:"auditlog"`
	Output       string                         `json:"output"`
	Variables    map[string]map[string][]string `json:"variables"`
	MatchedRules map[int]string                 `json:"matched_rules"`
	Debug        []string                       `json:"debug"`
}

type waf interface {
	AddDirectivesFromFile(path string) error
	AddDirectivesFromString(directives string) error
	Results(request *http.Request, response *http.Response, phases int) (*ServerResponse, error)
}

func requestProcessor(input string) (*http.Request, error) {
	scanner := bufio.NewScanner(strings.NewReader(input))
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	req := &http.Request{}

	for scanner.Scan() {
		if fl {
			var err error
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return nil, fmt.Errorf("invalid variable count for response header")
			}
			method, urlraw, protocol := spl[0], spl[1], spl[2]
			req.Proto = protocol
			req.Method = method
			req.URL, err = url.Parse(urlraw)
			if err != nil {
				return nil, err
			}
			fl = false
			headers = true
		} else if headers {
			l := scanner.Text()
			if l == "" {
				headers = false
				body = true
				continue
			}
			spl := strings.SplitN(l, ":", 2)
			if len(spl) != 2 {
				return nil, fmt.Errorf("invalid request header")
			}
			key, value := spl[0], spl[1]
			value = strings.TrimSpace(value)
			req.Header.Add(key, value)
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	bf := strings.Join(bodybuffer, "\r\n")
	req.Body = ioutil.NopCloser(bytes.NewBufferString(bf))
	req.ContentLength = int64(len(bf)) + int64(len(bodybuffer)*2)
	return req, nil
}

func responseProcessor(input string) (*http.Response, error) {
	scanner := bufio.NewScanner(strings.NewReader(input))
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	protocol := ""
	status := ""
	res := &http.Response{}

	for scanner.Scan() {
		if fl {
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return nil, fmt.Errorf("invalid variable count for response header")
			}
			protocol, status, _ = spl[0], spl[1], spl[2]
			res.Proto = protocol
			st, _ := strconv.Atoi(status)
			res.StatusCode = st
			res.Status = fmt.Sprintf("%s %s", spl[1], spl[2])
			fl = false
			headers = true
		} else if headers {
			l := scanner.Text()
			if l == "" {
				headers = false
				body = true
				continue
			}
			spl := strings.SplitN(l, ":", 2)
			if len(spl) != 2 {
				return nil, fmt.Errorf("invalid response header")
			}
			key, value := spl[0], spl[1]
			value = strings.TrimSpace(value)
			res.Header.Add(key, value)
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	bf := strings.Join(bodybuffer, "\r\n")
	res.Body = ioutil.NopCloser(bytes.NewBufferString(bf))
	res.ContentLength = int64(len(bf)) + int64(len(bodybuffer)*2)
	return res, nil
}
