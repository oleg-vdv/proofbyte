use rsa::RsaPrivateKey;
use p256::ecdsa::SigningKey;

fn make_keys() {
    let mut rng = rand::thread_rng();
    let _rsa_key = RsaPrivateKey::new(&mut rng, 2048).expect("keygen");
    let _ec_key = SigningKey::random(&mut rng);
    let _verifier: p256::ecdsa::VerifyingKey = _ec_key.verifying_key().to_owned();
}
