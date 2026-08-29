---
title: "QBDL"
description: "QuarkslaB Dynamic Loader: Generic loader for ELF, PE, and Mach-O"
canonical_url: "https://www.romainthomas.fr/project/qbdl/"
authors: ["Adrien Guinet","Romain Thomas"]
date_published: "2021-06-03T00:00:00Z"
date_modified: "2026-08-04T19:53:38+02:00"
language: "en-US"
section: "project"
tags: ["lief","loader"]
categories: []
---

# QBDL

> QuarkslaB Dynamic Loader: Generic loader for ELF, PE, and Mach-O

QBDL (**Q**uarksla**B** **D**ynamic **L**oader) is a cross-platform library that enables
to load ELF, PE, and Mach-O binaries with an abstraction on the targeted system.
It abstracts the memory model on which the binary is loaded
and provides an enhanced API to the user to process symbols resolution.
In a nutshell, it enables to load binaries on foreign systems without reinventing the wheel.

Here is an [example](https://github.com/quarkslab/QBDL/blob/83a64211dae71e870495bc795dd065278f93993f/bindings/python/examples/triton_macho_x64.py) to load a Mach-O in [Triton](https://github.com/JonathanSalwan/Triton) with QBDL:

```python
class TritonVM(pyqbdl.TargetMemory):
    def __init__(self, ctx: TritonContext):
        super().__init__()
        self.ctx = ctx

    def mmap(self, ptr, size):
        return ptr

    def mprotect(self, ptr, size, access):
        return True

    def write(self, ptr, data):
        self.ctx.setConcreteMemoryAreaValue(ptr, bytes(data))

    def read(self, ptr, size):
        return self.ctx.getConcreteMemoryAreaValue(ptr, size)

class TritonSystem(pyqbdl.TargetSystem):
    def __init__(self, arch, ctx):
        super().__init__(TritonVM(ctx))
        self.arch = arch
        self.ctx = ctx

    def symlink(self, loader, sym):
        for name, impl, addr in externalFunctions:
            if sym.name == name:
                return addr
        return 0

    def supports(self, bin_):
        return pyqbdl.Arch.from_bin(bin_) == self.arch

    def base_address_hint(self, bin_ba, vsize):
        return bin_ba

x86_64_arch = pyqbdl.Arch(lief.ARCHITECTURES.X86, lief.ENDIANNESS.LITTLE, True)
loader = pyqbdl.loaders.MachO.from_file(args.filename, x86_64_arch,
                                        TritonSystem(x86_64_arch, ctx), pyqbdl.Loader.BIND.NOW)
```
