---
title: "BinLift"
description: "A user-friendly binary lifter built on QBDL, with DWARF-aware types and native or instrumented function calls."
canonical_url: "https://www.romainthomas.fr/project/binlift/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["binary lifting","QBDL","QBDI","DWARF"]
categories: []
---

# BinLift

> A user-friendly binary lifter built on QBDL, with DWARF-aware types and native or instrumented function calls.

BinLift combines QBDL's portable binary loading with DynaMIR instrumentation,
DWARF-backed types, and modern C++ and Python APIs. It provides a high-level way
to resolve functions and variables, translate addresses, access memory, and call
native or instrumented code without rebuilding the surrounding runtime by hand.

This tool was used to break DexProtector; the resulting analysis is documented
in [A Glimpse Into DexProtector](/post/26-01-dexprotector).
