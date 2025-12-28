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

// =============================================================================
// Mock Sync Backend
// =============================================================================

// In-memory "database" with sync_id versioning
let currentSyncId = 0;
const mockDB = {
  prompts: new Map(),
  promptVersions: new Map(),
  groups: new Map(),
  // Operation log for delta sync
  operations: [] // { syncId, entityType, entityId, operation, entity }
};

// Helper to create a sync operation
function recordOperation(entityType, entityId, operation, entity) {
  currentSyncId++;
  const op = {
    syncId: currentSyncId,
    entityType,
    entityId,
    operation, // 'create' | 'update' | 'delete'
    entity: entity ? { ...entity, syncId: currentSyncId } : null,
    timestamp: new Date().toISOString()
  };
  mockDB.operations.push(op);

  // Also update the entity with syncId
  if (entity && operation !== 'delete') {
    entity.syncId = currentSyncId;
  }

  return currentSyncId;
}

// Seed some initial data
function seedMockData() {
  const now = new Date().toISOString();

  // Create groups
  const groups = [
    { id: 'group-1', type: 'group', name: 'Work', color: 'bg-blue-500', createdAt: now, updatedAt: now },
    { id: 'group-2', type: 'group', name: 'Personal', color: 'bg-green-500', createdAt: now, updatedAt: now },
    { id: 'group-3', type: 'group', name: 'Development', color: 'bg-purple-500', createdAt: now, updatedAt: now },
  ];

  groups.forEach(g => {
    mockDB.groups.set(g.id, g);
    recordOperation('group', g.id, 'create', g);
  });

  // Create prompts
  const prompts = [
    {
      id: 'prompt-1',
      type: 'prompt',
      title: 'Code Review Assistant',
      content: 'You are a senior software engineer conducting a code review. Analyze the following code for bugs, performance issues, security vulnerabilities, and adherence to best practices. Provide specific, actionable feedback.',
      category: 'Development',
      isFavorite: true,
      groupId: 'group-3',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'prompt-2',
      type: 'prompt',
      title: 'Creative Writing Partner',
      content: 'You are a creative writing assistant specializing in storytelling. Help me develop compelling narratives with rich characters, engaging plots, and vivid descriptions. Ask clarifying questions to understand my vision.',
      category: 'Writing',
      isFavorite: false,
      groupId: 'group-2',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'prompt-3',
      type: 'prompt',
      title: 'Data Analysis Expert',
      content: 'You are a data analyst with expertise in statistical analysis and visualization. Help me interpret datasets, identify trends, and create meaningful insights. Explain complex concepts in simple terms.',
      category: 'Analytics',
      isFavorite: true,
      groupId: 'group-1',
      createdAt: now,
      updatedAt: now
    },
  ];

  prompts.forEach(p => {
    mockDB.prompts.set(p.id, p);
    recordOperation('prompt', p.id, 'create', p);
  });

  console.log(`[MockDB] Seeded with ${groups.length} groups and ${prompts.length} prompts`);
}

// Initialize mock data
seedMockData();

/**
 * Sync endpoint - returns all changes since lastSyncId
 * POST /api/sync
 * Body: { lastSyncId: number, limit?: number }
 */
app.post('/api/sync', (req, res) => {
  const { lastSyncId = 0, limit = 100 } = req.body;

  // Get all operations since lastSyncId
  const relevantOps = mockDB.operations.filter(op => op.syncId > lastSyncId);
  const limitedOps = relevantOps.slice(0, limit);
  const hasMore = relevantOps.length > limit;

  // Group operations by entity type and operation
  const changes = {
    prompts: { created: [], updated: [], deleted: [] },
    promptVersions: { created: [], updated: [], deleted: [] },
    groups: { created: [], updated: [], deleted: [] }
  };

  // Process operations - use a Map to get the latest state for each entity
  const entityStates = new Map(); // entityType:entityId -> latest operation

  limitedOps.forEach(op => {
    const key = `${op.entityType}:${op.entityId}`;
    entityStates.set(key, op);
  });

  // Convert to delta format
  entityStates.forEach((op, key) => {
    const [entityType, entityId] = key.split(':');
    const changesKey = entityType === 'prompt' ? 'prompts' :
                       entityType === 'prompt_version' ? 'promptVersions' :
                       entityType === 'group' ? 'groups' : null;

    if (!changesKey) return;

    if (op.operation === 'delete') {
      changes[changesKey].deleted.push(entityId);
    } else if (op.operation === 'create') {
      changes[changesKey].created.push(op.entity);
    } else if (op.operation === 'update') {
      changes[changesKey].updated.push(op.entity);
    }
  });

  const newSyncId = limitedOps.length > 0
    ? limitedOps[limitedOps.length - 1].syncId
    : lastSyncId;

  res.json({
    syncId: newSyncId,
    timestamp: new Date().toISOString(),
    hasMore,
    changes
  });

  console.log(`[Sync] Client synced from ${lastSyncId} to ${newSyncId}, ${limitedOps.length} operations`);
});

/**
 * Mutations endpoint - apply client mutations
 * POST /api/mutations
 * Body: { clientId: string, mutations: PendingMutation[] }
 */
app.post('/api/mutations', (req, res) => {
  const { clientId, mutations } = req.body;

  if (!mutations || !Array.isArray(mutations)) {
    return res.status(400).json({ error: 'Invalid mutations array' });
  }

  const results = [];
  let newSyncId = currentSyncId;

  for (const mutation of mutations) {
    try {
      const { id: mutationId, operation, entityType, entityId, payload } = mutation;

      // Determine the correct Map to use
      const entityMap = entityType === 'prompt' ? mockDB.prompts :
                        entityType === 'prompt_version' ? mockDB.promptVersions :
                        entityType === 'group' ? mockDB.groups : null;

      if (!entityMap) {
        results.push({ mutationId, success: false, error: 'Unknown entity type' });
        continue;
      }

      const now = new Date().toISOString();

      if (operation === 'create') {
        const entity = {
          ...payload,
          id: entityId,
          type: entityType,
          createdAt: payload.createdAt || now,
          updatedAt: now
        };
        entityMap.set(entityId, entity);
        newSyncId = recordOperation(entityType, entityId, 'create', entity);
        results.push({ mutationId, success: true, entity });

      } else if (operation === 'update') {
        const existing = entityMap.get(entityId);
        if (!existing) {
          results.push({ mutationId, success: false, error: 'Entity not found' });
          continue;
        }
        const updated = { ...existing, ...payload, updatedAt: now };
        entityMap.set(entityId, updated);
        newSyncId = recordOperation(entityType, entityId, 'update', updated);
        results.push({ mutationId, success: true, entity: updated });

      } else if (operation === 'delete') {
        const existing = entityMap.get(entityId);
        if (existing) {
          existing.isDeleted = true;
          existing.updatedAt = now;
          newSyncId = recordOperation(entityType, entityId, 'delete', existing);
        }
        results.push({ mutationId, success: true });
      }

    } catch (error) {
      results.push({ mutationId: mutation.id, success: false, error: error.message });
    }
  }

  res.json({
    success: results.every(r => r.success),
    syncId: newSyncId,
    results
  });

  console.log(`[Mutations] Client ${clientId} pushed ${mutations.length} mutations, ${results.filter(r => r.success).length} succeeded`);
});

/**
 * Debug endpoint to view mock database state
 * GET /api/debug/db
 */
app.get('/api/debug/db', (req, res) => {
  res.json({
    currentSyncId,
    prompts: Array.from(mockDB.prompts.values()),
    promptVersions: Array.from(mockDB.promptVersions.values()),
    groups: Array.from(mockDB.groups.values()),
    operationsCount: mockDB.operations.length
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 API server running on http://localhost:${PORT}`);
  if (apiKey) {
    console.log('✅ ANTHROPIC_API_KEY is configured\n');
  }
});
