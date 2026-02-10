import { executeCode } from '../services/codeExecutionService.js';

/**
 * Run code (no test cases). Used by assignments and any editor that needs "Run" output.
 * POST /api/run-code
 * Body: { code, language, stdin? }
 */
export const runCode = async (req, res, next) => {
  try {
    const { code, language, stdin = '' } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required',
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Language is required',
      });
    }

    const lang = String(language).toLowerCase().trim();
    const result = await executeCode(code, lang, typeof stdin === 'string' ? stdin : '');

    res.status(200).json({
      success: true,
      data: {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compile_output: result.compile_output || '',
        message: result.message || '',
        status: result.status,
        time: result.time,
        memory: result.memory,
      },
    });
  } catch (error) {
    next(error);
  }
};
