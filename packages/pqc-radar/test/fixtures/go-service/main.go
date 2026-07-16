package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
)

func makeKeys() error {
	if _, err := rsa.GenerateKey(rand.Reader, 2048); err != nil {
		return err
	}
	if _, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader); err != nil {
		return err
	}
	return nil
}

func legacyDigest(data []byte) []byte {
	h := sha1.New()
	h.Write(data)
	return h.Sum(nil)
}
