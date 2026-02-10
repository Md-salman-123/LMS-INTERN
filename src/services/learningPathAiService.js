/**
 * AI-powered learning path generation.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise falls back to keyword-based suggestion.
 */

const FALLBACK_MAX_COURSES = 6;
const FALLBACK_LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * Generate a learning path suggestion using OpenAI.
 * @param {string} topic - e.g. "Full Stack Web Development"
 * @param {Array<{ _id: string, title: string, shortDescription?: string, syllabus?: { level?: string } }>} courses
 * @param {{ level?: string, maxCourses?: number }} options
 * @returns {Promise<{ title: string, description: string, shortDescription: string, level: string, courseIds: string[] }>}
 */
export async function generateLearningPathSuggestion(topic, courses, options = {}) {
  const { level: preferredLevel, maxCourses = 8 } = options;
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      return await generateWithOpenAI(apiKey, topic, courses, { preferredLevel, maxCourses });
    } catch (err) {
      console.warn('Learning path AI generation failed, using fallback:', err.message);
    }
  }

  return generateFallback(topic, courses, { preferredLevel, maxCourses });
}

/**
 * Call OpenAI to suggest title, description, and ordered course IDs.
 */
async function generateWithOpenAI(apiKey, topic, courses, { preferredLevel, maxCourses }) {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey });

  const courseList = courses.slice(0, 30).map((c) => ({
    id: String(c._id),
    title: c.title,
    shortDescription: (c.shortDescription || c.description || '').slice(0, 150),
    level: c.syllabus?.level || 'beginner',
  }));

  const systemPrompt = `You are a learning path designer. Given a topic and a list of available courses (each with id, title, shortDescription, level), respond with a single JSON object and no other text. The JSON must have exactly these keys: "title", "description", "shortDescription", "level", "courseIds".
- title: A clear learning path title (e.g. "Full Stack Web Development").
- description: 2-4 sentences describing the path and who it's for.
- shortDescription: One short sentence, under 200 characters.
- level: One of "beginner", "intermediate", "advanced".
- courseIds: An array of course "id" values in the recommended order. Use only ids from the provided list. Pick between 3 and ${Math.min(maxCourses, courseList.length)} courses that fit the topic.`;

  const userPrompt = `Topic: ${topic}
${preferredLevel ? `Preferred difficulty: ${preferredLevel}.` : ''}

Available courses (use only these ids in courseIds):
${JSON.stringify(courseList)}

Return the JSON object only.`;

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty AI response');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

  const validIds = new Set(courseList.map((c) => c.id));
  const courseIds = (parsed.courseIds || [])
    .filter((id) => validIds.has(String(id)))
    .slice(0, maxCourses);

  return {
    title: String(parsed.title || topic).slice(0, 200),
    description: String(parsed.description || `A learning path for ${topic}.`).slice(0, 2000),
    shortDescription: String(parsed.shortDescription || '').slice(0, 200),
    level: ['beginner', 'intermediate', 'advanced'].includes(parsed.level) ? parsed.level : 'beginner',
    courseIds,
  };
}

/**
 * Fallback: match courses by topic keywords and order by level, then build a simple path.
 */
function generateFallback(topic, courses, { preferredLevel, maxCourses = FALLBACK_MAX_COURSES }) {
  const lowerTopic = topic.toLowerCase();
  const words = lowerTopic.split(/\s+/).filter((w) => w.length > 2);

  const scored = courses.map((c) => {
    const title = (c.title || '').toLowerCase();
    const desc = (c.description || c.shortDescription || '').toLowerCase();
    const text = `${title} ${desc}`;
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score += 1;
    }
    const levelOrder = FALLBACK_LEVEL_ORDER[c.syllabus?.level] ?? 0;
    return { course: c, score, levelOrder };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.levelOrder - b.levelOrder;
  });

  const selected = scored
    .filter((s) => s.score > 0 || scored.length <= maxCourses)
    .slice(0, maxCourses)
    .map((s) => s.course);

  const courseIds = selected.map((c) => String(c._id));
  const title = topic.trim() || 'Custom Learning Path';
  const description = `A curated path for "${title}". Complete the courses in order to build your skills.`;
  const shortDescription = `Learn ${title} step by step.`;

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 2000),
    shortDescription: shortDescription.slice(0, 200),
    level: preferredLevel && ['beginner', 'intermediate', 'advanced'].includes(preferredLevel)
      ? preferredLevel
      : 'beginner',
    courseIds,
  };
}
