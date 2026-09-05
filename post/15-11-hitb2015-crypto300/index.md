---
title: "HITB 2015 Write-up - Crypto 300"
description: "Write-up for the Crypto 300 challenge"
canonical_url: "https://www.romainthomas.fr/post/15-11-hitb2015-crypto300/"
authors: ["Romain Thomas"]
date_published: "2015-11-03T00:00:00Z"
date_modified: "2026-09-05T05:53:50+02:00"
language: "en-US"
section: "post"
tags: ["write-up","cryptography"]
categories: ["cryptography","write-up"]
---

# HITB 2015 Write-up - Crypto 300

> Write-up for the Crypto 300 challenge

## Introduction

The crypto 300 challenge was about RSA with a special generation of the prime numbers $p$ and $q$.
We were given a mail [mail.msg](mail.msg) which has been encrypted with RSA and whose the public key is in the [hitbctf.crt](hitbctf.crt) certificate.

## RSA's Parameters Construction

The modulus $N$ is built by choosing randomly a first prime number $p$, the second prime number $q$ is constructed in the following way:

$$\alpha \cdot (p - 1) \equiv 1 \pmod{e}$$

$$q = (p\alpha \bmod e) + k\cdot e$$

$k$ is a positive integer such as $q$ is a prime number and $e$ is the public exponent which is also a random prime number.

The following code is the implementation in Python:

```python
def gen_rsa_parameters():
    r = os.urandom(63)
    e = int(r.encode('hex'), 16)
    e = next_prime(e)
    r = os.urandom(64)
    p = int(r.encode('hex'), 16)
    p = next_prime(p)
    q = (p*modinv(p-1, e)%e)
    while not is_prime(q):
        q += e
    N = p*q
    phi = (p-1)*(q-1)
    d = modinv(e,phi)
    return N,e,d,p,q
```

## Theoretical attack

Let's $N^{\prime} = N \bmod{e}$. So we have

\begin{align}
N^{\prime} & \equiv & p \cdot q \pmod{e} \\\\\\
           & \equiv & p \cdot ((p\alpha \bmod e) + k\cdot e) \pmod{e} \\\\\\
           & \equiv & p^2\alpha \pmod{e} \\\\\\
\end{align}

We have $\alpha$ in the equation so we can introduce $p - 1$ to remove $\alpha$

\begin{align}
N^{\prime} & \equiv & (p - 1 + 1)^2\alpha \pmod{e} \\\\\\
           & \equiv & (p - 1)^2\alpha + 2(p - 1)\alpha + \alpha \pmod{e} \\\\\\
           & \equiv & (p - 1) + 2 + \alpha \pmod{e} \\\\\\
(p - 1)N^{\prime} & \equiv & (p - 1)^2 + 2(p - 1) + 1 \pmod{e}
\end{align}

$$\boxed{(p - 1)^2 - (N^{\prime} - 2)(p - 1) + 1 \equiv 0 \pmod{e}}$$

Now we have a quadratic equation which only depends on $p$.

Let's $X = p - 1$ and suppose that $N^{\prime} - 2$ is even and $N^{\prime} - 2 = 2b$.

\begin{align}
X^2 - 2bX + 1 & \equiv & 0 & \pmod{e} \\\\\\
(X - b)^2 - b^2 + 1 & \equiv & 0 & \pmod{e}\\\\\\
(X - b)^2 & \equiv & b^2 - 1 & \pmod{e}
\end{align}

By using [quadratic residue](https://en.wikipedia.org/wiki/Quadratic_residue) we can find a solution. We can also use *SAGE* and the `sqrt()` function:

```python
Np = N % e
b = (Np - 2) / 2
p = Mod(pow(b, 2) - 1, e).sqrt() + b + 1
```

At this point, we find $p \bmod{e}$ but not $p$ !

I tried to find $p$ by adding some $e$ but the *distance* between $p$ and $p \bmod{e}$ is huge. So I had to find another way.

By knowing $p \bmod{e}$ we can compute $\alpha$. Remember $$\alpha \cdot (p - 1) \equiv 1 \pmod{e}$$ and by having $\alpha$ and $p \bmod{e}$ we can brute force $q$ by adding $e$ until $(p\alpha \bmod e) + k\cdot e$ is prime and it divide $N$.

We did the assumption that $N^{\prime} - 2$ has to be even (so $N^{\prime}$ must be even) and in the certificate $N^{\prime}$ is even so everything is right.


## Practical Attack

First we have to extract the modulus $N$ and the public key $e$ from the certificate:

```console
$ openssl x509 -in hitbctf.crt -text -noout

Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number: 18379438180976429416 (0xff10e1a5ac5a0968)
    Signature Algorithm: sha1WithRSAEncryption
        Issuer: C=NL, ST=Noord-Holland, L=Amsterdam, O=HITB, OU=CTF
        Validity
            Not Before: May 24 09:58:26 2015 GMT
            Not After : May 23 09:58:26 2016 GMT
        Subject: C=NL, ST=Noord-Holland, L=Amsterdam, O=HITB, OU=CTF
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (1024 bit)
                Modulus:
                    00:e6:eb:89:c1:8d:49:c9:a2:02:2b:e0:b4:65:14:
                    6e:0f:90:45:1e:a3:4c:6b:60:56:00:4e:bd:15:59:
                    55:b1:35:96:c2:d6:83:ad:2f:23:6b:0b:2c:0e:0b:
                    88:83:b5:d6:cb:8a:0b:4f:f9:b7:eb:64:8c:95:2b:
                    6b:ef:5a:6f:04:f5:64:17:f5:1c:a9:14:d9:ea:73:
                    e7:dd:c5:f2:0d:ce:c3:9c:e8:4b:72:2a:0c:f3:d8:
                    5e:80:ce:78:64:63:e1:44:f6:1d:b5:9c:cf:45:ff:
                    0e:d3:7f:d0:ce:bd:37:a5:8d:8a:4b:08:33:9e:a3:
                    2c:bc:ab:61:64:03:fd:2c:c5
                Exponent:
                    69:60:2d:93:8a:81:5f:14:cf:9f:b8:36:c2:e0:4d:
                    4d:De:82:ba:fc:8d:56:c2:6d:8c:89:ef:3c:40:69:
                    5d:d5:d4:ef:a7:36:36:43:15:14:95:f3:8c:bf:24:
                    ae:94:30:92:40:79:12:00:1b:17:f5:53:33:9e:92:
                    70:70:49
    Signature Algorithm: sha1WithRSAEncryption
         17:2b:ea:be:90:ad:98:f2:2b:ff:f5:61:d3:ea:af:fb:35:3a:
         67:10:91:13:db:60:55:d9:09:8b:c2:1a:cf:6b:c6:1f:f2:10:
         7a:d1:7b:9d:ff:10:f2:f2:c0:a9:f5:aa:2e:09:93:40:88:92:
         7d:98:ff:e1:cb:dc:db:35:8d:e0:4b:21:99:76:bf:db:04:a2:
         62:a4:18:4e:fc:bb:a7:53:be:6a:a1:ef:ec:15:86:c1:f1:1e:
         87:6a:e9:af:fe:d1:08:eb:de:22:28:c4:5e:be:f1:41:0a:ca:
         cf:cf:da:63:b1:c1:56:e8:0c:8e:56:7f:08:94:0d:2b:2a:08:
```

`N = 1621575882314321757502664197090844942567381491984167028188381926885851`
`995558397927547394115469298694885747314992315746872071523931715177680193273`
`386465775883129725436206653605910592810579794603402792446164893148622893121`
`957048204358672599654432857497196823273138934901636721473789115585263150131`
`66594183212229`

`e = 21558488234539889837938770635971330903489839146766895224490179041465516`
`1931455822669631548838317075220811407344210520390992334648372016602816069805`
`30249`

With SAGE:

```python
sage: Np = N % e
sage: b = (Np - 2) / 2
sage: pp = int(Mod(pow(b, 2) - 1, e).sqrt()) + b + 1
sage: alpha = inverse_mod(int(X), int(e))
sage: q = (pp * alpha) % e
sage: while not is_prime(q) and N % q != 0:
....:         q += e
sage: p = N / q
sage: p
13317713478157317654574552532079837937895228108820477140030796245493222349714497856652987583926206280627498615972491072112647669795345566943409669535038641
sage: q
12176083266650126897170100375931110708350668494730113414987801764299563774952801449439933220072280766145748279998832962142839152786620322097065894585706069
```

We can now generate the private key by using [rsatool](rsatool.py):

```bash
$ ./rsatools.py -o private.pem \
-e 21558488234539889837938770635971330903489839146766895224490179041465516193145582266963154883831707522081140734421052039099233464837201660281606980530249 \
-p 13317713478157317654574552532079837937895228108820477140030796245493222349714497856652987583926206280627498615972491072112647669795345566943409669535038641 \
-q 12176083266650126897170100375931110708350668494730113414987801764299563774952801449439933220072280766145748279998832962142839152786620322097065894585706069
```

Finally, we can decrypt the message:

```bash
openssl smime -decrypt -in mail.msg -inkey private.pem
hitb{0b21cc2025534dbd2965390d2bcef45d}
```


The sources are available [here](hitb2015-crypto300.tar.gz)
