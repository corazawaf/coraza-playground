package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"regexp"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	utils "github.com/jptosso/coraza-waf/v2/utils/strings"
)

var s3session *session.Session

func connectAws() error {
	var err error
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}

	s3session, err = session.NewSession(
		&aws.Config{
			Credentials: credentials.NewEnvCredentials(),
			Region:      &region,
		})

	// we shouldn't expose the ENV variable, it could be used to
	// steal credentials
	os.Clearenv()
	return err
}

func getItem(id string) (ClientRequest, error) {
	re := regexp.MustCompile(`^[\w]+$`)
	cr := &ClientRequest{}
	if !re.MatchString(id) {
		return *cr, fmt.Errorf("invalid id")
	}
	downloader := s3manager.NewDownloader(s3session)
	buf := aws.NewWriteAtBuffer([]byte{})

	_, err := downloader.Download(buf, &s3.GetObjectInput{
		Bucket: aws.String(settings.Aws.Bucket),
		Key:    aws.String(id),
	})
	if err != nil {
		return *cr, err
	}
	err = json.Unmarshal(buf.Bytes(), cr)
	return *cr, err
}

func uploadItem(data []byte) (string, error) {
	tname := utils.SafeRandom(10)
	if s3session == nil {
		return "", fmt.Errorf("aws session was not started")
	}
	uploader := s3manager.NewUploader(s3session)
	_, err := uploader.Upload(&s3manager.UploadInput{
		Bucket: aws.String(settings.Aws.Bucket),
		ACL:    aws.String("private"),
		Key:    aws.String(tname),
		Body:   bytes.NewReader(data),
	})
	if err != nil {
		return "", err
	}
	return tname, nil
}
