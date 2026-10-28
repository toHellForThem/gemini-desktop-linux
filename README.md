# Gemini Desktop — Linux working fork (unofficial MVP)

> **Unofficial, amateur fork. Not affiliated with Google or the original author.**
>
> This is a personal "works on my machine" build of
> [bwendell/gemini-desktop](https://github.com/bwendell/gemini-desktop)
> patched to run on Linux. Expect rough edges, no support, and no guarantees.
> I am not maintaining this as a polished project.

Fork maintained by [toHellForThem](https://github.com/toHellForThem).

## What this is

A patched build of the upstream Gemini Desktop Electron app. I only fixed the
things that were broken for me on Linux. The code is messy and this is an MVP,
not a proper fork with a clean history.

## Upstream

- Original project: <https://github.com/bwendell/gemini-desktop>
- All credit for the original app goes to Ben Wendell and contributors.

## Changes in this fork

- **Sidecar process for `node-llama-cpp`** — the native addon runs in a
  separate Node process (`ELECTRON_RUN_AS_NODE=1`) instead of the Electron main
  process, avoiding the fatal `v8_ArrayBuffer_NewBackingStore` crash on Linux
  kernel 7+.
- **Google sign-in via top-level main-window navigation** — Google rejects
  sign-in inside an embedded iframe, so the flow is intercepted and performed
  as a top-level navigation, with Edge-like User-Agent and `Sec-CH-UA*` client
  hints.
- **Fixed black-window regression** caused by over-eager auth subframe
  interception (cookie-rotation and app-launcher URLs are now filtered out).
- **Removed the obsolete "restart required" text-prediction check** (no longer
  needed with the sidecar).
- **`scripts/restore-llama-binaries.sh`** — installs the real
  `@node-llama-cpp/linux-x64` prebuilt package when the bundled copy only
  contains `.moved.txt` placeholders.
- **Auto-updates disabled (temporary)** — the bundled `app-update.yml` points
  at the upstream repository, so electron-updater is turned off to avoid
  overwriting this fork. Will be re-enabled once a dedicated update channel
  exists.

## Requirements

- Linux x86_64.
- For local text prediction: a CPU with **AVX2/BMI** (see limitations).

## How to run

1. Download the AppImage from the Releases page.
2. `chmod +x Gemini-Desktop-*.AppImage`
3. Run it.

If text prediction fails to load the native addon, run:

```bash
./scripts/restore-llama-binaries.sh
```

## Known limitations

- **Text prediction needs AVX2/BMI.** On older CPUs (e.g. Intel Sandy Bridge /
  Xeon E5-26xx v1) the prebuilt `libggml` crashes with `SIGILL`. This is a
  hardware limitation, not a bug in the app.
- **Linux only.** macOS and Windows are untested.
- **Google may change their sign-in flow at any time** and break the spoofing.
- The app is an unofficial wrapper around Google Gemini.

## Legal / disclaimer

- Not affiliated with Google. "Gemini" is a trademark of Google LLC.
- This app wraps Google Gemini; using it may violate Google's Terms of Service.
  Use at your own risk.
- Provided "AS IS", without warranty of any kind.

## License

Distributed under the MIT License (see [`LICENSE`](LICENSE)).
Original work © 2025 Ben Wendell. Modifications © 2026 toHellForThem.
