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
▸ Checking on-device: "sudo rm -rf /etc/systemd"


Found 1 security threat(s):

  ⚠️ CRITICAL ANOMALY RISK: HIGH

Analysis log:
  • Found potentially destructive command: sudo rm -rf /etc/systemd
  • Action: Execution blocked by Shadow Guard rules engine.
  • Recommended: Review user permissions and local logs.
▸ "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" — local rule-based analysis (no AI call for this mode)

  Status:    SECURE
  Match:     CLEAN
  Signature: Verified against local trusted baseline
```

## SDK version

Built and tested against @qvac/sdk v0.19.1 (see package.json).

## Requirements

Node.js >= 22.17A machine that meets QVAC's system
requirements~780 MB free disk space for the LLM weights on first run

## Install

Bashgit clone [https://github.com/euanm407-bit/-QVAC-Shadow-Guard.git](https://github.com/euanm407-bit/-QVAC-Shadow-Guard.git)
cd -QVAC-Shadow-Guard
npm install

## Run
 Bash

node src/check.js "<log or command to scan>"
node src/check.js --hash "<md5 or sha256 hash>"

## GUI mode

Bash

npm run gui

Loads the LLM once at startup, then starts a local server (http://localhost:18181 by default, override with PORT=8080 npm run gui).Two tabs: Log & Script Analyzer (AI) and File & Hash Verification (local), the second explicitly labeled as not using the model. Verified working end-to-end on 2026-09-24 for both tabs.

## Sample materials to test with
Log & Script Analyzer:
InputExpectsudo rm -rf /etc/systemdreliably flags High Risk and blocks executionnpm start --prefix /appreported as clean/safeeval(base64_decode('aW1wb3J0IG9z'))detected as obfuscated execution anomalyFile & Hash Verification:InputStatusMatchActione3b0c44298fc1c149afbf...SECURECLEANVerified against system baseline5d41402abc4b2a76b971...SECURECLEANVerified against system baseline

## How it uses QVAC
JavaScriptimport { loadModel, unloadModel, completion, LLAMA_3_2_1B_INST_Q4_0 } from "@qvac/sdk";

const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 });

const run = completion({
  modelId,
  history: [
    { role: "system", content: "Analyze the input script/log for destructive commands (e.g., rm -rf, unauthorized privilege escalation, or code injection). Respond with risk severity and recommended actions..." },
    { role: "user", content: "sudo rm -rf /etc/systemd" },
  ],
  stream: true,
  completionOpts: { temperature: 0, maxTokens: 256 },
});

let analysis = "";
for await (const token of run.tokenStream) analysis += token;

await unloadModel({ modelId });
See src/check.js for the full implementation, including local threat parsing and safety rules, and src/hashCheck.js for the non-AI hash verifier.

## Why I built this

Local security scanning requires absolute data privacy — system logs and credentials must never leak to third-party cloud APIs. Pairing an on-device LLM analyzer with a deterministic hash checker demonstrates how local AI can complement traditional security heuristics while keeping 100% of sensitive system data on the local machine.

## Real bugs found and fixed during testing

1. False positives on safe rm commands. An early version flagged safe cleanup commands like rm -rf ./node_modules/.cache as critical threats. Fixed by teaching the local parser to evaluate target path privilege levels (/, /etc, /var, /sys vs relative workspace paths).

2. Hardcoded fallback outputs. The initial prototype rendered static warning text (/var/log) regardless of what command the user entered. Fixed by dynamically extracting the target string and embedding the matched command directly inside the analysis payload.

3. Known, tested limitation: A 1B model can occasionally misinterpret complex obfuscated scripts or bash parameter expansions (e.g. ${VARIABLE//pattern/replacement}). The app uses local regex guards to fail safe and auto-flag high-risk Linux utilities even if the LLM fails to recognize the syntax pattern.

## License
MIT
