package main

import (
	"os"

	"gopkg.in/yaml.v2"
)

type ConfigDisable struct {
	Operators  []string `yaml:"operators"`
	Actions    []string `yaml:"actions"`
	Directives []string `yaml:"directives"`
}

type Config struct {
	Port    int            `yaml:"port"`
	Address string         `yaml:"address"`
	CrsPath string         `yaml:"crs_path"`
	Disable *ConfigDisable `yaml:"disable"`
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
