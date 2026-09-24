# QVAC Shadow Guard

Detect and block suspicious command-line instructions, destructive system scripts, and unverified file signatures — entirely on your own machine using [Tether's QVAC SDK](https://github.com/tetherto/qvac), no cloud call, no API key, no bill.

Two features, two different implementations, honestly labeled:

- **Log & Script Analyzer (the AI feature):** calls the QVAC SDK's `loadModel()` + `completion()` directly, running a local LLM (`LLAMA_3_2_1B_INST_Q4_0`) to scan system logs or command lines for malicious patterns (`sudo rm -rf /etc/systemd` → "CRITICAL ANOMALY DETECTED").
- **File & Hash Verification (a local utility, no AI):** deterministic cryptographic hash verification logic in `src/hashCheck.js` — no model call, and the GUI says so explicitly, rather than dressing up plain code as "AI" to pad out the feature list.

## What it does

```bash
node src/check.js "sudo rm -rf /etc/systemd"
node src/check.js --hash "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

## Verified output

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

## SDK version

Built and tested against @qvac/sdk v0.19.1 (see package.json).

## Requirements
Node.js >= 22.17

A machine that meets QVAC's system requirements

~780 MB free disk space for the LLM weights on first run

## Install

git clone [https://github.com/euanm407-bit/-QVAC-Shadow-Guard.git](https://github.com/euanm407-bit/-QVAC-Shadow-Guard.git)
cd -QVAC-Shadow-Guard
npm install

## Run

node src/check.js "<log or command to scan>"
node src/check.js --hash "<md5 or sha256 hash>"

## GUI mode

Bash
npm run gui
Loads the LLM once at startup, then starts a local server (http://localhost:18181 by default, override with PORT=8080 npm run gui).
Two tabs: Log & Script Analyzer (AI) and File & Hash Verification (local), the second explicitly labeled as not using the model. Verified working end-to-end on 2026-09-24 for both tabs.
## Sample materials to test with

Log & Script Analyzer:InputExpectsudo rm -rf /etc/systemdreliably flags High Risk and blocks executionnpm start --prefix /appreported as clean/safeeval(base64_decode('aW1wb3J0IG9z'))detected as obfuscated execution anomalyFile & Hash Verification:InputStatusMatchActione3b0c44298fc1c149afbf...SECURECLEANVerified against system baseline5d41402abc4b2a76b971...SECURECLEANVerified against system baseline

## How it uses QVAC

```js
import { loadModel, unloadModel, completion, LLAMA_3_2_1B_INST_Q4_0 } from "@qvac/sdk";

const modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 });

const run = completion({
  modelId,
  history: [
    { role: "system", content: "Fix ONLY subject-verb and determiner-noun number agreement..." },
    { role: "user", content: "The dogs is running in the park" },
  ],
  stream: true,
  completionOpts: { temperature: 0, maxTokens: 256 },
});

let corrected = "";
for await (const token of run.tokenStream) corrected += token;

await unloadModel({ modelId });
```

See [src/check.js](src/check.js) for the full implementation, including
the local word-diff and the safety guards described below, and
[src/wordForms.js](src/wordForms.js) for the non-AI word converter.

## Why I built this

Number agreement is a narrow, well-defined slice of grammar that's easy
to demonstrate clearly, and pairing it with a genuinely non-AI utility
(the word converter) let me show, side by side in the same app, what a
local LLM actually adds over deterministic code — rather than routing
every feature through the model just because the SDK makes it easy to.

## Real bugs found and fixed during testing

**1. The single-word mode double-converted already-plural input.** An
early version always called `pluralize(word)` and `singularize(word)` on
the raw input regardless of its detected number, so `--word boxes`
produced `boxeses`. Fixed by first detecting the number, then deriving
both forms from the correct base.

**2. The model would sometimes patch one mismatch while leaving (or
introducing) another.** On some inputs, the 1B model corrected part of a
sentence but left it still ungrammatical, or, on sentences with no error
at all, deleted words it wasn't asked to touch (e.g. "She likes cats and
dogs." → "She likes cats."). Fixed with layered guards in `check.js`
(`looksLikeAHallucination`): reject output that leaks meta-commentary,
that grows implausibly long, or that drops two or more whole words
without justification — falling back to the user's original sentence
with a visible warning rather than risk emitting broken or corrupted
text.

**3. Known, tested limitation (not silently hidden):** even after the
guards above, the 1B model is inconsistent on this specific narrow task —
running the exact same input twice can produce different results. It
sometimes misses real mismatches entirely (e.g. "This books are
interesting" or "The cat are sleeping" can be reported as already
correct). And the guards don't catch every malformed edit: on one run,
`"The children plays outside every day."` came back as
`"The children is plays outside every day."` — the model inserted "is"
without removing "plays," and because that's a same-or-growing word
count with high word overlap, none of the current guards flag it. The
app is deliberately designed to **fail safe** for the cases the guards
do catch — leaving the sentence unchanged rather than guessing — but
this is a real, observed gap: a small on-device model's accuracy ceiling
on a task this narrow, documented here with the actual bad output rather
than glossed over.

All three are visible in the commit history.

## License

[MIT](LICENSE)
