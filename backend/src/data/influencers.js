// Seeded influencer dataset for IBM Influencer Intelligence Hub demo

const influencers = [
  {
    id: "1",
    name: "Priya Sharma",
    type: "external",
    persona_group: "Developer / Engineer",
    location: "San Francisco, CA",
    bio: "Developer educator with a focus on AI/ML tooling. Creates long-form tutorials on watsonx and enterprise AI. Audience skews 80% software engineers and data scientists.",
    campaign_rationale: "Strong watsonx content history. High engagement from technical audience. Ideal for Granite 4.0 launch campaign targeting enterprise developers.",
    status: "active",
    approval_status: "approved",
    owner: "Marcus Lee",
    last_collaborated: "2024-11-15",
    rate: "$8,500 per sponsored video",
    events: ["IBM Think", "IBM TechXchange", "NY Tech Week"],
    campaign_types: ["AI for Business", "Granite / Developer"],
    platforms: [
      { platform: "YouTube", handle: "@priyacodes", follower_count: 142000, updated_at: "2025-01-10" },
      { platform: "LinkedIn", handle: "priya-sharma-dev", follower_count: 28500, updated_at: "2025-01-10" },
      { platform: "X", handle: "@priyacodes", follower_count: 18200, updated_at: "2025-01-10" }
    ],
    score: {
      engagement_score: 9.2,
      reach_score: 8.1,
      quality_score: 9.5,
      cost_score: 8.8,
      advocacy_score: null,
      composite: 9.1
    },
    content: [
      {
        id: "c1",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "watsonx.ai",
        post_date: "2024-11-15",
        permalink: "https://youtube.com/watch?v=priya_watsonx_001",
        views: 87400,
        engagement_rate: 4.05,
        clicks: 3200,
        ibm_partner_confirmed: true,
        title: "I built an enterprise AI app with IBM watsonx in 1 hour"
      },
      {
        id: "c2",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-08-22",
        permalink: "https://youtube.com/watch?v=priya_ibmcloud_002",
        views: 54200,
        engagement_rate: 3.82,
        clicks: 1900,
        ibm_partner_confirmed: true,
        title: "Deploying ML models on IBM Cloud — full walkthrough #IBMPartner"
      },
      {
        id: "c1b",
        platform: "LinkedIn",
        content_type: "post",
        ibm_product_tag: "Granite 4.0",
        post_date: "2025-01-08",
        permalink: "https://linkedin.com/posts/priya-sharma-dev-granite",
        views: 14200,
        engagement_rate: 6.1,
        clicks: 820,
        ibm_partner_confirmed: true,
        title: "Why Granite 4.0 is the model I'm recommending to every enterprise team right now #IBMPartner"
      }
    ],
    feedback: [
      { id: "f1", author: "Sarah K.", team: "campaign", body: "Excellent turnaround time. Content aligned perfectly with brief. Comments section was overwhelmingly positive about the watsonx demo quality.", created_at: "2024-11-20" },
      { id: "f2", author: "Dev Rel Team", team: "devrel", body: "Technically rigorous. Actually ran the models live — no vibe-coding. Audience trust is high. Recommend for Granite 4.0 launch.", created_at: "2024-11-22" }
    ]
  },
  {
    id: "2",
    name: "Jordan Riley",
    type: "external",
    persona_group: "Media / Content Creator (Podcast, YouTube)",
    location: "Austin, TX",
    bio: "Full-stack developer and content creator blending lifestyle content with practical coding tutorials. Known for aesthetic dev setup content and accessible explanations.",
    campaign_rationale: "Broad reach with younger developer demographic. Good for IBM Cloud awareness campaigns and tools adoption among indie developers.",
    status: "active",
    approval_status: "approved",
    owner: "Tanya Osei",
    last_collaborated: "2024-09-10",
    rate: "$4,200 per post",
    events: ["SXSW", "Dreamforce", "IBM Accelerate"],
    campaign_types: ["AI for Business", "Hybrid Cloud"],
    platforms: [
      { platform: "TikTok", handle: "@jordancodes", follower_count: 312000, updated_at: "2025-01-08" },
      { platform: "Instagram", handle: "@jordanriley.dev", follower_count: 89000, updated_at: "2025-01-08" },
      { platform: "YouTube", handle: "@jordanrileydev", follower_count: 67500, updated_at: "2025-01-08" }
    ],
    score: {
      engagement_score: 7.8,
      reach_score: 9.1,
      quality_score: 6.5,
      cost_score: 7.2,
      advocacy_score: null,
      composite: 7.7
    },
    content: [
      {
        id: "c3",
        platform: "TikTok",
        content_type: "video",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-09-10",
        permalink: "https://tiktok.com/@jordancodes/ibmcloud",
        views: 218000,
        engagement_rate: 6.2,
        clicks: null,
        ibm_partner_confirmed: true,
        title: "IBM Cloud setup in 60 seconds #IBMPartner"
      },
      {
        id: "c3b",
        platform: "Instagram",
        content_type: "reel",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-09-12",
        permalink: "https://instagram.com/reel/jordanriley_ibmcloud",
        views: 94000,
        engagement_rate: 5.8,
        clicks: null,
        ibm_partner_confirmed: true,
        title: "The cleanest cloud dashboard I've ever used — IBM Cloud #IBMPartner"
      }
    ],
    feedback: [
      { id: "f3", author: "Marcus Lee", team: "campaign", body: "Great reach numbers. Content was lighter on technical depth than we hoped but drove strong top-of-funnel awareness. Good for IBM brand, less ideal for product-specific campaigns.", created_at: "2024-09-18" }
    ]
  },
  {
    id: "3",
    name: "Dr. Amara Okonkwo",
    type: "external",
    persona_group: "Thought Leader (Author, Speaker, Analyst)",
    location: "London, UK",
    bio: "AI researcher and public technologist. Published author on responsible AI. Speaks at enterprise conferences. LinkedIn-dominant with occasional YouTube long-form.",
    campaign_rationale: "Strong enterprise credibility. Ideal for thought leadership campaigns around IBM AI governance and watsonx trust angle. European market reach.",
    status: "active",
    approval_status: "approved",
    owner: "Marcus Lee",
    last_collaborated: "2024-10-30",
    rate: "$12,000 per campaign",
    events: ["VivaTech", "AI Summit Korea", "SIBOS"],
    campaign_types: ["Cross-Geo", "AI for Business"],
    platforms: [
      { platform: "LinkedIn", handle: "dr-amara-okonkwo", follower_count: 94000, updated_at: "2025-01-05" },
      { platform: "YouTube", handle: "@amaraonai", follower_count: 31200, updated_at: "2025-01-05" },
      { platform: "X", handle: "@amara_on_ai", follower_count: 52000, updated_at: "2025-01-05" }
    ],
    score: {
      engagement_score: 8.8,
      reach_score: 7.9,
      quality_score: 9.8,
      cost_score: 6.1,
      advocacy_score: null,
      composite: 8.3
    },
    content: [
      {
        id: "c4",
        platform: "LinkedIn",
        content_type: "post",
        ibm_product_tag: "watsonx.governance",
        post_date: "2024-10-30",
        permalink: "https://linkedin.com/posts/dr-amara-okonkwo-ibmpartner",
        views: 42000,
        engagement_rate: 5.1,
        clicks: 1100,
        ibm_partner_confirmed: true,
        title: "Why IBM's approach to AI governance is the one enterprises should adopt #IBMPartner"
      },
      {
        id: "c5",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "watsonx.ai",
        post_date: "2024-07-14",
        permalink: "https://youtube.com/watch?v=amara_watsonx_gov",
        views: 28900,
        engagement_rate: 4.7,
        clicks: 890,
        ibm_partner_confirmed: true,
        title: "Responsible AI in the enterprise — watsonx.governance deep dive #IBMPartner"
      },
      {
        id: "c5b",
        platform: "X",
        content_type: "thread",
        ibm_product_tag: "watsonx.governance",
        post_date: "2024-09-03",
        permalink: "https://x.com/amara_on_ai/status/ibm_thread_001",
        views: 31000,
        engagement_rate: 7.2,
        clicks: 940,
        ibm_partner_confirmed: true,
        title: "Thread: The 5 things enterprise leaders still get wrong about AI governance (and how IBM fixes them) #IBMPartner"
      }
    ],
    feedback: [
      { id: "f4", author: "Dev Rel Team", team: "devrel", body: "World-class credibility. Audience is CxO and senior engineering level. Comments consistently reference trust in IBM AI after her content. Premium cost justified by quality.", created_at: "2024-11-02" }
    ]
  },
  {
    id: "4",
    name: "Kenji Watanabe",
    type: "external",
    persona_group: "Developer / Engineer",
    location: "Tokyo, Japan",
    bio: "Software engineer specializing in Java and cloud-native development. Creates bilingual (JP/EN) tutorial content. Strong APAC developer audience.",
    campaign_rationale: "Java developer focus — strong fit for IBM WebSphere and cloud-native modernization campaigns. Underutilized APAC channel.",
    status: "dormant",
    approval_status: "pending",
    owner: "Tanya Osei",
    last_collaborated: "2023-12-01",
    rate: "$3,100 per video",
    events: ["IBM TechXchange", "AWS re:Invent"],
    campaign_types: ["Hybrid Cloud", "Automation / webMethods"],
    platforms: [
      { platform: "YouTube", handle: "@kenjijava", follower_count: 48200, updated_at: "2024-11-20" },
      { platform: "X", handle: "@kenjijava", follower_count: 12800, updated_at: "2024-11-20" }
    ],
    score: {
      engagement_score: 6.9,
      reach_score: 5.8,
      quality_score: 7.2,
      cost_score: 8.9,
      advocacy_score: null,
      composite: 7.0
    },
    content: [
      {
        id: "c6",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "IBM Cloud",
        post_date: "2023-12-01",
        permalink: "https://youtube.com/watch?v=kenji_ibm_java",
        views: 19400,
        engagement_rate: 3.1,
        clicks: 620,
        ibm_partner_confirmed: true,
        title: "Java microservices on IBM Cloud — step by step #IBMPartner"
      }
    ],
    feedback: []
  },
  {
    id: "5",
    name: "Zoe Mensah",
    type: "external",
    persona_group: "Entrepreneur / Founder",
    location: "Accra, Ghana",
    bio: "Tech entrepreneur and DEI advocate. Covers AI democratization, developer tools for emerging markets, and building in Africa. Strong community following.",
    campaign_rationale: "Unique reach into African developer ecosystem. Authentic Change Maker voice. Ideal for IBM's AI democratization and skills campaigns.",
    status: "active",
    approval_status: "approved",
    owner: "Marcus Lee",
    last_collaborated: "2025-01-05",
    rate: "$2,800 per post",
    events: ["IBM Think", "NRF", "Mobile World Congress"],
    campaign_types: ["AI for Business", "Cross-Geo"],
    platforms: [
      { platform: "YouTube", handle: "@zoemenah", follower_count: 28900, updated_at: "2025-01-06" },
      { platform: "Instagram", handle: "@zoemenah.tech", follower_count: 41000, updated_at: "2025-01-06" },
      { platform: "LinkedIn", handle: "zoe-mensah-tech", follower_count: 19800, updated_at: "2025-01-06" },
      { platform: "TikTok", handle: "@zoemenah", follower_count: 87000, updated_at: "2025-01-06" }
    ],
    score: {
      engagement_score: 9.4,
      reach_score: 6.2,
      quality_score: 8.7,
      cost_score: 9.6,
      advocacy_score: null,
      composite: 8.7
    },
    content: [
      {
        id: "c7",
        platform: "Instagram",
        content_type: "reel",
        ibm_product_tag: "watsonx.ai",
        post_date: "2025-01-05",
        permalink: "https://instagram.com/reel/zoemenah_watsonx",
        views: 62000,
        engagement_rate: 8.3,
        clicks: null,
        ibm_partner_confirmed: true,
        title: "AI tools that are actually changing what's possible for African developers #IBMPartner"
      },
      {
        id: "c7b",
        platform: "TikTok",
        content_type: "video",
        ibm_product_tag: "watsonx.ai",
        post_date: "2024-11-18",
        permalink: "https://tiktok.com/@zoemenah/watsonx_demo",
        views: 104000,
        engagement_rate: 9.1,
        clicks: null,
        ibm_partner_confirmed: true,
        title: "I gave 50 developers in Accra access to IBM watsonx. Here's what they built. #IBMPartner"
      }
    ],
    feedback: [
      { id: "f5", author: "Sarah K.", team: "campaign", body: "Highest engagement rate in the entire roster. Authentic storytelling — doesn't feel sponsored. Reel comment section was full of genuine developer questions about watsonx.", created_at: "2025-01-08" }
    ]
  },
  {
    id: "6",
    name: "Tyler Reeves",
    type: "external",
    persona_group: "Media / Content Creator (Podcast, YouTube)",
    location: "New York, NY",
    bio: "Former startup CTO turned developer content creator. Covers SaaS tools, productivity stacks, and AI integration. Heavy YouTube and X presence.",
    campaign_rationale: "Good IBM Cloud fit. Prior campaign completed on time with strong metrics. However, recent posts have included competitor brand mentions.",
    status: "dormant",
    approval_status: "declined",
    owner: "Tanya Osei",
    last_collaborated: "2024-03-22",
    rate: "$6,500 per video",
    events: ["Dreamforce", "Gartner Data & Analytics"],
    campaign_types: ["AI for Business"],
    platforms: [
      { platform: "YouTube", handle: "@tylerreevestech", follower_count: 198000, updated_at: "2024-12-01" },
      { platform: "X", handle: "@tylerreeves", follower_count: 43200, updated_at: "2024-12-01" }
    ],
    score: {
      engagement_score: 5.8,
      reach_score: 7.4,
      quality_score: 4.2,
      cost_score: 5.1,
      advocacy_score: null,
      composite: 5.6
    },
    content: [
      {
        id: "c8",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-03-22",
        permalink: "https://youtube.com/watch?v=tyler_ibmcloud",
        views: 41000,
        engagement_rate: 2.8,
        clicks: 880,
        ibm_partner_confirmed: true,
        title: "Honest review: IBM Cloud vs the competition #IBMPartner"
      }
    ],
    feedback: [
      { id: "f6", author: "Dev Rel Team", team: "devrel", body: "Content was technically weak. Compared IBM unfavorably to AWS in the same video after the sponsored segment. Do not re-engage without explicit content approval clauses.", created_at: "2024-04-01" }
    ]
  },
  {
    id: "7",
    name: "Aaliya Fernandez",
    type: "internal",
    persona_group: "Developer / Engineer",
    location: "Austin, TX",
    bio: "IBM Developer Advocate with 4 years experience. Specializes in Kubernetes, OpenShift, and IBM Cloud Paks. Regular speaker at KubeCon and IBM Think.",
    campaign_rationale: "Internal advocate with deep technical credibility. Ideal anchor voice for enterprise developer campaigns — pairs well with external creators.",
    status: "active",
    approval_status: "approved",
    owner: "IBM Dev Rel",
    last_collaborated: "2025-01-10",
    rate: null,
    events: ["KubeCon", "IBM Think", "IBM TechXchange"],
    campaign_types: ["Hybrid Cloud", "Automation / webMethods"],
    platforms: [
      { platform: "YouTube", handle: "@aaliyaibm", follower_count: 19800, updated_at: "2025-01-11" },
      { platform: "LinkedIn", handle: "aaliya-fernandez-ibm", follower_count: 14200, updated_at: "2025-01-11" },
      { platform: "X", handle: "@aaliyaibm", follower_count: 9800, updated_at: "2025-01-11" }
    ],
    score: {
      engagement_score: 8.1,
      reach_score: 5.2,
      quality_score: 9.4,
      cost_score: null,
      advocacy_score: 9.1,
      composite: 8.2
    },
    content: [
      {
        id: "c9",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "Red Hat OpenShift",
        post_date: "2025-01-10",
        permalink: "https://youtube.com/watch?v=aaliya_openshift",
        views: 8400,
        engagement_rate: 5.8,
        clicks: 340,
        ibm_partner_confirmed: false,
        title: "OpenShift on IBM Cloud — zero to production in 30 minutes"
      },
      {
        id: "c9b",
        platform: "LinkedIn",
        content_type: "post",
        ibm_product_tag: "watsonx.ai",
        post_date: "2024-12-05",
        permalink: "https://linkedin.com/posts/aaliya-fernandez-ibm-watsonx",
        views: 5200,
        engagement_rate: 7.3,
        clicks: 190,
        ibm_partner_confirmed: false,
        title: "What it actually feels like to build with watsonx.ai from the inside — dev advocate perspective"
      }
    ],
    feedback: [
      { id: "f7", author: "Dev Rel Team", team: "devrel", body: "Consistently highest technical depth in internal roster. Trusted voice in OpenShift community. Prioritize for enterprise modernization content.", created_at: "2025-01-12" }
    ]
  },
  {
    id: "8",
    name: "Marcus Webb",
    type: "internal",
    persona_group: "Thought Leader (Author, Speaker, Analyst)",
    location: "New York, NY",
    bio: "IBM Distinguished Engineer and public speaker on AI strategy and the future of enterprise software. Published in Harvard Business Review. Keynote presence.",
    campaign_rationale: "IBM's most credible internal voice for executive and C-suite audience content. Think Magazine contributor and conference keynote speaker.",
    status: "active",
    approval_status: "approved",
    owner: "IBM Dev Rel",
    last_collaborated: "2025-01-08",
    rate: null,
    events: ["IBM Think", "Gartner Data & Analytics", "SIBOS"],
    campaign_types: ["AI for Business", "Security"],
    platforms: [
      { platform: "LinkedIn", handle: "marcus-webb-ibm", follower_count: 112000, updated_at: "2025-01-09" },
      { platform: "X", handle: "@marcuswebb_ibm", follower_count: 38400, updated_at: "2025-01-09" }
    ],
    score: {
      engagement_score: 7.9,
      reach_score: 8.8,
      quality_score: 9.7,
      cost_score: null,
      advocacy_score: 8.5,
      composite: 8.8
    },
    content: [
      {
        id: "c8b",
        platform: "LinkedIn",
        content_type: "post",
        ibm_product_tag: "watsonx.ai",
        post_date: "2025-01-08",
        permalink: "https://linkedin.com/posts/marcus-webb-ibm-ai-2025",
        views: 88000,
        engagement_rate: 6.4,
        clicks: 2200,
        ibm_partner_confirmed: false,
        title: "The enterprise AI inflection point is here. Here's what IBM sees that others don't."
      }
    ],
    feedback: []
  },
  {
    id: "9",
    name: "Valentina Cruz",
    type: "external",
    persona_group: "Data & AI Specialist",
    location: "Mexico City, Mexico",
    bio: "Python and data engineering educator creating bilingual (ES/EN) content. Strong following across LATAM developer community. Focus on practical ML pipelines.",
    campaign_rationale: "Untapped LATAM reach with highly engaged technical audience. Strong Python/data engineering profile — ideal for watsonx.data and IBM Cloud Pak for Data campaigns.",
    status: "active",
    approval_status: "approved",
    owner: "Marcus Lee",
    last_collaborated: "2025-01-12",
    rate: "$3,800 per video",
    events: ["IBM Accelerate", "SXSW", "NY Tech Week"],
    campaign_types: ["Granite / Developer", "Cross-Geo"],
    platforms: [
      { platform: "YouTube", handle: "@valentinacode", follower_count: 96000, updated_at: "2025-01-12" },
      { platform: "Instagram", handle: "@valentinacode", follower_count: 38000, updated_at: "2025-01-12" },
      { platform: "LinkedIn", handle: "valentina-cruz-data", follower_count: 22400, updated_at: "2025-01-12" }
    ],
    score: {
      engagement_score: 8.9,
      reach_score: 7.1,
      quality_score: 9.0,
      cost_score: 9.2,
      advocacy_score: null,
      composite: 8.6
    },
    content: [
      {
        id: "c10",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "watsonx.data",
        post_date: "2025-01-12",
        permalink: "https://youtube.com/watch?v=valentina_watsonxdata",
        views: 48300,
        engagement_rate: 5.4,
        clicks: 2100,
        ibm_partner_confirmed: true,
        title: "watsonx.data en 20 minutos — la plataforma de datos empresariales que no conocías #IBMPartner"
      },
      {
        id: "c10b",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-10-05",
        permalink: "https://youtube.com/watch?v=valentina_ibmcloud_pipelines",
        views: 31200,
        engagement_rate: 4.9,
        clicks: 1340,
        ibm_partner_confirmed: true,
        title: "Building production ML pipelines on IBM Cloud — full Python walkthrough #IBMPartner"
      },
      {
        id: "c10c",
        platform: "Instagram",
        content_type: "reel",
        ibm_product_tag: "watsonx.ai",
        post_date: "2025-01-14",
        permalink: "https://instagram.com/reel/valentinacode_watsonx",
        views: 21000,
        engagement_rate: 7.8,
        clicks: null,
        ibm_partner_confirmed: true,
        title: "5 razones para probar watsonx.ai si eres data engineer #IBMPartner"
      }
    ],
    feedback: [
      { id: "f9", author: "Tanya Osei", team: "campaign", body: "First LATAM creator in the roster. Engaged audience with very high comment quality — technical questions, not just reactions. Strong for watsonx.data expansion push.", created_at: "2025-01-15" }
    ]
  },
  {
    id: "10",
    name: "Ravi Nair",
    type: "external",
    persona_group: "Developer / Engineer",
    location: "Bangalore, India",
    bio: "Developer community builder and open-source evangelist. Runs India's largest cloud-native meetup series. YouTube and LinkedIn content focused on practical DevOps.",
    campaign_rationale: "Deep India developer ecosystem reach. Meetup influence amplifies content beyond digital metrics. Strong fit for IBM Cloud and OpenShift adoption campaigns in APAC.",
    status: "active",
    approval_status: "approved",
    owner: "Tanya Osei",
    last_collaborated: "2024-12-20",
    rate: "$2,400 per post",
    events: ["KubeCon", "IBM TechXchange", "AWS re:Invent"],
    campaign_types: ["Hybrid Cloud", "Automation / webMethods"],
    platforms: [
      { platform: "YouTube", handle: "@ravinairdev", follower_count: 58000, updated_at: "2024-12-22" },
      { platform: "LinkedIn", handle: "ravi-nair-devops", follower_count: 47000, updated_at: "2024-12-22" },
      { platform: "Reddit", handle: "u/ravinairdev", follower_count: 12400, updated_at: "2024-12-22" }
    ],
    score: {
      engagement_score: 8.4,
      reach_score: 6.8,
      quality_score: 8.2,
      cost_score: 9.5,
      advocacy_score: null,
      composite: 8.2
    },
    content: [
      {
        id: "c11",
        platform: "YouTube",
        content_type: "video",
        ibm_product_tag: "Red Hat OpenShift",
        post_date: "2024-12-20",
        permalink: "https://youtube.com/watch?v=ravi_openshift_india",
        views: 34100,
        engagement_rate: 5.1,
        clicks: 1480,
        ibm_partner_confirmed: true,
        title: "How Indian startups are using Red Hat OpenShift on IBM Cloud — real examples #IBMPartner"
      },
      {
        id: "c11b",
        platform: "LinkedIn",
        content_type: "post",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-11-08",
        permalink: "https://linkedin.com/posts/ravi-nair-devops-ibmcloud",
        views: 26000,
        engagement_rate: 8.7,
        clicks: 1020,
        ibm_partner_confirmed: true,
        title: "I ran a 200-person cloud-native workshop using IBM Cloud. Here's the honest verdict. #IBMPartner"
      }
    ],
    feedback: [
      { id: "f10", author: "Sarah K.", team: "campaign", body: "Community multiplier effect is real — workshop attendees continue engaging with IBM Cloud content weeks later. Strong ROI case even at lower follower counts.", created_at: "2024-12-22" },
      { id: "f10b", author: "Dev Rel Team", team: "devrel", body: "Good technical credibility with DevOps audience. OpenShift content was accurate and detailed. Recommend pairing with Aaliya for a joint campaign targeting APAC enterprise.", created_at: "2024-12-28" }
    ]
  },
  {
    id: "11",
    name: "Chloe Beaumont",
    type: "external",
    persona_group: "Thought Leader (Author, Speaker, Analyst)",
    location: "Paris, France",
    bio: "AI ethicist and product strategist. Creates thought-provoking content on AI's impact on work, society, and enterprise transformation. Strong European executive audience.",
    campaign_rationale: "Complements Dr. Okonkwo's reach with a French/EU audience skewing more toward product executives and AI policy. Strong for watsonx.governance EU compliance angle.",
    status: "active",
    approval_status: "pending",
    owner: "Marcus Lee",
    last_collaborated: null,
    rate: "$7,200 per campaign",
    events: ["VivaTech", "Dreamforce"],
    campaign_types: ["Security", "Cross-Geo"],
    platforms: [
      { platform: "LinkedIn", handle: "chloe-beaumont-ai", follower_count: 71000, updated_at: "2025-01-10" },
      { platform: "YouTube", handle: "@chloebeaumont", follower_count: 24500, updated_at: "2025-01-10" },
      { platform: "X", handle: "@chloebeaumont_ai", follower_count: 29000, updated_at: "2025-01-10" }
    ],
    score: {
      engagement_score: 8.1,
      reach_score: 7.3,
      quality_score: 9.3,
      cost_score: 7.0,
      advocacy_score: null,
      composite: 8.0
    },
    content: [],
    feedback: [
      { id: "f11", author: "Marcus Lee", team: "campaign", body: "Approval pending legal review. Strong profile for EU AI Act angle — watsonx.governance compliance content could be timely. First campaign not yet started.", created_at: "2025-01-11" }
    ]
  },
  {
    id: "12",
    name: "Devon Park",
    type: "internal",
    persona_group: "Media / Content Creator (Podcast, YouTube)",
    location: "San Jose, CA",
    bio: "IBM Software Engineer on the Watson Speech team. Creates casual, behind-the-scenes content about working at IBM and building AI products. Strong Gen Z developer following.",
    campaign_rationale: "Authentic IBM employee voice for developer recruiting and product awareness. Lifestyle Coder style resonates with early-career developers — strong IBM employer brand asset.",
    status: "active",
    approval_status: "approved",
    owner: "IBM Dev Rel",
    last_collaborated: "2025-01-14",
    rate: null,
    events: ["IBM Think", "IBM Accelerate"],
    campaign_types: ["Granite / Developer", "AI for Business"],
    platforms: [
      { platform: "TikTok", handle: "@devonparkibm", follower_count: 44000, updated_at: "2025-01-14" },
      { platform: "Instagram", handle: "@devonpark.ibm", follower_count: 18200, updated_at: "2025-01-14" },
      { platform: "YouTube", handle: "@devonparkibm", follower_count: 12800, updated_at: "2025-01-14" }
    ],
    score: {
      engagement_score: 8.6,
      reach_score: 5.9,
      quality_score: 7.8,
      cost_score: null,
      advocacy_score: 8.9,
      composite: 8.1
    },
    content: [
      {
        id: "c12",
        platform: "TikTok",
        content_type: "video",
        ibm_product_tag: "watsonx.ai",
        post_date: "2025-01-14",
        permalink: "https://tiktok.com/@devonparkibm/day_in_life",
        views: 78000,
        engagement_rate: 9.4,
        clicks: null,
        ibm_partner_confirmed: false,
        title: "Day in my life as an IBM AI engineer — what I actually built this week"
      },
      {
        id: "c12b",
        platform: "Instagram",
        content_type: "reel",
        ibm_product_tag: "IBM Cloud",
        post_date: "2024-12-10",
        permalink: "https://instagram.com/reel/devonpark_ibm_intern",
        views: 29000,
        engagement_rate: 8.1,
        clicks: null,
        ibm_partner_confirmed: false,
        title: "Things I wish I knew before joining IBM as a software engineer"
      }
    ],
    feedback: [
      { id: "f12", author: "Dev Rel Team", team: "devrel", body: "Unexpectedly strong performance for an internal creator. TikTok audience is highly engaged — comments are mostly career questions and genuine curiosity about IBM. Good employer brand multiplier.", created_at: "2025-01-15" }
    ]
  }
];

module.exports = influencers;
