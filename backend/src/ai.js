const Groq = require('groq-sdk');
const {
  listInfluencers,
  searchInfluencers,
  getStats,
  getInfluencerById,
  getInfluencerScore,
  getInfluencerContent,
  getInfluencerRate,
  listSocialLeague,
  searchExtendedKnowledge,
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
          type: { type: 'string', enum: ['external', 'internal'], description: 'Influencer type. Use "external" for paid/sponsored creators, "internal" for IBM employees.' },
          status: { type: 'string', enum: ['active', 'inactive', 'dormant', 'declined'], description: 'Relationship status — whether the influencer is currently active/available. Use "active" to filter for active influencers.' },
          approval_status: { type: 'string', enum: ['approved', 'pending', 'rejected'], description: 'Internal approval state — only use when the user specifically asks about approved/pending/rejected profiles. Do NOT use this for "active" — use the status field instead.' },
          platform: { type: 'string', description: 'Social platform, e.g. YouTube, LinkedIn, TikTok' },
          persona_group: { type: 'string', description: 'Persona group, e.g. "Developer / Engineer", "C-Suite / Executive"' },
          location: { type: 'string', description: 'Geographic region, e.g. americas, emea, uk, india' },
          event: { type: 'string', description: 'Campaign event, e.g. "IBM Think", "Wimbledon", "US Open"' },
          campaign_type: { type: 'string', description: 'Campaign type, e.g. "AI for Business", "Granite / Developer"' },
          has_content: { type: 'string', description: 'Pass the string "true" to only return creators who have IBM content posted' },
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
      name: 'get_influencer_rate',
      description: 'Returns the rate/cost on file for a single influencer by their ID. Only call this when the user is specifically asking about cost or what working with someone would cost.',
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
  {
    type: 'function',
    function: {
      name: 'search_extended_knowledge',
      description: 'Search the extended CSV knowledge base — 800+ influencers from IBM\'s historical spreadsheets and tracking files. Use this when search_influencers returns no results, or when vetting pasted names to check if IBM has ever tracked or worked with someone even if they are not yet fully profiled in the hub.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name, handle, or keyword to search for' },
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
    case 'get_influencer_rate': {
      const rate = getInfluencerRate(args.id);
      if (rate === undefined) return { error: 'Influencer not found' };
      return { id: args.id, rate: rate || 'Not on file' };
    }
    case 'search_extended_knowledge':
      return searchExtendedKnowledge(args.query);
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

You have access to three types of tools:
1. **Hub database tools** — query the live 579-profile influencer hub (fully profiled creators with scores, rates, and campaign history)
2. **search_extended_knowledge** — search 800+ names from IBM's historical spreadsheets and CSV tracking files (people IBM has tracked or worked with even if not yet fully profiled in the hub)
3. **web_search** — search the internet for external knowledge, new talent ideas, or anything not in our data

## How to answer questions about specific influencers
Always follow this two-step lookup — NEVER skip step 2:
1. Call search_influencers (hub database) first.
2. If not found there, ALWAYS also call search_extended_knowledge — IBM may have worked with or tracked this person in historical spreadsheets even if they're not in the hub.
3. Only use web_search if both steps above return nothing and external info is needed.

Report the result clearly:
- Found in hub → "✅ Yes, [Name] is in our hub — [status, score, campaigns]"
- Found only in CSV records → "📋 [Name] isn't fully profiled in the hub yet, but appears in IBM's historical tracking records — associated with [campaigns], [followers] followers, [impressions/engagement if available]"
- Not found anywhere → "❌ [Name] doesn't appear in any of our records"

If the user's message mentions cost/rates/budget AND the person is found in the hub, call get_influencer_rate.

## Pasted message / vetting workflow
When the user pastes a raw message, email, Slack message, or forwarded text asking about one or more influencers (identified by name, URL, or handle), do ALL of the following for EACH person mentioned:
1. Extract every name, URL, and handle — do not skip anyone.
2. Run both search_influencers AND search_extended_knowledge for each person.
3. Report hub status + CSV history + rate (if cost was mentioned) in a clean summary per person.
4. A website URL like https://sineadbovell.com/ means search for "sineadbovell" or "sinead bovell" as name/handle.

## General search behaviour
- Always call a database tool before answering questions about existing influencers — never guess.
- Use web_search only for recommendations of new influencers, external talent ideas, or up-to-date external knowledge.
- When sharing web search results, clarify these people are not in our records and suggest adding strong candidates.
- When listing influencers, be concise: name, persona, one relevant data point. Summarise if more than 5 results.

The hub contains:
- External influencers (paid/sponsored content creators)
- Internal influencers (IBM employees in the Social League)
- Campaign events: IBM Think, Wimbledon, US Open, AWS re:Invent, TechXchange, SXSW, Dreamforce, Gartner, KubeCon, NRF, NY Tech Week, SIBOS, Masters, GRAMMYs, NFL, Ferrari/F1, VivaTech, Mobile World Congress, AI Summit Korea
- Campaign types: AI for Business, Automation/webMethods, Granite/Developer, Hybrid Cloud, Security, Sports Survey 2025, UK Narrative, Cross-Geo
- Platforms: YouTube, LinkedIn, Instagram, TikTok, X, Reddit
- Geographies: americas, emea, uk, india

Be helpful, direct, and professional.`;

// ── Main exported function ────────────────────────────────────────────────────

async function aiChatQuery(message, history = []) {
  // If no API key is set, fall back to the original rule-based chatQuery
  if (!process.env.GROQ_API_KEY) {
    const { chatQuery } = require('./db');
    return chatQuery(message);
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Build messages: system prompt + conversation history + latest user message
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role, content: m.text })),
    { role: 'user', content: message },
  ];

  let toolCallRetries = 0;
  // Agentic loop: allow up to 5 tool-call rounds
  for (let round = 0; round < 5; round++) {
    let response;
    try {
      response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        max_tokens: 1024,
      });
    } catch (err) {
      // Surface rate-limit errors clearly instead of returning an empty response
      if (err.status === 429) {
        return { reply: "⚠️ The AI assistant has hit its daily token limit and will be available again in a few hours. In the meantime, you can use the search bar and filters to browse the influencer database.", results: [], filters: {} };
      }
      // Groq occasionally fails to parse its own tool-call output (tool_use_failed 400).
      // Retry the same round (up to 2 times) with a nudge to use correct JSON tool syntax.
      if (err.status === 400 && err.message?.includes('tool') && toolCallRetries < 2) {
        toolCallRetries++;
        messages.push({ role: 'user', content: 'Please call the appropriate tool using proper JSON format to answer my question.' });
        round--;  // redo this round
        continue;
      }
      throw err;
    }
    toolCallRetries = 0; // reset on success

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
