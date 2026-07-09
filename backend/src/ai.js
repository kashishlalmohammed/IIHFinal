const Groq = require('groq-sdk');
const {
  listInfluencers,
  searchInfluencers,
  getStats,
  getInfluencerById,
  getInfluencerScore,
  getInfluencerContent,
  listSocialLeague,
} = require('./db');

// ── Tool definitions exposed to the LLM ──────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_influencers',
      description:
        'Query the influencer database with optional filters. Returns a list of influencer profiles.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['external', 'internal'], description: 'Influencer type' },
          status: { type: 'string', enum: ['active', 'inactive', 'dormant', 'declined'], description: 'Relationship status' },
          approval_status: { type: 'string', enum: ['approved', 'pending', 'rejected'], description: 'Approval status' },
          platform: { type: 'string', description: 'Social platform, e.g. YouTube, LinkedIn, TikTok' },
          persona_group: { type: 'string', description: 'Persona group, e.g. "Developer / Engineer", "C-Suite / Executive"' },
          location: { type: 'string', description: 'Geographic region, e.g. americas, emea, uk, india' },
          event: { type: 'string', description: 'Campaign event, e.g. "IBM Think", "Wimbledon", "US Open"' },
          campaign_type: { type: 'string', description: 'Campaign type, e.g. "AI for Business", "Granite / Developer"' },
          has_content: { type: 'string', enum: ['true'], description: 'Set to "true" to only return creators with IBM content' },
          q: { type: 'string', description: 'Keyword search within name, bio, platforms' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_influencers',
      description:
        'Full-text search across influencer name, bio, platforms, events, and content. Good for open-ended queries.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search string' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats',
      description: 'Returns high-level dashboard statistics: total influencers, active count, social league count.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_influencer_detail',
      description: 'Returns full profile, score, and content history for a single influencer by their ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Influencer ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_social_league',
      description: 'Lists internal IBM Social League members. Filter by location, business unit, or AI topics.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Keyword search' },
          geo: { type: 'string', description: 'Geographic region' },
          business_unit: { type: 'string', description: 'IBM business unit' },
          talks_about_ai: { type: 'string', enum: ['1'], description: 'Set to "1" to filter members who talk about AI' },
        },
        required: [],
      },
    },
  },
];

// Groq's built-in web search tool — no extra API key needed
const WEB_SEARCH_TOOL = { type: 'web_search' };

// ── Tool executor ─────────────────────────────────────────────────────────────

function executeTool(name, args) {
  switch (name) {
    case 'list_influencers': {
      const results = listInfluencers(args).map(({ rate, ...rest }) => rest);
      // Return a summary to avoid blowing the context window
      return results.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        status: i.status,
        approval_status: i.approval_status,
        persona_group: i.persona_group,
        location: i.location,
        composite_score: i.score?.composite,
        platforms: i.platforms?.map(p => p.platform),
        events: i.events,
        has_content: (i.content?.length || 0) > 0,
      }));
    }
    case 'search_influencers': {
      const results = searchInfluencers(args.query).map(({ rate, ...rest }) => rest);
      return results.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        status: i.status,
        persona_group: i.persona_group,
        location: i.location,
        composite_score: i.score?.composite,
        platforms: i.platforms?.map(p => p.platform),
      }));
    }
    case 'get_stats':
      return getStats();
    case 'get_influencer_detail': {
      const inf = getInfluencerById(args.id);
      if (!inf) return { error: 'Influencer not found' };
      const { rate, ...safe } = inf;
      const score = getInfluencerScore(args.id);
      const content = getInfluencerContent(args.id);
      return { ...safe, score, content };
    }
    case 'list_social_league':
      return listSocialLeague(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Creator Assistant for IBM's Influencer Intelligence Hub — an internal tool used by IBM Marketing to manage influencer relationships and campaigns.

You have access to two types of tools:
1. Database tools — query the live influencer database (use these for anything about existing influencers, stats, campaigns)
2. Web search — search the internet (use this ONLY when asked for recommendations, suggestions, or information about influencers outside the database)

Always call a database tool before answering questions about existing influencers, statistics, or campaigns — never guess.
Use web search when the user explicitly asks for recommendations, new influencers to consider, or anything that requires up-to-date external knowledge.

When recommending influencers from web search, always clarify they are not currently in the database and suggest the user consider adding them.
When listing influencers in your reply, be concise: mention their name, persona, and one relevant data point. If there are more than 5 results, summarise the count and highlight the top ones.

The database contains:
- External influencers (paid/sponsored content creators)
- Internal influencers (IBM employees in the Social League)
- Campaign events: IBM Think, Wimbledon, US Open, AWS re:Invent, TechXchange, SXSW, Dreamforce, Gartner, KubeCon, NRF, NY Tech Week, SIBOS, Masters, GRAMMYs, NFL, Ferrari/F1, VivaTech, Mobile World Congress, AI Summit Korea
- Campaign types: AI for Business, Automation/webMethods, Granite/Developer, Hybrid Cloud, Security, Sports Survey 2025, UK Narrative, Cross-Geo
- Platforms: YouTube, LinkedIn, Instagram, TikTok, X, Reddit
- Geographies: americas, emea, uk, india

Be helpful, direct, and professional.`;

// ── Main exported function ────────────────────────────────────────────────────

async function aiChatQuery(message) {
  // If no API key is set, fall back to the original rule-based chatQuery
  if (!process.env.GROQ_API_KEY) {
    const { chatQuery } = require('./db');
    return chatQuery(message);
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: message },
  ];

  // Agentic loop: allow up to 5 tool-call rounds
  for (let round = 0; round < 5; round++) {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: [...TOOLS, WEB_SEARCH_TOOL],
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;
    messages.push(assistantMsg);

    // No more tool calls — we have the final answer
    if (choice.finish_reason !== 'tool_calls' || !assistantMsg.tool_calls?.length) {
      const reply = assistantMsg.content || "I couldn't generate a response. Please try again.";

      // Collect any influencer results from the last tool call round so the
      // frontend can still render clickable cards
      const lastToolResults = messages
        .filter(m => m.role === 'tool')
        .flatMap(m => {
          try {
            const data = JSON.parse(m.content);
            return Array.isArray(data) ? data.filter(d => d.id && d.name) : [];
          } catch { return []; }
        });

      return { reply, results: lastToolResults, filters: {} };
    }

    // Execute all tool calls in parallel
    // Note: web_search is handled natively by Groq — its results come back
    // automatically in the next completion, so we only need to execute our own tools.
    const toolResults = await Promise.all(
      assistantMsg.tool_calls
        .filter(tc => tc.function.name !== 'web_search')
        .map(async tc => {
          const args = JSON.parse(tc.function.arguments);
          const result = executeTool(tc.function.name, args);
          return {
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        })
    );

    // Only push tool results if there were non-web-search calls
    if (toolResults.length === 0) {
      // All calls were web_search — Groq handles them; just continue the loop
      continue;
    }

    messages.push(...toolResults);
  }

  return { reply: 'I reached the maximum number of steps. Please try a more specific question.', results: [], filters: {} };
}

module.exports = { aiChatQuery };
