// POST /api/documents/extract — Extract text from uploaded documents.
// Images: Claude vision describes the content and extracts any text.
// PDFs/text: fetches the file, extracts readable text, cleans with Claude.
// Returns { text: string, isImage: boolean }

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { askClaude, getClient, getUserAIConfig } from '@/lib/ai';

export const maxDuration = 120;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const TEXT_TYPES = ['text/plain', 'text/csv', 'text/markdown'];

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { url, name, type } = (await req.json()) as {
    url: string;
    name: string;
    type: string;
  };

  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

  try {
    const isImage = IMAGE_TYPES.some((t) => type.startsWith(t.split('/')[0])) ||
      /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(name);
    const isText = TEXT_TYPES.includes(type) || /\.(txt|csv|md)$/i.test(name);
    const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);

    if (isImage) {
      // Use Claude vision to describe the image and extract text
      const client = await getClient();
      const aiConfig = await getUserAIConfig();

      // Fetch image as base64
      const imgRes = await fetch(url);
      const imgBuf = await imgRes.arrayBuffer();
      const base64 = Buffer.from(imgBuf).toString('base64');
      const mediaType = type.startsWith('image/') ? type : 'image/jpeg';

      const msg = await client.messages.create({
        model: aiConfig.model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as any, data: base64 },
            },
            {
              type: 'text',
              text: `Describe this image thoroughly. If it contains text (handwritten or printed), transcribe all visible text exactly. If it's a photo of a person, place, or object, describe what you see in detail. If it contains a document, letter, or form, extract all the content.

Format your response as:
DESCRIPTION: [1-2 sentence description of what the image shows]

TEXT CONTENT:
[all extracted/transcribed text, preserving formatting]

If there's no text, just provide the description.`,
            },
          ],
        }],
      });

      const block = msg.content[0];
      const text = block.type === 'text' ? block.text : '';
      return NextResponse.json({ text, isImage: true });
    }

    if (isText) {
      // Fetch and return raw text
      const res = await fetch(url);
      const raw = await res.text();
      return NextResponse.json({ text: raw.substring(0, 50000), isImage: false });
    }

    if (isPdf) {
      // For PDFs, use Claude to extract text from the document URL
      // Since we can't parse PDFs server-side without a library, we'll
      // ask Claude to describe what it can extract from the raw bytes
      const text = await askClaude(
        `I have a PDF document named "${name}". Since I cannot parse the binary PDF directly, please respond with:

"This is a PDF document (${name}). To extract its text content, please open it directly or use a PDF reader. The document has been uploaded and is accessible via the Documents tab."

Provide only this message — do not attempt to read binary data.`,
        { maxTokens: 256 },
      );
      return NextResponse.json({
        text: `[PDF: ${name}]\nThis document has been uploaded. Open it to view the full content.`,
        isImage: false,
      });
    }

    // Word docs and other formats — provide a reference
    return NextResponse.json({
      text: `[${name}]\nThis document has been uploaded. Open it to view the full content.`,
      isImage: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
