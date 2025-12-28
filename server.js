import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Check for API key
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('\n⚠️  ANTHROPIC_API_KEY environment variable is not set!');
  console.error('Please set it before running the server:\n');
  console.error('  export ANTHROPIC_API_KEY="your-api-key-here"');
  console.error('  npm run server\n');
  console.error('Get your API key from: https://console.anthropic.com/\n');
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM_PROMPT = `You are an expert prompt engineer helping users create effective AI prompts. Your role is to:

1. Help users articulate what they want their prompt to accomplish
2. Suggest improvements to make prompts clearer and more effective
3. Add structure, examples, and constraints when helpful
4. Explain why certain prompt techniques work well

When the user describes what they want, help them craft a well-structured prompt. When they share an existing prompt, suggest specific improvements.

Keep your responses concise and actionable. When you suggest a prompt or improvement, format it clearly so the user can easily copy it.

If you're suggesting a complete prompt, wrap it in a code block with the label "PROMPT:" so it can be easily identified and inserted into the editor.`;

app.post('/api/chat', async (req, res) => {
  if (!anthropic) {
    return res.status(500).json({
      error: 'API key not configured',
      details: 'Please set the ANTHROPIC_API_KEY environment variable and restart the server.'
    });
  }

  try {
    const { messages, currentPrompt } = req.body;

    // Build context about the current prompt being edited
    let contextMessage = '';
    if (currentPrompt?.title || currentPrompt?.content) {
      contextMessage = `\n\nCurrent prompt being edited:\nTitle: ${currentPrompt.title || '(untitled)'}\nContent: ${currentPrompt.content || '(empty)'}\n\nHelp the user improve or complete this prompt.`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextMessage,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error('Error calling Claude:', error.message);
    res.status(500).json({
      error: 'Failed to get response from Claude',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!apiKey
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 API server running on http://localhost:${PORT}`);
  if (apiKey) {
    console.log('✅ ANTHROPIC_API_KEY is configured\n');
  }
});
