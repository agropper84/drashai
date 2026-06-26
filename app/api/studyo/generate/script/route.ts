// POST /api/studyo/generate/script
// Generates a script/transcript via Claude based on project materials + config.
// Returns structured JSON: { title, lines: [{ speaker, text }] } for audio,
// { title, sections } for notes, { title, questions } for questions.
// Streams the response for live display.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient } from '@/lib/ai';
import { MODELS } from '@/lib/models';
import { getProject } from '@/lib/studyo-kv';

export const maxDuration = 120;

const LENGTH_MAP: Record<string, string> = {
  quick: '700-1,000 words (~5 minutes when read aloud)',
  standard: '2,000-2,600 words (~15 minutes when read aloud)',
  deep: '4,500+ words (~30 minutes when read aloud)',
};

const FORMAT_ROLES: Record<string, { a: string; b?: string }> = {
  podcast: { a: 'Host A', b: 'Host B' },
  lecture: { a: 'Narrator' },
  interview: { a: 'Interviewer', b: 'Expert' },
  socratic: { a: 'Tutor' },
  summary: { a: 'Narrator' },
  custom: { a: 'Speaker' },
};

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { projectId, kind, format, length, voiceA, voiceB, materialIds, note, notesStyle, qCount, customFormat, memory } = body;

  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const project = await getProject(session.userId, projectId);
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  // Collect selected material text
  const selectedMaterials = (materialIds || [])
    .map((id: string) => project.material.find(m => m.id === id))
    .filter(Boolean);

  const materialText = selectedMaterials
    .map((m: any, i: number) => `--- Source ${i + 1}: ${m.title} ---\n${m.extractedText || m.meta || '(no text extracted)'}`)
    .join('\n\n');

  // Build memory context
  const memoryContext = (memory || project.memory || [])
    .map((m: any) => m.content)
    .filter(Boolean)
    .join('\n');

  let systemPrompt: string;
  let userPrompt: string;

  if (kind === 'audio' || kind === 'extract') {
    const roles = FORMAT_ROLES[format] || FORMAT_ROLES.lecture;
    const twoSpeakers = !!roles.b;
    const lengthDesc = LENGTH_MAP[length] || LENGTH_MAP.standard;

    systemPrompt = `You are a world-class educational content creator. Generate a ${format} script from the provided study material.

Format: ${format}${customFormat ? ` (${customFormat})` : ''}
Length: ${lengthDesc}
${twoSpeakers ? `Speakers: "${roles.a}" (speaker A) and "${roles.b}" (speaker B). Write natural dialogue with back-and-forth exchanges.` : `Speaker: "${roles.a}". Write as a solo narration.`}

Rules:
- Ground every claim in the provided material — don't invent facts
- Define technical terms when first introduced
- Use engaging, conversational language appropriate for studying
- Structure with a clear introduction, body, and conclusion
- Include natural transitions between topics
${memoryContext ? `\nContext from previous sessions:\n${memoryContext}` : ''}

Return ONLY valid JSON (no markdown wrapping):
{
  "title": "episode title",
  "lines": [
    { "speaker": "A", "text": "..." },
    ${twoSpeakers ? '{ "speaker": "B", "text": "..." },' : ''}
    ...
  ]
}`;

    userPrompt = `${note ? `Instructions: ${note}\n\n` : ''}Source material:\n\n${materialText}`;
  } else if (kind === 'notes') {
    systemPrompt = `You are an expert study notes creator. Generate structured ${notesStyle || 'outline'}-style notes from the provided material.

${memoryContext ? `Context from previous sessions:\n${memoryContext}\n` : ''}
Return ONLY valid JSON:
{
  "title": "notes title",
  "sections": [
    { "h": "Section Heading", "items": ["bullet point 1", "bullet point 2", ...] },
    ...
  ]
}`;
    userPrompt = `${note ? `Instructions: ${note}\n\n` : ''}Material:\n\n${materialText}`;
  } else if (kind === 'questions') {
    const count = qCount ? parseInt(qCount.replace('q', '')) : 8;
    systemPrompt = `You are an expert quiz creator. Generate ${count} practice questions from the provided material.

${memoryContext ? `Context from previous sessions:\n${memoryContext}\n` : ''}
Return ONLY valid JSON:
{
  "title": "quiz title",
  "questions": [
    { "q": "question text", "a": "detailed answer" },
    ...
  ]
}`;
    userPrompt = `${note ? `Instructions: ${note}\n\n` : ''}Material:\n\n${materialText}`;
  } else {
    // transcript
    systemPrompt = `You are a transcription specialist. Generate a clean, formatted transcript from the provided material.

${memoryContext ? `Context from previous sessions:\n${memoryContext}\n` : ''}
Return ONLY valid JSON:
{
  "title": "transcript title",
  "lines": [
    { "speaker": "Speaker", "text": "..." },
    ...
  ]
}`;
    userPrompt = `${note ? `Instructions: ${note}\n\n` : ''}Material:\n\n${materialText}`;
  }

  try {
    const client = await getClient();
    const msg = await client.messages.create({
      model: MODELS.OPUS,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse script', raw: text }, { status: 500 });
    }

    const script = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ script });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }
}
