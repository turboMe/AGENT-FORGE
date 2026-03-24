import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { DecisionLog } from '../models/DecisionLog.js';

export async function analyticsRoutes(app: FastifyInstance) {
  // ── GET /analytics/overview ───────────────────────
  app.get(
    '/analytics/overview',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // We need to run parallel aggregations
      const [
        totalDecisionsCount,
        totalCostAgg,
        successAgg,
        skillsCreatedOverTime,
        retrievalHitRateAgg,
        topSkills,
        costOverTime
      ] = await Promise.all([
        // 1. Total Decisions
        DecisionLog.countDocuments({ tenantId }),

        // 2. Total Cost
        DecisionLog.aggregate([
          { $match: { tenantId } },
          { $group: { _id: null, totalCost: { $sum: "$costUsd" }, totalTokens: { $sum: "$tokens" } } }
        ]),

        // 3. Overall Success Rate
        DecisionLog.aggregate([
          { $match: { tenantId } },
          { $group: {
              _id: null,
              total: { $sum: 1 },
              success: { $sum: { $cond: ["$executionSuccess", 1, 0] } }
            }
          }
        ]),

        // 4. Skills Created Over Time (last 30 days)
        DecisionLog.aggregate([
          { $match: { tenantId, createdAt: { $gte: thirtyDaysAgo }, actionTaken: 'create_new' } },
          { $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id": 1 } }
        ]),

        // 5. Retrieval Hit Rate (last 30 days)
        DecisionLog.aggregate([
          { $match: { tenantId, createdAt: { $gte: thirtyDaysAgo } } },
          { $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              totalQueries: { $sum: 1 },
              hits: { $sum: { $cond: [{ $ne: ["$actionTaken", "reject"] }, 1, 0] } }
            }
          },
          { $sort: { "_id": 1 } }
        ]),

        // 6. Top Skills by Usage
        DecisionLog.aggregate([
          { $match: { 
              tenantId, 
              $or: [{ matchedSkillId: { $ne: null } }, { newSkillCreated: { $ne: null } }] 
            } 
          },
          { $project: { skillId: { $ifNull: ["$matchedSkillId", "$newSkillCreated"] }, executionSuccess: 1 } },
          { $group: {
              _id: "$skillId",
              useCount: { $sum: 1 },
              successCount: { $sum: { $cond: ["$executionSuccess", 1, 0] } }
            }
          },
          { $sort: { useCount: -1 } },
          { $limit: 10 }
        ]),

        // 7. Cost Over Time (last 30 days)
        DecisionLog.aggregate([
          { $match: { tenantId, createdAt: { $gte: thirtyDaysAgo } } },
          { $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              cost: { $sum: "$costUsd" },
              tokens: { $sum: "$tokens" }
            }
          },
          { $sort: { "_id": 1 } }
        ])
      ]);

      // Fill in blanks for dates (last 30 days) to ensure charts look continuous
      const generateDateSeries = () => {
        const series = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          series.push(d.toISOString().slice(0, 10));
        }
        return series;
      };

      const dateSeries = generateDateSeries();

      const formatSeries = (aggData: any[], valueMapper: (item: any) => any, defaultValues: any) => {
        const dataMap = new Map(aggData.map(item => [item._id, item]));
        return dateSeries.map(date => {
          const item = dataMap.get(date);
          return item ? { date, ...valueMapper(item) } : { date, ...defaultValues };
        });
      };

      const formattedSkillsCreated = formatSeries
        (skillsCreatedOverTime, item => ({ count: item.count }), { count: 0 });

      const formattedRetrievalHitRate = formatSeries
        (retrievalHitRateAgg, item => ({
          hitRate: item.totalQueries ? Math.round((item.hits / item.totalQueries) * 100) : 0,
          totalQueries: item.totalQueries
        }), { hitRate: 0, totalQueries: 0 });

      const formattedCostOverTime = formatSeries
        (costOverTime, item => ({
          cost: parseFloat(item.cost.toFixed(4)),
          tokens: item.tokens
        }), { cost: 0, tokens: 0 });

      const totals = {
        totalDecisions: totalDecisionsCount,
        totalSkills: topSkills.length, // Just using unique skills from usage as proxy
        avgHitRate: successAgg[0]?.total ? parseFloat(((successAgg[0].success / successAgg[0].total) * 100).toFixed(1)) : 0,
        totalCost: totalCostAgg[0]?.totalCost ? parseFloat(totalCostAgg[0].totalCost.toFixed(2)) : 0,
      };

      const formattedTopSkills = topSkills.map(t => ({
        name: t._id || 'Unknown Skill', // Will be slug/id for now
        useCount: t.useCount,
        satisfaction: parseFloat(((t.successCount / t.useCount) * 5).toFixed(1)) // Pseudo satisfaction scaled to 5
      }));

      return reply.success({
        skillsCreatedOverTime: formattedSkillsCreated,
        retrievalHitRate: formattedRetrievalHitRate,
        topSkills: formattedTopSkills,
        costOverTime: formattedCostOverTime,
        totals,
      });
    },
  );
}
