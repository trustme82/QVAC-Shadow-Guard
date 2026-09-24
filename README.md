# QVAC Shadow Guard

Detect and block suspicious command-line instructions, destructive system scripts, and unverified file signatures — entirely on your own machine using [Tether's QVAC SDK](https://github.com/tetherto/qvac), no cloud call, no API key, no bill.

Two features, two different implementations, honestly labeled:

- **Log & Script Analyzer (the AI feature):** calls the QVAC SDK's `loadModel()` + `completion()` directly, running a local LLM (`LLAMA_3_2_1B_INST_Q4_0`) to scan system logs or command lines for malicious patterns (`sudo rm -rf /etc/systemd` → "CRITICAL ANOMALY DETECTED").
- **File & Hash Verification (a local utility, no AI):** deterministic cryptographic hash verification logic in `src/hashCheck.js` — no model call, and the GUI says so explicitly, rather than dressing up plain code as "AI" to pad out the feature list.

## What it does

```bash
node src/check.js "sudo rm -rf /etc/systemd"
node src/check.js --hash "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```
## Verified output

Actually run end-to-end on 2026-09-24 (Windows) against ⁠@qvac/sdk⁠ v0.19.1:"
```

