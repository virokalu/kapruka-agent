import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export const runtime = 'nodejs';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

interface MsgSlice { role: string; text: string }

export async function POST(req: Request) {
  try {
    const { messages }: { messages: MsgSlice[] } = await req.json();

    const context = messages
      .slice(-6)
      .filter(m => m.text?.trim())
      .map(m => `${m.role === 'user' ? 'User' : 'Kapruka'}: ${m.text.slice(0, 200)}`)
      .join('\n');

    const { text } = await generateText({
      model: google(process.env.AI_MODEL ?? 'gemini-2.5-flash'),
      maxOutputTokens: 80,
      prompt: `You are predicting what a user might type next in a Sri Lankan online shopping chat.

Conversation so far:
${context}

Give exactly 3 short natural follow-up messages the user would likely send next.
Rules:
- Max 6 words each
- No trailing punctuation
- Match the tone of the conversation
- If AI asked a question with options, mirror those options as chips
- Return ONLY a raw JSON array, nothing else

Example: ["Birthday flowers under LKR 2000","Something a bit more colourful","What's the delivery cost"]`,
    });

    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return Response.json({ suggestions: [] });

    const raw = JSON.parse(match[0]) as unknown[];
    const suggestions = raw
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 3);

    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
