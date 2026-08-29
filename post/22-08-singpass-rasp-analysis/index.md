---
title: "Part 1 – SingPass RASP Analysis"
description: "This first blog post introduces the RASP checks used in SingPass"
canonical_url: "https://www.romainthomas.fr/post/22-08-singpass-rasp-analysis/"
authors: ["Romain Thomas"]
date_published: "2022-08-29T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "post"
tags: ["ios","reverse engineering","obfuscation"]
categories: ["iOS","Reverse Engineering"]
---

# Part 1 – SingPass RASP Analysis

> This first blog post introduces the RASP checks used in SingPass

## Introduction

I started to dig into the [SingPass](https://apps.apple.com/sg/app/singpass/id1340660807) application
which turned out to be obfuscated and protected with Runtime Application Self-Protection (RASP).

Retrospectively, this application is pretty interesting to analyze RASP functionalities since:

1. It embeds advanced RASP functionalities (Jailbreak detection, Frida Stalker detection, ...).
2. The native code is *lightly* obfuscated.
3. The application starts by showing an error message which is a good *oracle* to know whether
   we managed to circumvent the RASP detections.

<div class="legacy-center singpass-splash">
![Technical diagram](svg/splash_screen.svg)
</div>


> **Note**
All the findings and the details of this blog post has been shared with the editor of the obfuscator.
The overall results have also been shared with SingPass. In addition, SingPass is part of a bug bounty
program on HackerOne. Bypassing these RASP checks are a prerequisite to go further in the security assessment
of this application.


By grepping some keywords in the install directory of the application, we actually get two results which
reveal the name of the obfuscator:

```text
iPhone:/private/[...]/SingPass.app root# grep -Ri +++++++ *
Binary file Frameworks/NuDetectSDK.framework/NuDetectSDK matches
Binary file SingPass matches
```

The NuDetectSDK binary also uses the same obfuscator but it does not seem
involved in the early jailbreak detection shown in the previous figure.
On the other hand, `SingPass` is the main binary of the application and we can observe strings related
to threat detections:

```text
$ SingPass.app strings ./SingPass|grep -i +++++++
+++++++ThreatLogAPI(headers:)
+++++++CallbackHandler(context:)
```


> **Note**
For those who would like to follow this blog post with the original binary, you can download the
decrypted SingPass Mach-O binary [from the research files](bin/SingPass).
The name of the obfuscator has been redacted but it does not impact the content of the code.




Unfortunately, the binary does not leak other strings that could help to identify where and how the application
detects jailbroken devices but fortunately, the application does not crash ...

If we assume that the obfuscator decrypts strings at runtime, we can try to dump the content of the `__data`
section when the error message is displayed. At this point of the execution, the strings used for detecting
jailbroken devices are likely decoded and clearly present in the memory.

> **Note**
This is actually quite the same technique used in **PokemonGO**: [*What About LIEF*](/post/21-07-pokemongo-anti-frida-jailbreak-bypass#what-about-lief)


1. We run the application and we wait for the *jailbreak* message
2. We attach to SingPass with Frida and we inject a library that:
    - Parses in-memory the `SingPass` binary (thanks to LIEF)
    - Dumps the content of the `__data` section
    - Write the dump in the iPhone's `/tmp` directory

Once the data section is dumped, we end up with the following changes in some parts of the `__data` section:

<div class="legacy-center">
<figure class="mb-4 singpass-data-slices">
  ![Technical diagram](svg/01-data-encrypted.svg)
  <br /><br />
  ![Technical diagram](svg/01-data-clear.svg)
<figcaption>Fig 1. Slices of the <code>__data</code> section before and after the dump</figcaption>
</figure>
</div>

> **Note**
The string encoding routines will be analyzed in the **second** part of this series of blog posts


In addition, we can observe the following strings which seem to be related to the RASP functionalities of the obfuscator:

<div class="legacy-center">
<figure class="mb-4" id="fig-2">
![Technical diagram](svg/ixg-data-redacted.svg)
<figcaption>Fig 2. Strings Related to the RASP Features</figcaption>
</figure>
<br /><br />
</div>

All the `EVT_*` strings are referenced by one **and only one** function that I named <span class="dark-boxed dark-purple">on_rasp_detection</span>.
This function turns out to be the threat detection callback used by the app's developers to perform action(s)
when a RASP event is triggered.

To better understand the logic of the checks behind these strings, let's start with `EVT_CODE_PROLOGUE` which
is used to detect hooked functions.

## EVT_CODE_PROLOGUE: Hook Detection

While going through the assembly code closes to the cross-references of <span class="dark-boxed dark-purple">on_rasp_detection</span>,
we can spot several times this pattern:

<div class="legacy-center">
![Technical diagram](svg/graph_ixg_code_prologue.svg)
<br /><br />
</div>

To detect if a given function is hooked, the obfuscator loads the **first byte** of the function and compares this
byte with the value `0xFF`. `0xFF` might seem -- at first glance -- arbitrary but it's not. Actually, regular functions
start with a prologue that allocates space on stack for saving registers defined by the calling convention and stack variables
required by the function. In AArch64, this allocation can be performed in two ways:

```asm
stp REG, REG, [SP, 0xAA]!
; or
sub SP, SP, 0xBB
stp REG, REG, [SP, 0xCC]
```

These instructions are **not equivalent**, but somehow and with the good offsets, they could lead to the
same result. In the second case, the instruction `sub SP, SP, #CST` is encoded with the following bytes:

<div class="legacy-center">
<div class="d-inline-block main-bg font-size-normal mt-3 py-2 px-3">
<span class="svg-icon mr-2 pe-4">
![Technical diagram](/img/stockholm/Code/Code.svg)
</span>
0xff ** 0x00 0xd1
</div>
<br /><br />
</div>

As we can see, the encoding of this instruction starts with `0xFF`. If it is not the case, then
either the function starts with a different stack-allocation prologue or potentially starts with a hooking trampoline.
Since the code of the application is compiled through obfuscator's compiler, the compiler is able to distinguish these two cases
and insert the right check for the correct function's prologue.

If the first byte of the instruction of the function does not pass the check, it jumps to the <span class="red-box">red basic block</span>.
The purpose of this basic block is to trigger a user-defined callback that will process the detection according
to the application's design and the developers' choices:

- Printing an error
- Crashing the application
- Corrupting internal data
- ...

From the previous figure, we can observe that the detection callback is loaded from **a static variable** located
at <span class="dark-boxed dark-purple">#hook_detect_cbk_ptr</span>. When calling this detection callback,
the obfuscator provides the following information to the callback:

1. A detection code: <span class="fcode dark-orange">0x400</span> for <span class="fcode dark-orange">EVT_CODE_PROLOGUE</span>
2. A *corrupted* pointer which could be used to crash the application.

Let's now take a closer look at the design of the detection callback(s) as a whole.

## Detection Callbacks

As explained in the previous section, when the obfuscator detects tampering, it reacts by calling a detection callback
stored in the **static variable** at the address: <span class="dark-boxed dark-blue">0x10109D760</span>

<div class="legacy-center">
![Technical diagram](svg/data_hook_callback.svg)
<br /><br />
</div>

By statically analyzing <span class="dark-boxed dark-yellow">hook_detect_cbk</span>, the implementation seems
to corrupt the pointer provided in the callback's parameters. On the other hand, when running the application we observe a jailbreak detection
message and not a crash of the application.

If we look at the cross-references which read or write at this address, we get this list of instructions:

<div class="legacy-center">
![Technical diagram](svg/data_hook_xref.svg)
<br /><br />
</div>

So actually **only one** instruction -- <span class="dark-boxed dark-gray"><span class="dark-yellow">init_and_check_rasp</span>+01BC</span> --
is **overwriting** the *default* detection callback with another function:
<div class="legacy-center">
![Technical diagram](svg/code-callback-override.svg)
<br /><br />
</div>

Compared to the default callback: <span class="dark-boxed dark-yellow">hook_detect_cbk</span>,
the overridden function, <span class="dark-boxed dark-yellow">hook_detect_cbk_user_def</span>
does not corrupt a pointer that would make the application crash. Instead, it calls the function
<span class="dark-boxed dark-purple">on_rasp_detection</span> which references all the strings `EVT_CODE_TRACING`,
`EVT_CODE_SYSTEM_LIB`, etc, listed in the [figure 2](#fig-2).

> **Note**
`hook_detect_cbk_user_def` is called on a RASP event. That's why this application does not crash.


By looking at the function <span class="dark-boxed dark-yellow">init_and_check_rasp</span> as a whole,
we can notice that the <span class="dark-boxed dark-light-blue">X23</span> register is also used to initialize
other static variables:

<div class="legacy-center">
<figure class="mb-4" id="fig-xref-x23">
![Technical diagram](svg/str_x23.svg)
<figcaption>Fig 3. <code>X23</code> Writes Instructions</figcaption>
</figure>
<br /><br />
</div>

These memory writes mean that the callback <span class="dark-boxed dark-yellow">hook_detect_cbk_user_def</span>
is used to initialize other static variables. In particular, these other static variables are likely used
for the other RASP checks.
By looking at the cross-references of these static variables
<span class="dark-boxed dark-purple">#EVT_CODE_TRACING_cbk_ptr</span>, <span class="dark-boxed dark-purple">#EVT_ENV_JAILBREAK_cbk_ptr</span> etc,
we can locate where the other RASP checks are performed and under which conditions they are triggered.

### EVT_CODE_SYSTEM_LIB

<div class="legacy-center">
<figure class="mb-4" id="fig-ixg-code-system-lib">
![Technical diagram](svg/ixg_code_system_lib.svg)
</figure>
</div>

### EVT_ENV_DEBUGGER

<div class="legacy-center">
<figure class="mb-4" id="fig-ixg-env-debugger">
![Technical diagram](svg/ixg_env_debugger.svg)
</figure>
</div>


### EVT_ENV_JAILBREAK

<div class="legacy-center">
<figure class="mb-4" id="fig-ixg-env-jailbreak">
![Technical diagram](svg/ixg_env_jailbreak.svg)
</figure>
</div>

Thanks to the <span class="dark-boxed dark-purple">#EVT_\*</span> cross-references, we can go **statically** through
all the basic blocks that use these <span class="dark-boxed dark-purple">#EVT_\*</span> variables and
highlight the underlying checks that could trigger the RASP callback(s).
Before detailing the checks, it is worth mentioning the following points:

1. Whilst the application uses a commercial obfuscator which provides native code obfuscation in addition to
   RASP, the code is **lightly obfuscated** which makes static assembly code analysis doable very easily.
2. As it will be discussed in ["*RASP Weaknesses*"](#rasp-design-weaknesses), the application setups the **same callback** for **all**
   the RASP events. Thus, it eases the RASP bypass and the dynamic analysis of the application.

## Anti-Debug

The version of the obfuscator used by SingPass implements two kinds of debug check. First, it checks if
the parent process id (`ppid`) is the same as `/sbin/launchd` which should be **1**.

```cpp
static constexpr pid_t LAUNCHD_PID = 1;
pid_t ppid = getppid();
if (ppid != LAUNCHD_PID) {
  // Trigger EVT_ENV_DEBUGGER
}
```


> **Note**
`getppid` is called either through a function or with a syscall.


If it is not the case, it triggers the `EVT_ENV_DEBUGGER` event. The second check is based on `sysctl` which
is used to access the `extern_proc.p_flag` value. If this flag contains the `P_TRACED` value, the RASP routine
triggers the `EVT_ENV_DEBUGGER` event.

```cpp
int names[] = {
  CTL_KERN,
  KERN_PROC,
  KERN_PROC_PID,
  getpid(),
};
kinfo_proc info;
int sizeof_info = sizeof(kinfo_proc);
int ret = sysctl(names, 4, &info, &sizeof_info, nullptr, nullptr);
if (info.kp_proc.p_flag  & P_TRACED) {
  // Trigger EVT_ENV_DEBUGGER
}
```
In the SingPass binary, we can find an instance of these two checks in the following ranges of addresses:


> **Note**
<samp>ppid:&#160;&#160;&#160;0x10071F420 -- 0x10071F474</samp><br />
<samp>sysctl: 0x100151668 -- 0x100151730</samp>


## Jailbreak Detection

As for most of the jailbreak detections, the obfuscator tries to detect if the device
is jailbroken by checking if some files exist (or not) on the device.

Files or directories are checked with syscalls or a regular functions thanks to the following *helpers*:

> **Note**
<pre>
<samp>pathconf:    0x100008EB0 -- 0x100008F28</samp>
<samp>utimes:      0x10000D8D4 -- 0x10000D948</samp>
<samp>stat:        0x100012188 -- 0x10001221C</samp>
<samp>open:        0x10002D478 -- 0x10002D4D8</samp>
<samp>fopen:       0x1000474E4 -- 0x100047554</samp>
<samp>stat64:      0x10006AA30 -- 0x10006AAD8</samp>
<samp>getfsstat64: 0x10047E82C -- 0x10047E914</samp></pre>


While in the introduction, I mentioned that a dump of the section `__data` reveals strings related to jailbreak
detection, the dump does not reveal **all the strings** used by the obfuscator.

By looking closely at the strings encoding mechanism, it turns out that some strings are decoded *just-in-time*
in a *temporary variable*. I'll explain the strings encoding mechanism in the second part of this series of blog posts
but at this point, we can uncover the strings by setting hooks on functions like `fopen`, `utimes` and dumping the
`__data` section right after these calls.
Then, we can iterate over the different dumps to see if new strings appear.

```text
$ python dump_analysis.py

Processing __data_0.raw
0x01010b935c h/.installed_unc0ver
0x01010b986a w/taurine/pspawn_payload.dylib

Processing __data_392.raw
0x01010b910e y__TEXT
0x01010b91b3 /System/Library/dyld/dyld_shared_cache_arm64e
0x01010b9174 /System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64e
0x01010b9136 /System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64
0x01010b9126 dyld_v1  arm64e
0x01010b9116 dyld_v1   arm64

Processing __data_393.raw
0x01010afb90 /Users/xxxxxxx/Desktop/Xcode/ndi-sp-mobile-ios-swift/SingPass/[...]
0x01010b942c /var/jb
0x01010af910 https://bio-stream.singpass.gov.sg
0x01010af6a0 https://api.myinfo.gov.sg/spm/v3
0x01010b93b0 /.mount_rw
```

In the end, the approach does not enable having all the strings decoded but it enables to have a *good coverage*.
The list of the files used for detecting jailbreak is given the [Annexes](#annexes).

There is also a particular check for detecting the `unc0ver` jailbreak which consists in trying to unmount `/.installed_unc0ver`:

```cpp
0x100E4D814: _unmount("/.installed_unc0ver")
```

## Environment

The obfuscator also checks environment variables that trigger the `EVT_ENV_JAILBREAK` event.
Some of these checks seem to be related to code lifting detection while still triggering the `EVT_ENV_JAILBREAK`
event.


```cpp
if (strncmp(_dyld_get_image_name(0), "/private/var/folders", 0x14)) {
  -> Trigger EVT_ENV_JAILBREAK
}
```

```cpp
if (strncmp(getenv("HOME"), "/Users", 6) == 0) {
  -> Trigger EVT_ENV_JAILBREAK
}
```

```cpp
if (strncmp(getenv("HOME"), "mobile", 6) != 0) {
  -> Trigger EVT_ENV_JAILBREAK
}
```

```cpp
char buffer[0x400];
size_t buff_size = 0x400;
_NSGetExecutablePath(buffer, &buff_size);
if (buffer.startswith("/private/var/folders")) {
  -> Trigger EVT_ENV_JAILBREAK
}
```

> **Note**
From a reverse engineering perspective, startswith() is actually implemented as a
succession of xor that are "or-ed" to get a boolean. This might be the result of an optimization from the compiler.
You can observe this pattern in the basic block located at the address: 0x100015684.


## Advanced Detections

In addition to regular checks, the obfuscator performs advanced checks like verifying
the current status of the SIP (**S**ystem **I**ntegrity **P**rotection), and more precisely,
the KEXTS code signing status.


> **Note**
From my weak experience in iOS jailbreaking, I think that no Jailbreak disables
the `CSR_ALLOW_UNTRUSTED_KEXTS` flag. Instead, I guess that it is used to detect if the application is running
on an Apple M1 which allows such deactivation.



```cpp
csr_config_t buffer = 0;
if (__csrctl(CSR_ALLOW_UNTRUSTED_KEXTS, buffer, sizeof(csr_config_t)) {
  /*
   * SIP is disabled with CSR_ALLOW_UNTRUSTED_KEXTS
   * -> Trigger EVT_ENV_JAILBREAK
   */
}
```

> **Note**
<samp>Assembly range: 0x100004640 -- 0x1000046B8</samp>



The obfuscator also uses the Sandbox API to verify if some paths exist:

```cpp
int ret = __mac_syscall("Sandbox", /* Sandbox Check */ 2,
                        getpid(), "file-test-existence", SANDBOX_FILTER_PATH,
                        "/opt/homebrew/bin/brew");

```

The paths checked through this API are OSX-related directories, so I guess it is also used to verify that the
current code has not been lifted on an Apple Silicon.
Here is, for instance, a list of directories checked with the *Sandbox* API:

```text
/Applications/Xcode.app/Contents/MacOS/Xcode
/System/iOSSupport/
/opt/homebrew/bin/brew
/usr/local/bin/brew
```

> **Note**
<samp>Assembly range: 0x100ED7684 (function)</samp>


In addition, it uses the Sandbox attribute `file-read-metadata` as an alternative to the `stat()`
function.

> **Note**
<samp>Assembly range: 0x1000ECA5C -- 0x1000ECE54</samp>


The application uses the sandbox API through private syscalls to determine whether some jailbreak artifacts exists.
This is very smart but I guess it's not really compliant with the Apple policy.


## Code Symbol Table

The purpose of this check is to verify that the addresses of the resolved imports point to the right library.
In other words, this check verifies that the import table is not tampered with pointers that could be used
to hook imported functions.

> **Note**
<samp>Initialization: part of sub_100E544E8</samp>


> **Note**
<samp>Assembly range: 0x100016FC4 -- 0x100017024</samp>


During the RASP checks initialization (`sub_100E544E8`), the obfuscator **manually** resolves
the imported functions. It iterates over the symbols in the `SingPass` binary and checks which
library imports each symbol. It then accesses that library's in-memory `__LINKEDIT` segment and
parses the exports trie.
This manual resolution fills a table that contains the **absolute address** of the resolved symbols.

In addition, the initialization routine setups -- what I called -- a metadata structure that follows this layout:

<div class="legacy-center">
![Technical diagram](svg/ixg_symbol_table_metadata.svg)
<br /><br />
</div>

<span class="dark-boxed dark-purple">symbols_index</span> is a kind of translation table that converts
an index known by the obfuscator into an index in the `__got` or the `__la_symbol_ptr` section.
The index's origin (i.e `__got` or `__la_symbol_ptr`) is determined by the <span class="dark-boxed dark-purple">origins</span>
table which contains enum-like integers:

```cpp
enum SYM_ORIGINS : uint8_t {
  NONE      = 0,
  LA_SYMBOL = 1,
  GOT       = 2,
};
```

The length of both tables: <span class="dark-boxed dark-purple">symbols_index</span> and <span class="dark-boxed dark-purple">origins</span>,
is defined by the static variable <span class="dark-boxed text-white">nb_symbols</span> which is set to <span class="dark-boxed dark-clear-blue">0x399</span>.
The metadata structure is followed by two pointers: `resolved_la_syms` and `resolved_got_syms` which point to
the imports address table manually filled by the obfuscator.

> **Note**
There is a dedicated table for each section: `__got` and `__la_symbol_ptr`.


Then, <span class="dark-boxed dark-purple">macho_la_syms</span> points to the beginning of the `__la_symbol_ptr`
section while <span class="dark-boxed dark-purple">macho_got_syms</span> points to the `__got` section.

Finally, <span class="dark-boxed dark-purple">stub_helper_start / stub_helper_end</span> holds the memory range
of the `__stub_helper` section. I'll describe the purpose of these values later.

All the values of this metadata structure are set during the initialization which takes place
in the function `sub_100E544E8`.

In different places of the `SingPass` binary, the obfuscator uses this metadata information to verify the
integrity of the resolved import(s). It starts by accessing the <span class="dark-boxed dark-purple">symbols_index</span> and
the <span class="dark-boxed dark-purple">origins</span> with a fixed value:

<div class="legacy-center">
![Technical diagram](svg/ixg_symbol_table_index_1.svg)
<br /><br />
</div>

> **Note**
Since the `symbols_index` table contains `uint32_t` values, `#0xCA8` matches
`#0x32A` (index for the origins table) when divided by `sizeof(uint32_t)`: `0xCA8 = 0x32A * sizeof(uint32_t)`



In other words, we have the following operations:

```cpp
const uint32_t sym_idx   = metadata.symbols_index[0x32a];
const SYM_ORIGINS origin = metadata.origins[0x32a]
```

Then, given the `sym_idx` value and depending on the origin of the symbol, the function accesses either
the resolved `__got` table or the resolved `__la_symbol_ptr` table. This access is done with a helper function
located at `sub_100ED6CC0`. It can be summed up with the following pseudo-code:

```cpp
uintptr_t* section_ptr       = nullptr;
uintptr_t* manually_resolved = nullptr;

if      (origin == /* 1 */ SYM_ORIGINS::LA_SYMBOL) {
  section_ptr       = metadata.macho_la_syms;
  manually_resolved = metadata.resolved_la_syms;
}
else if (origin == /* 2 */ SYM_ORIGINS::GOT) {
  section_ptr       = metadata.macho_got_syms;
  manually_resolved = metadata.resolved_got_syms;
}
```

The entries at the index `sym_idx` of `section_ptr` and `manually_resolved` are compared and if they
don't match, the event <span class="dark-boxed dark-purple">#EVT_CODE_SYMBOL_TABLE</span> is triggered.

Actually, the comparison covers different cases. First, the obfuscator handles the case where the symbol
at `sym_idx` is not yet resolved. In that case, `section_ptr[sym_idx]` points to the symbols resolution stub
located in the section `__stub_helper`. That's why the `metadata` structure contains the memory range of this section:

```cpp
const uintptr_t addr_from_section = section_ptr[sym_idx];
if (metadata.stub_helper_start <= addr && addr < metadata.stub_helper_end) {
  // Skip
}
```
In addition, if the pointers do not match, the function verifies their location using `dladdr`:

```cpp
const uintptr_t addr_from_section    = section_ptr[sym_idx];
const uintptr_t addr_from_resolution = manually_resolved[sym_idx];

if (addr_from_section != addr_from_resolution) {
  Dl_info info_section;
  Dl_info info_resolution;

  dl_info(addr_from_section,    &info_section);
  dl_info(addr_from_resolution, &info_resolution);
  if (info_section.dli_fbase != info_resolution.dli_fbase) {
    // --> Trigger EVT_CODE_SYMBOL_TABLE;
  }
}
```

> **Note**
Two pointers might not match if, for instance, an imported function is hooked with Frida.


In the case where the `origin[sym_idx]` is set to `SYM_ORIGINS::NONE` the function skips the check. Thus,
we can simply disable this RASP check by filling the original table with 0. The number of symbols is close
to the metadata structure and the address of the metadata structure is leaked by the `___atomic_load` and
`___atomic_store` functions.

<div class="legacy-center">
![Technical diagram](svg/ixg_code_symbol_table.svg)
</div>


## Code Tracing

The *Code Tracing* check aims to verify that the current is not *traced*.
By looking at the cross-references of <span class="dark-boxed dark-purple">#EVT_CODE_TRACING_cbk_ptr</span>,
we can identify two kinds of verification.

### GumExecCtx

<span class="dark-boxed dark-purple">EVT_CODE_TRACING</span> seems able to **detect** if the
**Frida's Stalker** is running. It's the first time I can observe this kind of check and it's very smart.
For those who would like to follow this analysis with the raw assembly code, I will use this range of addresses
from the [SingPass](bin/SingPass) binary:


> **Note**
<samp>0x10019B6FC -- 0x10019B82C</samp>


Here is the graph of the function that performs the Frida Stalker check:

<div class="legacy-center">
<figure class="mb-4" id="fig-ixg-frida-stalker-detection">
![Technical diagram](svg/frida-stalker.svg)
<figcaption>Code associated with Frida Stalker Detection</figcaption>
</figure>
</div>

Yes, this code is able to detect the Stalker. How? Let's start with the first basic block.
<span class="dark-boxed dark-yellow">_pthread_mach_thread_np(<span class="text-white">_pthread_self()</span>)</span>
aims at getting the thread id of the function that invokes this check.

Then more subtly, <span class="dark-boxed text-white"><span class="dark-yellow">MRS</span>(<span class="dark-red">TPIDRRO_EL0</span>) <span class="dark-purple">&</span> <span class="dark-clear-blue">#-8</span></span>
is used to **manually** access the thread local storage area. On ARM64, Apple uses the least significant byte
of `TPIDRRO_EL0` to store the number of CPU while the MSB contains the TLS base address.

> **Note**
See also: [dyld -- threadLocalHelpers.s](https://github.com/apple-oss-distributions/dyld/blob/5c9192436bb195e7a8fe61f22a229ee3d30d8222/libdyld/threadLocalHelpers.s#L237-L238)


Then, the second basic block -- which is the loop's entry -- accesses the thread local variable with the
*key* `tlv_idx` which ranges from `0x100` to `0x200` in the loop:

<div class="legacy-center" style="font-size:19px">
<span class="dark-boxed text-white"><span class="dark-purple">*</span>(tlv_table <span class="dark-purple">+</span> (tlv_idx <span class="dark-purple"><<</span> <span class="dark-clear-blue">3</span>))</span>
<br /><br />
</div>

The following basic block which calls <span class="dark-boxed dark-yellow">_vm_region_64<span class="text-white">(...)</span></span>
is used to verify that the `tlv_addr` variable contains a valid
address with a *correct* size (i.e. larger than `0x30`). Under these conditions, it jumps into the following
basic block with these *strange* memory accesses:

<div class="legacy-center">
<figure class="mb-4" id="fig-ixg-frida-stalker-condition">
![Technical diagram](svg/frida-stalker-cond.svg)
<figcaption>Condition that (somehow) Triggers EVT_CODE_TRACING</figcaption>
</figure>
</div>

To figure out the meaning of these memory accesses, let's remind that this function is associated with the `EVT_CODE_TRACING`
event. Which well-known public tool could be associated with code tracing? Without too much risk, we can
assume the Frida's Stalker.

If we look at the implementation of the Stalker, we can notice this kind of initialization (in `gumstalker-arm64.c`):

```cpp
void gum_stalker_init (GumStalker* self) {
  [...]
  self->exec_ctx = gum_tls_key_new();
  [...]
}

void* _gum_stalker_do_follow_me(GumStalker* self, ...) {
  GumExecCtx* ctx = gum_stalker_create_exec_ctx(...);
  gum_tls_key_set_value (self->exec_ctx, ctx);
}
```

So the Stalker creates a thread local variable that is used to store a pointer to the `GumExecCtx` structure
which has the following layout:

```cpp
struct _GumExecCtx {
  volatile gint state;
  gint64 destroy_pending_since;

  GumStalker * stalker;
  GumThreadId thread_id;

  GumArm64Writer code_writer;
  GumArm64Relocator relocator;
  [...]
}
```

If we add the offsets of this layout and if we *virtually* inline the `GumArm64Writer` structure, we can get this
representation:

```cpp
struct _GumExecCtx {
  /* 0x00 */ volatile gint state;
  /* 0x08 */ gint64 destroy_pending_since;

  /* 0x10 */ GumStalker * stalker;
  /* 0x18 */ GumThreadId thread_id;

  GumArm64Writer code_writer {
  /* 0x20 */ volatile gint ref_count;
  /* 0x24 */ GumOS target_os;
  /* 0x28 */ GumPtrauthSupport ptrauth_support;
  ...
  };
}
```

> **Note**
`destroy_pending_since` is located at the offset **`0x08`** and not **`0x04`** because of the alignment enforced
by the compiler.


With this representation, we can observe that:

- <span class="dark-boxed text-white"><span class="dark-purple">*</span>(tlv_table <span class="dark-purple">+</span> <span class="dark-clear-blue">0x18</span>)</span>
effectively matches the `GumThreadId thread_id` attribute.

- <span class="dark-boxed text-white"><span class="dark-purple">*</span>(tlv_table <span class="dark-purple">+</span> <span class="dark-clear-blue">0x24</span>)</span>
    matches `GumOS target_os`

- <span class="dark-boxed text-white"><span class="dark-purple">*</span>(tlv_table <span class="dark-purple">+</span> <span class="dark-clear-blue">0x28</span>)</span>
    matches `GumPtrauthSupport ptrauth_support`

`GumOS` and `GumPtrauthSupport` are enums defined in `gumdefs.h` and `gummemory.h` with these values:

```cpp
enum _GumOS {
  GUM_OS_WINDOWS,
  GUM_OS_MACOS,
  GUM_OS_LINUX,
  GUM_OS_IOS,
  GUM_OS_ANDROID,
  GUM_OS_QNX
};


enum _GumPtrauthSupport {
  GUM_PTRAUTH_INVALID,
  GUM_PTRAUTH_UNSUPPORTED,
  GUM_PTRAUTH_SUPPORTED
};
```
`GumOS` contains 6 entries starting from `GUM_OS_WINDOWS = 0` up to `GUM_OS_QNX = 5` and similarly,
`GUM_PTRAUTH_INVALID = 0` while the last entry is associated with `GUM_PTRAUTH_SUPPORTED = 2`

Therefore, the previous *strange* conditions are used to fingerprint the `GumExecCtx` structure:

<div class="legacy-center">
![Technical diagram](svg/tlv_resolved.svg)
<br /><br />
</div>

One way to prevent this Stalker detection would be to recompile Frida with swapped fields in the `_GumExecCtx`
structure.

### Thread Check

An alternative to the previous Frida stalker check consists in accessing the current thread status
through the following call:

```cpp
thread_read_t target = pthread_mach_thread_np(pthread_self());
uint32_t count = ARM_UNIFIED_THREAD_STATE_COUNT;
arm_unified_thread_state state;
thread_get_state(target, ARM_UNIFIED_THREAD_STATE, &state, &count);
```

Then, it checks if `state->ts_64.__pc` is within the `libsystem_kernel.dylib` thanks to the following
comparison:

```cpp
const auto mach_msg_addr = reinterpret_cast<uintptr_t>(&mach_msg);
const uintptr_t delta = abs(state->ts_64.__pc - mach_msg_addr)
if (delta > 0x4000) {
  rasp_event_info info;
  info.event = 0x2000; // EVT_CODE_TRACING;
  info.ptr = (uintptr_t*)0x13b71a24724edfe;
  EVT_CODE_TRACING_cbk_ptr(info);
}
```

In other words, `state->ts_64.__pc` is considered to be in `libsystem_kernel.dylib`, if its distance from
`&mach_msg` is smaller than `0x4000`.

At first sight, I was a bit confused by this RASP check but since the previous checks, associated with
<span class="dark-boxed dark-purple">EVT_CODE_TRACING</span>, aims at detecting the Frida Stalker, this
check is also likely designed to detect the Frida Stalker.

To confirm this hypothesis, I developed a small test case that reproduces this check, in a standalone
binary and we can observe a difference depending on whether
it runs through the Frida stalker or not:


<div class="legacy-center">
<figure class="mb-4">
![Technical diagram](svg/with_stalker.svg)
<figcaption>Output of the Test Case <b>with</b> the Stalker</figcaption>
</figure>
</div>

<div class="legacy-center">
<figure class="mb-4">
![Technical diagram](svg/without_stalker.svg)
<figcaption>Output of the Test Case <b>without</b> the Stalker</figcaption>
</figure>
</div>

This check can be bypassed without too much difficulty by using the function [`gum_stalker_exclude`](https://github.com/oleavr/frida-gum/blob/b679d454b1f323fa9c181f324ec17d515a7c2f81/gum/gumstalker.h#L62-L63)
to exclude the library `libsystem_kernel.dylib` from the stalker:

```cpp
GumStalker* stalker = gum_stalker_new();
exclude(stalker, "libsystem_kernel.dylib");
{
  // Stalker Check
}
```

As a result of this exclusion, `state->ts_64.__pc` is located in `libsystem_kernel.dylib`:

<div class="legacy-center">
<figure class="mb-4">
![Technical diagram](svg/stalker_bypass.svg)
<figcaption>Output of the Test Case with Excluded Memory Ranges</figcaption>
</figure>
</div>

## App Loaded Libraries

The RASP event <span class="dark-boxed dark-purple">EVT_APP_LOADED_LIBRARIES</span> aims at checking the integrity of the Mach-O's dependencies.
In other words, it checks that the Mach-O imported libraries have not been altered.

> **Note**
<samp>Assembly ranges: 0x100E4CDF8 -- 0x100e4d39c</samp>


The code associated with this check starts by accessing the Mach-O header thanks to the `dladdr` function:

```cpp
Dl_info dl_info;
dladdr(&static_var, &dl_info);
```

`Dl_info` contains the base address of the library which encompasses the address provided in the first parameter
and since, a Mach-O binary is loaded with its header, `dl_info.dli_fbase` actually points to a `mach_header_64`.

Then the function iterates over the `LC_ID_DYLIB`-like commands to access dependency's name:

<div class="legacy-center">
![Technical diagram](svg/app_loaded_library.svg)
<br /><br />
</div>

This name contains the path to the dependency. For instance, we can access this list as follows:

```python
import lief

singpass = lief.parse("./SingPass")

for lib in singpass.libraries:
  print(lib.name)

# Output:
/System/Library/Frameworks/AVFoundation.framework/AVFoundation
/System/Library/Frameworks/AVKit.framework/AVKit
...
@rpath/leveldb.framework/leveldb
@rpath/nanopb.framework/nanopb
```

The dependency's names are used to fill a hash table in which a hash value in encoded on 32 bits:

```cpp
// Pseudo code
uint32_t TABLE[0x6d]
for (size_t i = 0; i < 0x6d; ++i) {
  TABLE[i] = hash(lib_names[i]);
}
```

Later in the code, this computed table is compared with another hash table -- **hard-coded in the code** --
which looks like this:

<div class="legacy-center">
<figure class="mb-4" id="fig-4">
![Technical diagram](svg/hash_lib_loaded.svg)
<figcaption>Fig 4. Examples of Hashes</figcaption>
</figure>
</div>

If some libraries have been modified to inject, for instance, `FridaGadget.dylib` then the hash **dynamically**
computed will not match the hash hard-coded in the code.

Whilst the implementation of this check is pretty *"standard"*, there are a few points worth mentioning:

- Firstly, the hash function seems be a derivation of the [MurmurHash](https://en.wikipedia.org/wiki/MurmurHash).

- Secondly, the hash is encoded on **32 bits** but the code in the [Figure 4](#fig-4) references the X11/X12 registers
which are 64 bits. This is actually a compiler optimization to limit the number of memory accesses.

- Thirdly, the hard coded hash values are duplicated in the binary for each instance of the check.
  In SingPass, this RASP check is present twice thus, we find these values at the following locations:
  `0x100E4CF38`, `0x100E55678`.
  This duplication is likely used to prevent a single spot location that would be easy to patch.

## Code System Lib

This check is associated with the event <span class="dark-boxed dark-purple">EVT_CODE_SYSTEM_LIB</span>
which consists in verifying the integrity of
the **in-memory** system libraries with their content in the dyld shared cache (**on-disk**).

> **Note**
<samp>Assembly ranges: 0x100ED5BF8 -- 0x100ED5D6C and 0x100ED5E0C -- 0x100ED62D4</samp>


This check usually starts with the following pattern:


<div class="legacy-center">
![Technical diagram](svg/ixg_code_system_lib_prologue.svg)
<br /><br />
</div>


If the result of `iterate_system_region` with the given `check_region_cbk` callback is not 0,
it triggers the <span class="dark-boxed dark-purple">EVT_CODE_SYSTEM_LIB</span> event:

```cpp
if (iterate_system_region(check_region_cbk) != 0) {
// Trigger `EVT_CODE_SYSTEM_LIB`
}
```

To understand the logic behind this check, we need to understand the purpose of the `iterate_system_region`
function and its relationship with the callback `check_region_cbk`.

### iterate_system_region

> **Note**
As for all the functions referenced in the blog post, their names come from my own analysis and might be inaccurate.
Most of the functions related to the RASP checks were obviously stripped.
In this case, `iterate_system_region` matches the original *`sub_100ED5BF8`*


This function aims to call the system function `vm_region_recurse_64` and then, filter its output on
conditions that could trigger the callback given in the first parameter: <span class="dark-boxed dark-yellow">check_region_cbk</span>.

<span class="dark-boxed dark-yellow">iterate_system_region</span> starts by accessing the base address of
the dyld shared cache thanks to the <span class="dark-boxed dark-red">SYS_shared_region_check_np</span> syscall.
This address is used to read and **memoize** a few attributes from the `dyld_cache_header` structure:

1. The shared cache header
2. The shared cache end address
3. Other limits related to the shared cache

The following snippet gives an overview of these computations:

```cpp
static dyld_shared_cache* header = nullptr; /* At: 0x1010DE940 */
static uintptr_t g_shared_cache_end;        /* At: 0x1010DE948 */
static uintptr_t g_overflow_address;        /* At: 0x1010DE950 */
static uintptr_t g_module_last_addr;        /* At: 0x1010DE958 */

if (header == nullptr) {
// return;
}

uintptr_t shared_cache_base;
syscall(SYS_shared_region_check_np, &shared_cache_base);
header = shared_cache_base;

g_shared_cache_end = shared_cache_addr + header->mappings[0].size;
g_overflow_address = -1;
g_module_last_addr = g_shared_cache_end;
if (header->imagesTextCount > 0) {
  uintptr_t slide = shared_cache_addr - header->mappings[0].address;
  uintptr_t tmp_overflow_address = -1;
  uintptr_t shared_cache_end_tmp = shared_cache_end;

  for (size_t i = 0; i < header->imagesTextCount; ++i) {
    const uintptr_t txt_start_addr = slide      + header->imagesText[i].loadAddress;
    const uintptr_t txt_end_addr   = start_addr + header->imagesText[i].textSegmentSize;

    if (txt_start_addr >= shared_cache_end_tmp && txt_start_addr < tmp_overflow_address) {
      g_overflow_address   = start_addr;
      tmp_overflow_address = start_addr;
    }

    if (txt_end_addr >= shared_cache_end_tmp) {
      g_module_last_addr   = txt_end_addr;
      shared_cache_end_tmp = txt_end_addr;
    }
  }
}
```

> **Note**
From a reverse engineering point of view, the stack variable used to memoize these information
is aliased with the parameter `info` of `vm_region_recurse_64` that is called later. I don't know if this aliasing
is on purpose, but it makes the reverse engineering of the structures a bit more complicated.


Following this memoization, there is a loop on `vm_region_recurse_64` which queries the `vm_region_submap_info_64`
information for these addresses in the range of the dyld shared cache.
We can identify the type of the query (`vm_region_submap_info_64`) thanks to the
`mach_msg_type_number_t *infoCnt` argument which is set to `19`:

<div class="legacy-center">
![Technical diagram](svg/ixg_code_system_lib_call2vmregion.svg)
<br /><br />
</div>

This loop breaks under certain conditions and the callback is triggered with other conditions.
As it is explained a bit later, the callback verifies the in-memory integrity of the library present
in the dyld shared cache.

The verification and the logic behind this check is prone to take time, that's why the authors of the check
took care of filtering the addresses to check to avoid useless (heavy) computations.

Basically, the callback that performs the in-depth inspection of the shared cache is triggered if:

<div class="legacy-center">
![Technical diagram](svg/ixg_code_system_lib_callback_cond.svg)
</div>

#### check_region_cbk

When the conditions are met, <span class="dark-boxed dark-yellow">iterate_system_region</span> calls the
<span class="dark-boxed dark-yellow">check_region_cbk</span> with the suspicious address in the first parameter:

```cpp
int iterate_system_region(callback_t cbk) {
  int ret = 0;
  if (cond(address)) {
    ret = cbk(address) {
      // Checks on the dyld_shared_cache
    }
  }
  return ret;
}
```

During the analysis of SingPass, only **one** callback is used in pair with
<span class="dark-boxed dark-yellow">iterate_system_region</span>, and its code
is not **especially obfuscated** (except the strings). Once we know that the checks are related to the dyld shared cache,
we can quite easily figure out the structures involved in this function.
This callback is located at the address `0x100ed5e0c` and renamed
<span class="dark-boxed dark-yellow">check_region_cbk</span>.

Firstly, it starts by accessing the information about the address:

```cpp
int check_region_cbk(uintptr_t address) {
  Dl_info info;
  dladdr(address, info);
  // ...
}
```

This information is used to read the content of the `__TEXT` segment associated with the `address` parameter:

```cpp
auto* header = reinterpret_cast<mach_header_64*>(info.dli_fbase);

segment_command_64 __TEXT = get_text_segment(header);

vm_offset_t data = 0;
mach_msg_type_number_t* dataCnt = 0;

vm_read(task_self_trap(), info.dli_fbase, __TEXT.vmsize, &data, &dataCnt);
```

> **Note**
The `__TEXT` strings is encoded as well as the different paths of the shared cache like `/System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64e`
and the header's magic values: `0x01010b9126: dyld_v1  arm64e` or `0x01010b9116: dyld_v1   arm64`




On the other hand, the function opens the `dyld_shared_cache` and looks for the section of the shared cache
that contains the library associated with the `address` parameter:

```cpp
int fd = open('/System/Library/Caches/com.apple.dyld/dyld_shared_cache_arm64');
(1) mmap(nullptr, 0x100000, VM_PROT_READ, MAP_NOCACHE | MAP_PRIVATE, fd, 0x0): 0x109680000

// Look for the shared cache entry associated with the provided address
(2) mmap(nullptr, 0xad000, VM_PROT_READ, MAP_NOCACHE | MAP_PRIVATE, fd, 0x150a9000): 0x109681000
```
The purpose of the second call to `mmap()` is to load the slice of the shared cache that contains the code of the library.
Then, the function checks **byte per byte** that the `__TEXT` segment's content matches the in-memory content.
The loop which performs this comparison is located between these addresses: `0x100ED6C58 - 0x100ED6C70`.

----

As we can observe from the description of this RASP check, the authors paid a lot of attention to
avoid performance issues and memory overhead. On the other hand, the callback <span class="dark-boxed dark-yellow">check_region_cbk</span>
was never called during my experimentations (even when I hooked system function).
I don't know if it's because I misunderstood the conditions but in the end,
I had to manually force the conditions (by forcing the `pages_swapped_out` to 1).

> **Note**
`vm_region_recurse_64` seems also always paired with an anti-hooking verification that is slightly different from
the check described at the beginning of this blog post. Its analysis is quite easy and can be a good exercise.



## RASP Design Weaknesses

Thanks to the different <span class="dark-boxed dark-purple">#EVT_\*</span> static variables that hold
function pointers, the obfuscator enables to have dedicated callbacks for the supported RASP events.
Nevertheless, the function <span class="dark-boxed dark-yellow">init_and_check_rasp</span> defined by the application's developers
initialize **all** these pointers **to the same** callback: <span class="dark-boxed dark-yellow">hook_detect_cbk_user_def</span>.
In such a design, all the RASP events end up in a single function which weakens the strength of the different RASP checks.

It means that we only have to target this function to disable or bypass the RASP checks.

Using Frida Gum, the bypass is as simple as using `gum_interceptor_replace` with an empty function:

```cpp
enum class RASP_EVENTS : uint32_t {
  EVT_ENV_JAILBREAK        = 0x1,
  EVT_ENV_DEBUGGER         = 0x2,
  EVT_APP_SIGNATURE        = 0x20,
  EVT_APP_LOADED_LIBRARIES = 0x40,
  EVT_CODE_PROLOGUE        = 0x400,
  EVT_CODE_SYMBOL_TABLE    = 0x800,
  EVT_CODE_SYSTEM_LIB      = 0x1000,
  EVT_CODE_TRACING         = 0x2000,
};

struct event_info_t {
  RASP_EVENTS event;
  uintptr_t** ptr_to_corrupt;
};

void do_nothing(event_info_t info) {
  RASP_EVENTS evt = info.event;
  // ...
  return;
}

// This is **pseudo code**
gum_interceptor_replace(
  listener->interceptor,
  reinterpret_cast<void*>(&hook_detect_cbk_user_def)
  do_nothing,
  reinterpret_cast<void*>(&hook_detect_cbk_user_def)
);
```

Thanks to this weakness, I could prevent the error message from being displayed as soon as the application starts.

<div class="legacy-center">
<figure class="mb-4">
<video class="mb-4" controls preload="metadata" aria-label="SingPass jailbreak and RASP bypass demonstration">
<source src="poc.webm" type="video/webm">Your browser cannot play this demonstration.</video>
<figcaption class="mb-4">SingPass Jailbreak & RASP Bypass</figcaption>
</figure>
</div>


> **Note**
It exists two other RASP checks: `EVT_APP_MACHO` and `EVT_APP_SIGNATURE` which were not enabled
by the developers and thus, are not present in SingPass.


## Conclusion

This first part is a good example of the challenges when using or designing an obfuscator with RASP features.
On one hand, the commercial solution implements strong and advanced RASP functionalities with, for instance, inlined syscalls
spread in different places of the application. On the other hand, the app's developers weakened the RASP functionalities
by setting the **same callback** for all the events. In addition, it seems that the application **does not
use the native code obfuscation** provided by the commercial solution which makes the RASP checks un-protected against static
code analysis. It could be worth enforcing code obfuscation on these checks regardless the configuration provided
by the user.

From a developer's perspective, understanding the reverse-engineering impact of sharing one callback
can be difficult, even when it is a sound architectural decision.

In the second part of this series about iOS code obfuscation, we examine native code obfuscation
in another application. This application reacts differently to RASP events, and its code uses
MBA, control-flow flattening, and other obfuscation techniques.

If you have questions feel free to ping me :mailbox:.

### Annexes

| JB Detection Files                              | Listed in PokemonGO |
|-------------------------------------------------|---------------------|
| `/.bootstrapped`                                | No                  |
| `/.installed_taurine`                           | No                  |
| `/.mount_rw`                                    | No                  |
| `/Library/dpkg/lock`                            | No                  |
| `/binpack`                                      | **Yes**             |
| `/odyssey/cstmp`                                | No                  |
| `/odyssey/jailbreakd`                           | No                  |
| `/payload`                                      | No                  |
| `/payload.dylib`                                | No                  |
| `/private/var/mobile/Library/Caches/kjc.loader` | No                  |
| `/private/var/mobile/Library/Sileo`             | No                  |
| `/taurine`                                      | No                  |
| `/taurine/amfidebilitate`                       | No                  |
| `/taurine/cstmp`                                | No                  |
| `/taurine/jailbreakd`                           | No                  |
| `/taurine/jbexec`                               | No                  |
| `/taurine/launchjailbreak`                      | No                  |
| `/taurine/pspawn_payload.dylib`                 | No                  |
| `/var/dropbear`                                 | No                  |
| `/var/jb`                                       | No                  |
| `/var/lib/undecimus/apt`                        | No                  |
| `/var/motd`                                     | No                  |
| `/var/tmp/cydia.log`                            | No                  |


| Flagged Packages                                                        |
|-------------------------------------------------------------------------|
| `/Applications/AutoTouch.app/AutoTouch`                                 |
| `/Applications/iGameGod.app/iGameGod`                                   |
| `/Applications/zxtouch.app/zxtouch`                                     |
| `/Library/Activator/Listeners/me.autotouch.AutoTouch.ios8`              |
| `/Library/LaunchDaemons/com.rpetrich.rocketbootstrapd.plist`            |
| `/Library/LaunchDaemons/com.tigisoftware.filza.helper.plist`            |
| `/Library/MobileSubstrate/DynamicLibraries/ATTweak.dylib`               |
| `/Library/MobileSubstrate/DynamicLibraries/GameGod.dylib`               |
| `/Library/MobileSubstrate/DynamicLibraries/LocalIAPStore.dylib`         |
| `/Library/MobileSubstrate/DynamicLibraries/Satella.dylib`               |
| `/Library/MobileSubstrate/DynamicLibraries/iOSGodsiAPCracker.dylib`     |
| `/Library/MobileSubstrate/DynamicLibraries/pccontrol.dylib`             |
| `/Library/PreferenceBundles/SatellaPrefs.bundle/SatellaPrefs`           |
| `/Library/PreferenceBundles/iOSGodsiAPCracker.bundle/iOSGodsiAPCracker` |
