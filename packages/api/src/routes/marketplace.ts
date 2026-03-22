import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';

interface MarketplaceQuerystring {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  sort?: string;
}

interface MarketplaceParams {
  skillId: string;
}

// ── Mock community skills ───────────────────────────
const COMMUNITY_SKILLS = [
  {
    id: 'mkt_001', name: 'GPT Prompt Optimizer', slug: 'gpt-prompt-optimizer',
    description: 'Automatically optimizes and refines your prompts for better LLM output quality. Supports chain-of-thought, few-shot, and instruction tuning patterns.',
    author: { name: 'PromptLab', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=PL' },
    category: 'AI / ML', tags: ['prompt', 'optimization', 'gpt'], version: '1.2.0',
    downloads: 3420, rating: 4.8, totalRatings: 156, isVerified: true,
    createdAt: '2025-11-10T08:00:00Z', updatedAt: '2026-03-15T12:00:00Z',
  },
  {
    id: 'mkt_002', name: 'Kubernetes Deployer', slug: 'kubernetes-deployer',
    description: 'Generates Kubernetes manifests, Helm charts, and CI/CD pipeline configurations from natural language descriptions of your desired infrastructure.',
    author: { name: 'CloudCraft', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=CC' },
    category: 'DevOps', tags: ['k8s', 'helm', 'deployment'], version: '2.0.1',
    downloads: 2180, rating: 4.6, totalRatings: 89, isVerified: true,
    createdAt: '2025-12-01T10:00:00Z', updatedAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'mkt_003', name: 'Blog Post Generator', slug: 'blog-post-generator',
    description: 'Creates SEO-optimized blog posts with proper heading hierarchy, meta descriptions, and internal linking suggestions. Supports multiple tones and niches.',
    author: { name: 'ContentAI', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=CA' },
    category: 'Writing', tags: ['blog', 'seo', 'content'], version: '1.5.0',
    downloads: 5670, rating: 4.4, totalRatings: 234, isVerified: true,
    createdAt: '2025-10-15T12:00:00Z', updatedAt: '2026-02-28T14:00:00Z',
  },
  {
    id: 'mkt_004', name: 'SQL Query Builder', slug: 'sql-query-builder',
    description: 'Converts natural language questions into optimized SQL queries. Supports PostgreSQL, MySQL, and SQLite with automatic JOIN detection and index hints.',
    author: { name: 'DataForge', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=DF' },
    category: 'Data', tags: ['sql', 'database', 'query'], version: '3.1.0',
    downloads: 4890, rating: 4.9, totalRatings: 312, isVerified: true,
    createdAt: '2025-09-20T08:00:00Z', updatedAt: '2026-03-18T11:00:00Z',
  },
  {
    id: 'mkt_005', name: 'Penetration Test Report', slug: 'pentest-report',
    description: 'Generates professional penetration testing reports from scan results and findings. Includes CVSS scoring, remediation steps, and executive summaries.',
    author: { name: 'SecOps.ai', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=SO' },
    category: 'Security', tags: ['pentest', 'security', 'report'], version: '1.0.3',
    downloads: 1230, rating: 4.7, totalRatings: 67, isVerified: false,
    createdAt: '2026-01-05T09:00:00Z', updatedAt: '2026-03-12T15:00:00Z',
  },
  {
    id: 'mkt_006', name: 'Social Media Calendar', slug: 'social-media-calendar',
    description: 'Plans and generates a month of social media content across platforms. Adapts tone for LinkedIn, Twitter/X, Instagram, and TikTok with hashtag research.',
    author: { name: 'GrowthKit', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=GK' },
    category: 'Marketing', tags: ['social-media', 'content-calendar', 'marketing'], version: '1.3.0',
    downloads: 2890, rating: 4.3, totalRatings: 145, isVerified: true,
    createdAt: '2025-11-20T14:00:00Z', updatedAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 'mkt_007', name: 'UI Component Generator', slug: 'ui-component-generator',
    description: 'Generates production-ready React/Vue/Svelte components from design descriptions. Includes accessibility, responsive breakpoints, and animation presets.',
    author: { name: 'DesignDev', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=DD' },
    category: 'Design', tags: ['ui', 'react', 'components'], version: '2.2.0',
    downloads: 3750, rating: 4.5, totalRatings: 198, isVerified: true,
    createdAt: '2025-10-01T11:00:00Z', updatedAt: '2026-03-20T08:00:00Z',
  },
  {
    id: 'mkt_008', name: 'Test Suite Generator', slug: 'test-suite-generator',
    description: 'Analyzes source code and generates comprehensive test suites with unit, integration, and e2e tests. Supports Jest, Vitest, Playwright, and Cypress.',
    author: { name: 'TestCraft', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=TC' },
    category: 'Engineering', tags: ['testing', 'jest', 'vitest', 'e2e'], version: '1.8.0',
    downloads: 4120, rating: 4.6, totalRatings: 267, isVerified: true,
    createdAt: '2025-10-25T09:00:00Z', updatedAt: '2026-03-19T13:00:00Z',
  },
  {
    id: 'mkt_009', name: 'Customer Support Agent', slug: 'customer-support-agent',
    description: 'Handles common customer support queries with empathetic, professional responses. Integrates knowledge base lookups and ticket escalation flows.',
    author: { name: 'HelpDesk AI', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=HD' },
    category: 'Support', tags: ['support', 'customer-service', 'helpdesk'], version: '1.1.0',
    downloads: 1890, rating: 4.2, totalRatings: 98, isVerified: false,
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-03-08T16:00:00Z',
  },
  {
    id: 'mkt_010', name: 'API Rate Limiter Config', slug: 'api-rate-limiter-config',
    description: 'Generates optimal rate limiting configurations for REST and GraphQL APIs. Supports Redis, in-memory, and distributed token bucket algorithms.',
    author: { name: 'APISec', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=AS' },
    category: 'Engineering', tags: ['api', 'rate-limiting', 'security'], version: '1.0.0',
    downloads: 980, rating: 4.4, totalRatings: 45, isVerified: false,
    createdAt: '2026-02-01T08:00:00Z', updatedAt: '2026-03-01T12:00:00Z',
  },
  {
    id: 'mkt_011', name: 'Data Visualization Advisor', slug: 'data-viz-advisor',
    description: 'Recommends the best chart types and visualization strategies for your datasets. Generates D3.js, Chart.js, or Recharts code with proper styling.',
    author: { name: 'VizFlow', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=VF' },
    category: 'Data', tags: ['visualization', 'd3', 'charts'], version: '1.4.0',
    downloads: 2340, rating: 4.7, totalRatings: 123, isVerified: true,
    createdAt: '2025-12-10T11:00:00Z', updatedAt: '2026-03-14T09:00:00Z',
  },
  {
    id: 'mkt_012', name: 'Terraform Module Builder', slug: 'terraform-module-builder',
    description: 'Creates reusable Terraform modules with best practices for AWS, GCP, and Azure. Includes variable validation, output definitions, and README generation.',
    author: { name: 'InfraCode', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=IC' },
    category: 'DevOps', tags: ['terraform', 'iac', 'cloud'], version: '2.1.0',
    downloads: 3100, rating: 4.8, totalRatings: 178, isVerified: true,
    createdAt: '2025-11-01T08:00:00Z', updatedAt: '2026-03-16T14:00:00Z',
  },
];

export async function marketplaceRoutes(app: FastifyInstance) {
  // ── GET /marketplace ──────────────────────────────
  app.get<{ Querystring: MarketplaceQuerystring }>(
    '/marketplace',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const {
        page = '1',
        limit = '20',
        search,
        category,
        sort = 'downloads',
      } = request.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      let filtered = [...COMMUNITY_SKILLS];

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)),
        );
      }

      if (category && category !== 'All') {
        filtered = filtered.filter((s) => s.category === category);
      }

      // Sort
      filtered.sort((a, b) => {
        switch (sort) {
          case 'rating':
            return b.rating - a.rating;
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'downloads':
          default:
            return b.downloads - a.downloads;
        }
      });

      const total = filtered.length;
      const start = (pageNum - 1) * limitNum;
      const paged = filtered.slice(start, start + limitNum);

      return reply.success({
        skills: paged.map((s) => ({ ...s, installStatus: 'available' })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    },
  );

  // ── POST /marketplace/:skillId/install ─────────────
  app.post<{ Params: MarketplaceParams }>(
    '/marketplace/:skillId/install',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { skillId } = request.params;

      request.log.info(
        { tenantId: request.user.tenantId, skillId },
        'Installing marketplace skill',
      );

      // Stub: In production copies skill to user's workspace
      return reply.success({ installed: true, skillId });
    },
  );
}
