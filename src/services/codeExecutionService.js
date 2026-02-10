// Code execution service using Judge0 API or local execution
import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

const EXEC_TIMEOUT_MS = 5000;

// Note: For production, you need to:
// 1. Get Judge0 API key from RapidAPI: https://rapidapi.com/judge0-official/api/judge0-ce
// 2. Add to .env: JUDGE0_API_KEY=your_api_key_here
// 3. Or use self-hosted Judge0 instance

// Language ID mapping for Judge0 CE (RapidAPI)
const LANGUAGE_IDS = {
  javascript: 63, // Node.js
  typescript: 74, // TypeScript
  python: 71, // Python 3
  java: 62, // Java
  cpp: 54, // C++17
  c: 50, // C
  csharp: 51, // C#
  go: 73, // Go
  ruby: 72, // Ruby
  swift: 83, // Swift
  rust: 75, // Rust
  php: 76, // PHP
  kotlin: 78, // Kotlin
  sql: 82, // SQL
  html: 79, // HTML
  css: 80, // CSS
};

/**
 * Execute code using Judge0 API
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language
 * @param {string} stdin - Standard input
 * @returns {Promise<Object>} Execution result
 */
export const executeCode = async (code, language, stdin = '') => {
  const lang = normalizeLang(language);

  // HTML always runs locally (no Judge0) so it works without any API key
  if (lang === 'html') {
    return localExecution(code, language, stdin);
  }

  if (!JUDGE0_API_KEY) {
    return localExecution(code, language, stdin);
  }

  try {
    const languageId = LANGUAGE_IDS[lang];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Submit code for execution
    // Note: Node.js 18+ has native fetch, for older versions install node-fetch
    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: stdin,
        cpu_time_limit: 2, // 2 seconds
        memory_limit: 128000, // 128 MB
      }),
    });

    if (!submitResponse.ok) {
      throw new Error('Failed to submit code for execution');
    }

    const submission = await submitResponse.json();
    const token = submission.token;

    // Poll for result
    let result = null;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const resultResponse = await fetch(
        `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
        {
          headers: {
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        }
      );

      if (resultResponse.ok) {
        result = await resultResponse.json();

        // Status 1 = In Queue, 2 = Processing
        if (result.status.id !== 1 && result.status.id !== 2) {
          break;
        }
      }

      attempts++;
    }

    if (!result) {
      throw new Error('Execution timeout');
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      message: result.message || '',
      status: getStatusFromJudge0(result.status.id),
      time: result.time || 0,
      memory: result.memory || 0,
    };
  } catch (error) {
    console.error('Code execution error:', error);
    return localExecution(code, language, stdin);
  }
};

/**
 * Get status from Judge0 status ID
 */
const getStatusFromJudge0 = (statusId) => {
  // Judge0 status IDs
  const statusMap = {
    3: 'passed', // Accepted
    4: 'failed', // Wrong Answer
    5: 'error', // Time Limit Exceeded
    6: 'error', // Compilation Error
    7: 'error', // Runtime Error
    8: 'error', // Memory Limit Exceeded
  };
  return statusMap[statusId] || 'error';
};

function normalizeLang(language) {
  if (language == null) return '';
  return String(language).toLowerCase().trim();
}

/**
 * Local execution (no Judge0): run JavaScript, Python, HTML for real; others get a clear message.
 */
const localExecution = async (code, language, stdin = '') => {
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return {
      stdout: '',
      stderr: 'Error: Empty code',
      status: 'error',
      time: 0,
      memory: 0,
    };
  }

  const lang = normalizeLang(language);

  // ---- JavaScript: run with Node.js (real stdout/stderr) ----
  if (lang === 'javascript') {
    return runNodeCode(code, stdin);
  }

  // ---- Python: run with python3 ----
  if (lang === 'python') {
    return runPythonCode(code, stdin);
  }

  // ---- HTML: always run locally (extract text + run inline <script>s) ----
  if (lang === 'html') {
    return runHtmlCode(code);
  }

  // One more check: sometimes language comes as "HTML" or with extra chars
  if (lang.includes('html') && !lang.includes('xhtml')) {
    return runHtmlCode(code);
  }

  // Other languages: need Judge0 for real execution
  return {
    stdout: '',
    stderr: `To run ${language} code, set JUDGE0_API_KEY in backend .env (see Judge0 on RapidAPI).`,
    status: 'error',
    time: 0,
    memory: 0,
  };
};

/**
 * Run JavaScript code with Node.js and capture real stdout/stderr.
 */
function runNodeCode(code, stdin) {
  let dir;
  let scriptPath;
  try {
    dir = mkdtempSync(join(tmpdir(), 'lms-run-'));
    scriptPath = join(dir, 'run.js');
    writeFileSync(scriptPath, code, 'utf8');
  } catch (err) {
    return {
      stdout: '',
      stderr: `Failed to prepare script: ${err.message}`,
      status: 'error',
      time: 0,
      memory: 0,
    };
  }

  try {
    const result = spawnSync('node', [scriptPath], {
      input: stdin,
      encoding: 'utf8',
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: 1024 * 1024, // 1MB
    });

    const stdout = (result.stdout || '').trim();
    const stderr = (result.stderr || '').trim();
    const err = result.error || (result.signal === 'SIGTERM' ? new Error('Execution timeout') : null);

    if (err) {
      return {
        stdout: stdout || '',
        stderr: stderr || err.message,
        status: 'error',
        time: 0,
        memory: 0,
      };
    }

    return {
      stdout: stdout || (result.status === 0 ? '' : ''),
      stderr,
      status: result.status === 0 ? 'passed' : 'error',
      time: 0,
      memory: 0,
    };
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (_) {}
  }
}

/**
 * Run HTML: extract visible text and run inline <script>s with Node; return combined output.
 */
function runHtmlCode(html) {
  const out = [];
  const err = [];

  // 1) Extract text content (strip tags, collapse whitespace)
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const text = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) out.push(text);

  // 2) Run each inline <script> with Node and capture stdout
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptCode = match[1].trim();
    if (!scriptCode) continue;
    const result = runNodeCode(scriptCode, '');
    if (result.stdout) out.push(result.stdout);
    if (result.stderr) err.push(result.stderr);
    if (result.status === 'error' && result.stderr) {
      return {
        stdout: out.join('\n').trim(),
        stderr: result.stderr,
        status: 'error',
        time: 0,
        memory: 0,
      };
    }
  }

  return {
    stdout: out.join('\n').trim() || '(no text or script output)',
    stderr: err.join('\n').trim(),
    status: err.length ? 'error' : 'passed',
    time: 0,
    memory: 0,
  };
}

/**
 * Run Python code with python3 and capture real stdout/stderr.
 */
function runPythonCode(code, stdin) {
  let dir;
  let scriptPath;
  try {
    dir = mkdtempSync(join(tmpdir(), 'lms-run-'));
    scriptPath = join(dir, 'run.py');
    writeFileSync(scriptPath, code, 'utf8');
  } catch (err) {
    return {
      stdout: '',
      stderr: `Failed to prepare script: ${err.message}`,
      status: 'error',
      time: 0,
      memory: 0,
    };
  }

  try {
    const result = spawnSync('python3', [scriptPath], {
      input: stdin,
      encoding: 'utf8',
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });

    const stdout = (result.stdout || '').trim();
    const stderr = (result.stderr || '').trim();
    const err = result.error || (result.signal === 'SIGTERM' ? new Error('Execution timeout') : null);

    if (err) {
      return {
        stdout: stdout || '',
        stderr: stderr || err.message,
        status: 'error',
        time: 0,
        memory: 0,
      };
    }

    return {
      stdout: stdout || '',
      stderr,
      status: result.status === 0 ? 'passed' : 'error',
      time: 0,
      memory: 0,
    };
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch (_) {}
  }
}

/**
 * Run test cases against code
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @param {Array} testCases - Array of test cases
 * @returns {Promise<Array>} Test results
 */
export const runTestCases = async (code, language, testCases) => {
  const results = [];

  for (const testCase of testCases) {
    try {
      const executionResult = await executeCode(code, language, testCase.input);

      const passed =
        executionResult.status === 'passed' &&
        executionResult.stdout.trim() === testCase.expectedOutput.trim();

      results.push({
        testCaseId: testCase._id || testCase.id,
        passed,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: executionResult.stdout,
        error: executionResult.stderr || executionResult.message,
        executionTime: executionResult.time,
        memoryUsed: executionResult.memory,
      });
    } catch (error) {
      results.push({
        testCaseId: testCase._id || testCase.id,
        passed: false,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        error: error.message,
        executionTime: 0,
        memoryUsed: 0,
      });
    }
  }

  return results;
};

