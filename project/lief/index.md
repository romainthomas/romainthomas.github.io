---
title: "LIEF"
description: "Parse, inspect, modify, and build ELF, PE, Mach-O, DEX, and more through one consistent C++, Python, Rust, Java, or C API."
canonical_url: "https://www.romainthomas.fr/project/lief/"
authors: ["Romain Thomas"]
date_published: "2016-04-27T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["ELF","PE","Mach-O","DEX","multi-language"]
categories: []
---

# LIEF

> Parse, inspect, modify, and build ELF, PE, Mach-O, DEX, and more through one consistent C++, Python, Rust, Java, or C API.

LIEF is a cross-platform library to parse, inspect, modify, and rebuild executable formats through a consistent API. It supports ELF, PE, Mach-O, COFF, DEX, OAT, VDEX, ART, and more, with bindings for C++, Python, Rust, Java, and C.

It turns out that many projects need to parse executable formats and they usually re-implement their own parser. Moreover, these parsers are usually bound to one language.

LIEF fills this void with one well-tested abstraction used by reverse-engineering tools, security products, instrumentation pipelines, and research projects.
