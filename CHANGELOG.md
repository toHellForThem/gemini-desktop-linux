# Changelog

All notable changes to this fork are documented here.
This fork tracks upstream `gemini-desktop` 0.12.1.

## [0.12.1-linux1] - 2026-10-28

### Added
- Sidecar process for `node-llama-cpp` (`llamaWorker.cjs` +
  `llamaSidecarClient.cjs`) so the native addon no longer runs in the Electron
  main process. Avoids the fatal `v8_ArrayBuffer_NewBackingStore` crash on
  Linux kernel 7+.
- `scripts/restore-llama-binaries.sh` to install the real
  `@node-llama-cpp/linux-x64` prebuilt package.
- Shared `authSpoofing.cjs` helper for Edge-like User-Agent and `Sec-CH-UA*`
  client hints.
- Dedicated `authPreload.cjs` for the sign-in window.

### Changed
- Google sign-in is performed as a top-level main-window navigation instead of
  inside an embedded iframe (Google rejects iframe sign-in).
- `sandboxDetector.cjs` split into `isV8SandboxIncompatibleKernel` (sidecar,
  always false) and `isV8SandboxIncompatibleKernelForMainProcess` (dbus-next).
- `authPreload.cjs` and `authSpoofing.cjs` are now platform-aware
  (macOS/Windows/Linux) instead of hardcoding Linux values.

### Fixed
- Black/collapsed main window caused by over-eager auth subframe interception
  (cookie-rotation and app-launcher URLs are now filtered out).
- GPU→CPU fallback in `llmManager` (status guard no longer blocks the retry).
- Removed the obsolete "restart required" text-prediction check.

### Disabled (temporary)
- Auto-updates are disabled in this fork until a dedicated update channel
  exists. The bundled `app-update.yml` points at the upstream repository and
  would otherwise overwrite this build.

### Known limitations
- Text prediction requires a CPU with AVX2/BMI. On older CPUs (e.g. Intel
  Sandy Bridge / Xeon E5-26xx v1) the prebuilt `libggml` crashes with `SIGILL`.
- Linux only; macOS/Windows untested.
