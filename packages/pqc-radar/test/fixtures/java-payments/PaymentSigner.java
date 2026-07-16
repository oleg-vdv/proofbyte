package com.example.payments;

import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.Signature;

public class PaymentSigner {
    public void init() throws Exception {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
        keyGen.initialize(2048);
        Signature sig = Signature.getInstance("SHA1withRSA");
        MessageDigest digest = MessageDigest.getInstance("MD5");
    }
}
