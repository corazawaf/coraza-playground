package internal

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/corazawaf/coraza/v3/rules"
	"github.com/corazawaf/coraza/v3/types"
	"github.com/corazawaf/coraza/v3/types/variables"
)

func RequestProcessor(tx types.Transaction, reader io.Reader) error {
	scanner := bufio.NewScanner(reader)
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	method := ""
	url := ""
	protocol := ""
	for scanner.Scan() {
		if fl {
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return fmt.Errorf("invalid variable count for request header")
			}
			method, url, protocol = spl[0], spl[1], spl[2]
			fl = false
			headers = true
		} else if headers {
			l := scanner.Text()
			if l == "" {
				headers = false
				body = true
				continue
			}
			spl := strings.SplitN(l, ": ", 2)
			if len(spl) != 2 {
				return fmt.Errorf("invalid variable count for request header")
			}
			tx.AddRequestHeader(spl[0], spl[1])
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	tx.ProcessURI(url, method, protocol)
	tx.ProcessRequestHeaders()
	tx.WriteRequestBody([]byte(strings.Join(bodybuffer, "\r\nr")))
	tx.ProcessRequestBody()

	return nil
}

func ResponseProcessor(tx types.Transaction, reader io.Reader) error {
	scanner := bufio.NewScanner(reader)
	fl := true
	headers := false
	body := false
	bodybuffer := []string{}
	protocol := ""
	status := ""

	for scanner.Scan() {
		if fl {
			spl := strings.SplitN(scanner.Text(), " ", 3)
			if len(spl) != 3 {
				return fmt.Errorf("invalid variable count for response header")
			}
			protocol, status, _ = spl[0], spl[1], spl[2]
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
				return fmt.Errorf("invalid response header")
			}
			key, value := spl[0], spl[1]
			value = strings.TrimSpace(value)
			tx.AddResponseHeader(key, value)
		} else if body {
			bodybuffer = append(bodybuffer, scanner.Text())
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}

	bf := strings.Join(bodybuffer, "\r\n")
	tx.WriteResponseBody([]byte(bf))
	st, _ := strconv.Atoi(status)
	tx.ProcessResponseHeaders(st, protocol)
	tx.ProcessResponseBody()
	return nil
}

func BuildResults(tx types.Transaction) map[string]interface{} {
	txState := tx.(rules.TransactionState)
	collections := make([][4]string, 0)
	// we transform this into collection, key, index, value
	for i := variables.RuleVariable(1); i < types.VariablesCount; i++ {
		v := txState.Collection(variables.RuleVariable(i))
		if v == nil {
			fmt.Printf("Error nil %d\n", i)
			continue
		}
		for index, md := range v.FindAll() {
			collections = append(collections, [4]string{
				v.Name(),
				md.Key(),
				strconv.Itoa(index),
				md.Value(),
			})
		}
	}

	return map[string]interface{}{
		"transaction_id": tx.ID(),
		"collections":    collections,
	}
}
