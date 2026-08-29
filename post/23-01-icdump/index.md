---
title: "iCDump: A Modern Objective-C Class Dump"
description: "This blog post introduces iCDump, a new Objective-C class dump based on LLVM."
canonical_url: "https://www.romainthomas.fr/post/23-01-icdump/"
authors: ["Romain Thomas"]
date_published: "2023-01-04T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "post"
tags: ["iOS","Objective-C","LLVM","OSX"]
categories: ["iOS","Reverse Engineering"]
---

# iCDump: A Modern Objective-C Class Dump

> This blog post introduces iCDump, a new Objective-C class dump based on LLVM.

## Introduction

iCDump is a tool to access and process Objective-C metadata located in 64-bits Mach-O binaries.
It uses LIEF to load the raw Objective-C data and LLVM to output the reconstructed Objective-C structures.
The *LLVM output* was inspired by [rellic](https://github.com/lifting-bits/rellic) developed by Trail of Bits.

The project is available on GitHub: [romainthomas/iCDump](https://github.com/romainthomas/iCDump).

## Quick Start

Python wheels for Linux and OSX are available on PyPI such as one can install iCDump through:

```bash
$ pip install [--user] icdump
```

Once installed, you can run [readobjc.py](https://github.com/romainthomas/iCDump/blob/main/bindings/python/tools/readobjc.py)
to quickly extract Objective-C structures from a Mach-O binary:

```bash
$ readobjc.py ./RNCryptor.bin
```

```objc
@protocol __ARCLiteKeyedSubscripting__
- (NSObject *)objectForKeyedSubscript:(NSObject *)self :(SEL)id :(NSObject *)arg2;
- (void)setObject:(NSObject *)self forKeyedSubscript:(SEL)id :(NSObject *)arg2 :(NSObject *)arg3;
@end
@interface PodsDummy_RNCryptor_iOS
@end
@interface RNCryptor.RNCryptor.Encryptor{
    NSObject * encryptor;
}
@end
@interface RNCryptor.RNCryptor.Decryptor{
    NSObject * decryptors;
    NSObject * buffer;
    NSObject * decryptor;
    NSObject * password;
}
@end
```

Using the Python API, we can output these header-like structures as follows:

```python
import icdump

metadata = icdump.objc.parse("./RNCryptor.bin")

print(metadata.to_decl())
```

## Limitations

In its current form, iCDump can only process Objective-C metadata but the Swift structures also aim at being
supported by iCDump. I started a PoC for this part but it's far from being ready to be merged.

The second limitation is Windows. Theoretically, iCDump and its Python bindings, could be compiled for Windows but to
be honest, for this release I was lazy to set up the CI pipeline with LLVM for Windows. Nevertheless,
Windows users should be able to play with iCDump thanks to WSL.

The API documentation needs to be written and generated with Sphinx but in the meanwhile, you can directly take
a look at the [Python binding](https://github.com/romainthomas/iCDump/blob/main/bindings/python/src/ObjC/init.cpp)
which synthesis the important functions.
