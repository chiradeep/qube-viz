FROM golang:1.6-alpine
RUN apk add --no-cache git conntrack-tools
COPY . /go/src/app
RUN (cd /go/src/app && go get -d -v)
RUN (cd /go/src/app && go install -v)
RUN (cd /go/src/app && go build main.go)

CMD ["app"]
