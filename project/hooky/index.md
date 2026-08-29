---
title: "Hooky"
description: "A modern C++ hooking framework for x86-64, ARM64, and RISC-V64, with cross-platform detours and function replacement."
canonical_url: "https://www.romainthomas.fr/project/hooky/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["hooking","x86-64","ARM64","RISC-V64"]
categories: []
---

# Hooky

> A modern C++ hooking framework for x86-64, ARM64, and RISC-V64, with cross-platform detours and function replacement.

Hooky is a cross-platform, cross-architecture function-hooking framework with a
modern C++ API. Hooks can observe full CPU context on function entry and exit,
replace functions, and call generated trampolines while retaining explicit
control over hook state.

It targets x86-64, ARM64, and RISC-V64 and fills a role similar to Frida's
Interceptor and Dobby. Internally, Hooky composes with LIEF Runtime, MCStone, and LLVM
into a portable detour engine.
