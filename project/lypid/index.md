---
title: "Lypid"
description: "A user-friendly library for inspecting and generating DWARF and PDB debug information."
canonical_url: "https://www.romainthomas.fr/project/lypid/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["DWARF","PDB","debug information"]
categories: []
---

# Lypid

> A user-friendly library for inspecting and generating DWARF and PDB debug information.

Lypid provides a modern C++ API for navigating DWARF and PDB debug information:
compilation units, functions, variables, types, public symbols, and source-line
data can all be inspected through a consistent interface.

Beyond parsing, it can reconstruct source-level declarations and generate debug
information for ELF, PE, and Mach-O targets. This makes DWARF and PDB a
programmable building block for LIEF Extended and higher-level binary analysis
workflows.
