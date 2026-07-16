import hashlib

from cryptography.hazmat.primitives.asymmetric import rsa


def make_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def checksum(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()
