import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient, MODELS } from '@/lib/ai';

export const maxDuration = 120;

const PROMPTS: Record<string, string> = {
  sermon: `You are an assistant helping a rabbi prepare a sermon. Based on the following encounter transcript with a congregant, create a sermon that:
- Draws on themes, emotions, and life experiences from the conversation
- Incorporates relevant Torah, Talmud, or Midrash references that connect to the themes
- Maintains sensitivity to the congregant's situation and privacy (do not use their name or identifying details)
- Uses a warm, engaging homiletic style suitable for delivery to a congregation
- Builds toward a meaningful takeaway or call to reflection
- Is approximately 10-15 minutes when read aloud (~1500-2000 words)`,

  eulogy: `You are an assistant helping a rabbi prepare a eulogy (hesped). Based on the following encounter transcript (conversations with family and friends of the deceased), create a eulogy that:
- Honors the life, character, and legacy of the deceased
- Incorporates personal stories, qualities, and memories shared in the conversation
- Includes appropriate Torah references, psalms, or religious wisdom about loss and legacy
- Balances grief and mourning with celebration of the life lived
- Speaks to the mourners with comfort and compassion
- Is approximately 8-12 minutes when read aloud (~1200-1500 words)`,

  teaching: `You are an assistant helping a rabbi prepare a teaching or Dvar Torah. Based on the encounter transcript and the rabbi's notes, create a teaching that:
- Connects themes from the conversation to Torah, Talmud, or Midrash
- Is accessible and meaningful to a general congregation
- Includes practical wisdom and application to daily life
- Weaves narrative and textual analysis together engagingly
- Is approximately 5-8 minutes (~800-1200 words)`,

  dvar_torah: `You are an assistant helping a rabbi prepare a Dvar Torah (word of Torah). Based on the encounter and the rabbi's notes, create a concise Dvar Torah that:
- Centers on a specific Torah portion or Jewish text
- Connects the text to themes that emerged in the encounter
- Offers a fresh insight or interpretation
- Is concise and impactful (~500-800 words, 3-5 minutes)`,

  pastoral_letter: `You are an assistant helping a rabbi draft a pastoral letter to a congregant. Based on the encounter transcript, create a letter that:
- Addresses the congregant by first name (from the transcript)
- References themes and concerns discussed in the encounter
- Offers relevant comfort, guidance, or encouragement
- Includes appropriate religious wisdom or blessings
- Maintains a warm but professional pastoral tone
- Is personal without being overly informal`,

  meeting_summary: `You are an assistant helping a rabbi summarize an encounter. Based on the following transcript, create a concise summary that:
- Captures the key topics discussed
- Notes any action items or follow-ups
- Records significant pastoral concerns or life events mentioned
- Is organized with clear sections
- Maintains confidentiality (suitable for the rabbi's private records)`,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { transcript, notes, type, instructions, congregantName, customPrompt, templateBody, styleExcerpts, sparkContext, sourcesContext, userDraft, preserveLevel } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }
    if (!type || !PROMPTS[type]) {
      return NextResponse.json({ error: `Invalid type. Choose from: ${Object.keys(PROMPTS).join(', ')}` }, { status: 400 });
    }

    // Use custom template prompt if provided, otherwise default
    const basePrompt = customPrompt || PROMPTS[type] || PROMPTS['sermon'];

    let contextSections = '';
    if (transcript) contextSections += `\nENCOUNTER TRANSCRIPT:\n${transcript}\n`;
    if (notes) contextSections += `\nRABBI'S PRIVATE NOTES:\n${notes}\n`;
    if (sparkContext) contextSections += `\nRELATED SPARKS & INSIGHTS:\n${sparkContext}\n`;
    if (sourcesContext) contextSections += `\nATTACHED TORAH/TALMUD SOURCES (incorporate these references):\n${sourcesContext}\n`;
    if (styleExcerpts) contextSections += `\nSTYLE REFERENCE (match this tone, voice, and structure):\n${styleExcerpts}\n`;
    if (templateBody) contextSections += `\nTEMPLATE STRUCTURE (follow this skeleton, filling in content):\n${templateBody}\n`;
    if (userDraft) {
      const preserveMap: Record<number, string> = {
        1: 'Use the draft below as loose inspiration only. You may restructure, rewrite, and expand freely.',
        2: 'Preserve the key ideas and themes from the draft below, but improve the language, structure, and flow significantly.',
        3: 'Keep the core structure and voice of the draft below. Improve, expand, and polish while maintaining the author\'s intent.',
        4: 'Preserve most of the draft below closely. Only refine language, fix errors, and fill gaps. Keep the author\'s voice intact.',
        5: 'Keep the draft below almost exactly as written. Only fix obvious errors and complete any unfinished thoughts.',
      };
      contextSections += `\nRABBI'S OWN DRAFT (${preserveMap[preserveLevel || 3]}):\n${userDraft}\n`;
    }

    const userPrompt = `${basePrompt}

${instructions ? `ADDITIONAL INSTRUCTIONS FROM THE RABBI:\n${instructions}\n` : ''}
${contextSections}
${congregantName ? `CONGREGANT/SUBJECT NAME: ${congregantName}` : ''}

Generate the ${type.replace('_', ' ')} now.`;

    const client = await getClient();
    const stream = client.messages.stream({
      model: MODELS.SONNET,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();
    let fullText = '';

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && 'delta' in event && (event.delta as any).type === 'text_delta') {
              const text = (event.delta as any).text || '';
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.enqueue(encoder.encode(`\n\n__STREAM_DONE__`));
          controller.close();
        } catch (err: any) {
          console.error('[Rav Generate] Error:', err?.message || err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    });
  } catch (e: any) {
    if (e.message === 'Not authenticated') return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    console.error('[Rav Generate] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
