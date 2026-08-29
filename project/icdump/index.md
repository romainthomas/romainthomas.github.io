---
title: "iCDump"
description: "A modern, cross-platform Objective-C class dump that reconstructs declarations from Mach-O metadata with LIEF and LLVM."
canonical_url: "https://www.romainthomas.fr/project/icdump/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["Objective-C","Mach-O","LIEF Extended"]
categories: []
---

# iCDump

> A modern, cross-platform Objective-C class dump that reconstructs declarations from Mach-O metadata with LIEF and LLVM.

iCDump parses Objective-C metadata from Mach-O binaries and reconstructs classes,
protocols, categories, properties, instance variables, and methods as readable
declarations. It runs independently of the Apple ecosystem and uses LIEF for
binary access and LLVM for declaration output.

The project is now closed source and its Objective-C engine is integrated into
LIEF Extended. The original public release is documented in
[iCDump: A Modern Objective-C Class Dump](/post/23-01-icdump).
