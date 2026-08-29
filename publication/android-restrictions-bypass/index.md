---
title: "Android Runtime Restrictions Bypass"
description: "This paper explains how to disable runtime restrictions without root privileges"
canonical_url: "https://www.romainthomas.fr/publication/android-restrictions-bypass/"
authors: ["Romain Thomas"]
date_published: "2019-03-23T00:00:00Z"
date_modified: "2022-04-25T18:25:50+02:00"
language: "en-US"
section: "publication"
tags: []
categories: []
---

# Android Runtime Restrictions Bypass

> This paper explains how to disable runtime restrictions without root privileges

> **Note**
This publication is also available on the [Quarkslab Blog](https://blog.quarkslab.com/android-runtime-restrictions-bypass.html).


With the release of Android Nougat, Google introduced restriction about native libraries that can be loaded from an Android application. Basically, it prevents developers to link against some internal libraries such as ``libart.so``.

Later on and with the release of Android Pie, they introduced a new restriction on the access to internal Java methods (or fields). Basically, these restrictions are used to prevent developers to access parts of the Android internal framework.

Whereas these limitations aim to be used for compatibility purposes, this article shows how we can take advantage of Android internal to disable them. We briefly explain how these restrictions work and how to disable them from an application without **privileges**.

The first part deals with the native library loading restriction while the second is about Java internal framework restriction.


[PDF document](/publication/android-restrictions-bypass/report.pdf)
