package main

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

const DEFAULT_VERSION = "v3.3.2"

func downloadCrs(version string, dest string) error {
	if version == "" {
		version = DEFAULT_VERSION
	}
	if getCurrentCrs(dest) == version {
		fmt.Printf("[CRS] Already on version %s\n", version)
		return nil
	}
	u := fmt.Sprintf("https://github.com/coreruleset/coreruleset/archive/refs/tags/%s.tar.gz", version)
	fmt.Println("[CRS] Downloading...")
	resp, err := http.Get(u)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	dir, err := ioutil.TempDir("/tmp", "crs*")
	defer os.Remove(dir)
	if err != nil {
		return err
	}

	fmt.Println("[CRS] Unpacking...")
	_, err = unpackCrs(resp.Body, dir)
	if err != nil {
		return err
	}

	rulespath := path.Join(dir, fmt.Sprintf("coreruleset-%s", version[1:]), "rules/")
	fmt.Printf("[CRS] Setting rule path: %s\n", rulespath)
	// we build the CRS file
	files, _ := filepath.Glob(rulespath + "/*.conf")
	fmt.Println("[CRS] Merging...")
	if err := mergefiles(files, dest); err != nil {
		return err
	}
	fmt.Printf("[CRS] %d files merged\n", len(files))

	fmt.Println("[CRS] Moving...")

	// we move the data files
	files, _ = filepath.Glob(rulespath + "/*.data")
	for _, f := range files {
		err := os.Rename(f, path.Join(dest, filepath.Base(f)))
		if err != nil {
			return err
		}
	}
	fmt.Printf("[CRS] %d files moved\n", len(files))
	return os.WriteFile(path.Join(dest, "VERSION"), []byte(version), 0655)
}

func getCurrentCrs(dst string) string {
	location := path.Join(dst, "VERSION")
	if _, err := os.Stat(location); err == os.ErrNotExist {
		return ""
	}
	f, _ := os.ReadFile(location)
	return string(strings.TrimSpace(string(f)))
}

func unpackCrs(src io.Reader, dest string) ([]string, error) {
	var filenames []string

	r, err := gzip.NewReader(src)
	if err != nil {
		return filenames, err
	}
	defer r.Close()

	tarReader := tar.NewReader(r)
	for {
		header, err := tarReader.Next()
		switch {

		// if no more files are found return
		case err == io.EOF:
			return filenames, nil

		// return any other error
		case err != nil:
			return []string{}, err

		// if the header is nil, just skip it (not sure how this happens)
		case header == nil:
			continue
		}
		name := path.Join(dest, header.Name)
		switch header.Typeflag {
		case tar.TypeDir: // = directory
			if err := os.MkdirAll(name, 0755); err != nil {
				return []string{}, err
			}

		case tar.TypeReg: // = regular file
			f, err := os.OpenFile(name, os.O_CREATE|os.O_RDWR, os.FileMode(header.Mode))
			if err != nil {
				return []string{}, err
			}

			// copy over contents
			if _, err := io.Copy(f, tarReader); err != nil {
				return []string{}, err
			}

			// manually close here after each file operation; defering would cause each file close
			// to wait until all operations have completed.
			f.Close()
			filenames = append(filenames, name)
		}
	}
}

func mergefiles(files []string, dst string) error {
	if _, err := os.Stat(dst); err != nil {
		err = os.MkdirAll(dst, 0755)
		if err != nil {
			return err
		}
	}
	f, err := os.Create(path.Join(dst, "crs.conf"))
	if err != nil {
		return err
	}
	defer f.Close()
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		f.Write(data)
		f.Write([]byte{'\n'})
	}
	return nil
}
