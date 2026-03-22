import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';

export async function analyticsRoutes(app: FastifyInstance) {
  // ── GET /analytics/overview ───────────────────────
  app.get(
    '/analytics/overview',
    {
      preHandler: [authenticate],
    },
    async (_request, reply) => {
      // Generate mock time-series data for the last 30 days
      const now = new Date();
      const skillsCreatedOverTime = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        return {
          date: d.toISOString().slice(0, 10),
          count: Math.floor(Math.random() * 5) + 1,
        };
      });

      const retrievalHitRate = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        return {
          date: d.toISOString().slice(0, 10),
          hitRate: Math.floor(Math.random() * 30) + 60,
          totalQueries: Math.floor(Math.random() * 50) + 20,
        };
      });

      const topSkills = [
        { name: 'Prompt Architect', useCount: 256, satisfaction: 4.9 },
        { name: 'Code Review Assistant', useCount: 198, satisfaction: 4.7 },
        { name: 'Cold Outreach Writer', useCount: 142, satisfaction: 4.6 },
        { name: 'API Doc Generator', useCount: 112, satisfaction: 4.5 },
        { name: 'Food Cost Analyst', useCount: 87, satisfaction: 4.8 },
        { name: 'SEO Optimizer', useCount: 76, satisfaction: 4.3 },
        { name: 'Business Coach', useCount: 63, satisfaction: 4.4 },
        { name: 'Security Scanner', useCount: 45, satisfaction: 4.1 },
        { name: 'Pipeline Designer', useCount: 34, satisfaction: 4.2 },
        { name: 'Test Generator', useCount: 28, satisfaction: 4.0 },
      ];

      const costOverTime = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (29 - i));
        return {
          date: d.toISOString().slice(0, 10),
          cost: parseFloat((Math.random() * 2.5 + 0.3).toFixed(2)),
          tokens: Math.floor(Math.random() * 50000) + 5000,
        };
      });

      const totalCost = costOverTime.reduce((sum, d) => sum + d.cost, 0);
      const avgHit =
        retrievalHitRate.reduce((sum, d) => sum + d.hitRate, 0) / retrievalHitRate.length;

      return reply.success({
        skillsCreatedOverTime,
        retrievalHitRate,
        topSkills,
        costOverTime,
        totals: {
          totalDecisions: 1247,
          totalSkills: 42,
          avgHitRate: parseFloat(avgHit.toFixed(1)),
          totalCost: parseFloat(totalCost.toFixed(2)),
        },
      });
    },
  );
}
