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
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the internet for information about influencers, trends, or anything not in the database. Use when asked for recommendations of new influencers to consider, or for external knowledge.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query string' },
        },
        required: ['query'],
      },
    },
  },
];

// ── Web search via Tavily (free tier: 1,000 searches/month) ──────────────────

async function webSearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [{ snippet: 'Web search is not configured. Please set TAVILY_API_KEY in your .env file.' }];
  }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });

  if (!res.ok) {
    return [{ snippet: `Web search failed: ${res.status} ${res.statusText}` }];
  }

  const data = await res.json();
  return (data.results || []).map(r => ({ title: r.title, snippet: r.content, url: r.url }));
}

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
    case 'web_search':
      return webSearch(args.query);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Creator Assistant for IBM's Influencer Intelligence Hub — an internal tool used by IBM Marketing to manage influencer relationships and campaigns.

You have access to two types of tools:
1. Database tools — query the live influencer database (use these for anything about existing influencers, stats, campaigns)
2. web_search — search the internet (use this when asked for recommendations, suggestions, or information about influencers NOT in the database)

Always call a database tool before answering questions about existing influencers, statistics, or campaigns — never guess.
Use web_search when the user asks for recommendations of new influencers, external talent ideas, or anything requiring up-to-date external knowledge.
When sharing web search results, always clarify these people are not currently in the database and suggest adding strong candidates.
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
      tools: TOOLS,
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

    // Execute all tool calls in parallel (web_search returns a Promise, rest are sync)
    const toolResults = await Promise.all(
      assistantMsg.tool_calls.map(async tc => {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args);
        return {
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
      })
    );

    messages.push(...toolResults);
  }

  return { reply: 'I reached the maximum number of steps. Please try a more specific question.', results: [], filters: {} };
}

module.exports = { aiChatQuery };
