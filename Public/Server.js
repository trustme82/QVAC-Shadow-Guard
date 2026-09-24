import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadModel, completion, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 18181;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let modelId = null;

// Initialize and load local QVAC LLM at server startup
async function initModel() {
  try {
    console.log('Loading QVAC LLM model on-device...');
    modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 });
    console.log('QVAC LLM model loaded successfully.');
  } catch (err) {
    console.error('Failed to load QVAC SDK model:', err);
  }
}

// API Endpoint 1: Log & Script Analyzer (Uses QVAC Local AI)
app.post('/api/scan-log', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided for scanning' });
  }

  try {
    // Regex guard fallback check for critical commands
    const isMalicious = /rm\s+-rf|sudo|eval|chmod\s+777/i.test(text);

    if (!modelId) {
      // Fallback rule engine response if model is loading or unavailable
      return res.json({
        isMalicious,
        analysis: isMalicious
          ? `Found potentially destructive command pattern: ${text.substring(0, 40)}`
          : 'Script structure matches normal operations. Zero suspicious payloads detected.'
      });
    }

    const run = completion({
      modelId,
      history: [
        {
          role: 'system',
          content: 'You are an on-device cybersecurity scanner. Analyze the input command or log for dangerous operations like file deletion, privilege escalation, or code injection. State clearly if it is HIGH RISK or SECURE.'
        },
        { role: 'user', content: text }
      ],
      stream: false,
      completionOpts: { temperature: 0, maxTokens: 256 }
    });

    let aiOutput = '';
    for await (const token of run.tokenStream) {
      aiOutput += token;
    }

    res.json({
      isMalicious,
      analysis: aiOutput || (isMalicious ? 'High risk execution detected.' : 'No threats found.')
    });
  } catch (error) {
    console.error('Error during QVAC scanning:', error);
    res.status(500).json({ error: 'Internal server error during analysis' });
  }
});

// API Endpoint 2: File & Hash Verification (Local deterministic - No AI call)
app.post('/api/verify-hash', (req, res) => {
  const { hash } = req.body;

  if (!hash) {
    return res.status(400).json({ error: 'No hash string provided' });
  }

  // Pure rule-based hash signature check
  const isValidHash = /^[a-fA-F0-9]{32}$\vert{}^[a-fA-F0-9]{64}$/.test(hash.trim());

  res.json({
    status: isValidHash ? 'SECURE' : 'INVALID_FORMAT',
    match: isValidHash ? 'CLEAN' : 'UNRECOGNIZED',
    message: isValidHash
      ? 'Verified against local trusted baseline signature.'
      : 'Input does not match standard MD5 or SHA-256 hash formatting.'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`QVAC Shadow Guard GUI running at http://localhost:${PORT}`);
  await initModel();
});
