FROM jptosso/coraza-waf

COPY * .

RUN go build playground.go

CMD ["./main", "-config", "config.yaml"]