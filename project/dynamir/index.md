---
title: "DynaMIR"
description: "A modern dynamic binary instrumentation engine for x86-64, ARM64, and RISC-V64, built around a custom MLIR-based IR."
canonical_url: "https://www.romainthomas.fr/project/dynamir/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["DBI","MLIR","x86-64","ARM64","RISC-V64"]
categories: []
---

# DynaMIR

> A modern dynamic binary instrumentation engine for x86-64, ARM64, and RISC-V64, built around a custom MLIR-based IR.

DynaMIR is a dynamic binary instrumentation engine for x86-64, ARM64, and
RISC-V64. It lifts machine code into a custom MLIR-based intermediate
representation, applies instrumentation, and lowers the result back into
executable instructions.

Conceptually similar to QBDI, DynaMIR is designed around a modern, composable IR
and integrates directly with MCStone and LIEF. It provides the execution layer
for tracing, program analysis, and trace-based workflows.
