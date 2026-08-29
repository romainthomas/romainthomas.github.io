---
title: "CLayout"
description: "A Clang-powered analyzer for C and C++ layouts that resolves target-specific records, field offsets, sizes, methods, and types."
canonical_url: "https://www.romainthomas.fr/project/clayout/"
authors: ["Romain Thomas"]
date_published: "2023-01-01T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["Clang","C++","type layout"]
categories: []
---

# CLayout

> A Clang-powered analyzer for C and C++ layouts that resolves target-specific records, field offsets, sizes, methods, and types.

CLayout parses C and C++ declarations into a queryable description of their
target ABI layout. Backed by Clang, it resolves structures, enums, field types
and offsets, record sizes, methods, constructors, and return types for the exact
compiler arguments and target supplied by the caller.

Its C++ and Python APIs make foreign interfaces and platform headers easier to
inspect programmatically, including target-specific layouts such as Android NDK
types for AArch64.
