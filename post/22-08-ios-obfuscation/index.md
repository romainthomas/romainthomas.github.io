---
title: "A Journey in iOS App Obfuscation"
description: "This series of blog posts details how obfuscators can protect iOS applications from reverse engineering"
canonical_url: "https://www.romainthomas.fr/post/22-08-ios-obfuscation/"
authors: ["Romain Thomas"]
date_published: "2022-08-22T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "post"
tags: ["ios","reverse engineering","obfuscation"]
categories: ["iOS","Reverse Engineering"]
---

# A Journey in iOS App Obfuscation

> This series of blog posts details how obfuscators can protect iOS applications from reverse engineering

Back in July 2021, I took a look at the protections provided by Arxan to detect jailbroken devices in PokemonGO for iOS
([*Gotta Catch 'Em All: Frida & jailbreak detection*](/post/21-07-pokemongo-anti-frida-jailbreak-bypass)).

To continue walking along the path of iOS reverse engineering, I recently took a look at two iOS applications
protected by a solution providing both native code obfuscation and RASP (*Runtime Application Self Protection*) protections.

I ended up with two blog posts:

- [Part 1 -- SingPass RASP Analysis](/post/22-08-singpass-rasp-analysis)
- [Part 2 -- Native Code Obfuscation and RASP Syscalls Bypass](/post/22-09-ios-obfuscation-syscall-hooking)

The first part is an in-depth analysis of RASP detections methods on iOS while the second part details
native code obfuscation and a new technique to bypass inlined syscalls (without Frida/Frida's stalker and without a disassembler)

> **Note**
The obfuscator mentioned in these blog posts provides strong and state-of-the-art protections to hinder reverse engineering.
When dealing with obfuscation, saying that something is broken does not make really sense
as if an attacker is skilled and **strongly motivated**, he will very likely achieve his goal.

Moreover, this series of blog posts do not (and can't) **exhaustively** evaluate the strength of this commercial
solution because:

1. The applications analyzed might not use the latest version of the obfuscator.
2. All the obfuscation features might not have been enabled by the developers (e.g. for performance reasons).
3. The developers might have weakened the obfuscation scheme (unintentionally).

In summary, these blog posts aim at sharing -- from a technical point of view -- what RASP and native code
obfuscation look like on iOS. The scripts/code associated with these blog posts will not be published as it
does not really bring more information.

The commercial solution not mentioned in the blog posts is and remains a good choice for protecting assets from
reverse engineering. If you have doubts I would be very happy to discuss it.
