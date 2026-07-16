using System.Security.Cryptography;

namespace Example.Api;

public class CryptoService
{
    public void Init()
    {
        using var rsa = RSA.Create(2048);
        using var ecdsa = ECDsa.Create();
        using var md5 = MD5.Create();
    }
}
