package main

import (
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Port    int    `yaml:"port"`
	Address string `yaml:"address"`
	CrsPath string `yaml:"crs_path"`
	Aws     struct {
		Enabled bool   `yaml:"enabled"`
		Bucket  string `yaml:"bucket"`
	} `yaml:"aws"`
	Disable struct {
		Operators  []string `yaml:"operators"`
		Actions    []string `yaml:"actions"`
		Directives []string `yaml:"directives"`
	} `yaml:"disable"`
	Crs struct {
		Path    string `yaml:"path"`
		Enabled bool   `yaml:"enabled"`
		Version string `yaml:"version"`
	} `yaml:"crs"`
}

func OpenConfig(file string) (*Config, error) {
	bs, err := os.ReadFile(file)
	if err != nil {
		return nil, err
	}
	conf := &Config{}
	err = yaml.Unmarshal(bs, conf)
	return conf, err
}
