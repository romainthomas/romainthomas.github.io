---
title: "MCStone"
description: "A clean, high-performance assembler and disassembler built on LLVM's MC layer for production reverse-engineering workloads."
canonical_url: "https://www.romainthomas.fr/project/mcstone/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["LLVM MC","assembler","disassembler"]
categories: []
---

# MCStone

> A clean, high-performance assembler and disassembler built on LLVM's MC layer for production reverse-engineering workloads.

MCStone is an assembler and disassembler built directly on LLVM's MC layer. It
provides one modern C++ interface for turning text or MC instructions into bytes
and decoding bytes back into structured instructions across major instruction
sets.

It is similar to Capstone, Keystone, and Nyxstone, with a cleaner
design and battle-tested performance for heavy workloads. MCStone also
serves as the instruction layer shared by the rest of the private tooling stack.
