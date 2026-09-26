import type { Express, RequestHandler, Response } from "express";
import { z, ZodError } from "zod";
import {
  DEAL_STAGES,
  LEAD_STATUSES,
  createDealSchema,
  createLeadSchema,
  createTaskSchema,
  updateDealSchema,
  updateLeadSchema,
  updateTaskSchema,
  type CrmIntegrationStatus,
} from "@shared/crm";
import { CrmReferenceError, type CrmRepository } from "./repository";

/**
 * CRM REST API under /api/crm. The tenant is ALWAYS the signed-in user
 * (req.user.claims.sub) - never an id from the URL or body - and every
 * repository call is scoped to it, so another workspace's rows read as 404.
 */

type Deps = {
  repo: CrmRepository;
  isAuthenticated: RequestHandler;
  /** Live status of real integrations for this user (WhatsApp today). */
  getIntegrations: (userId: string) => Promise<CrmIntegrationStatus[]>;
};

const listLeadsQuery = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  search: z.string().max(200).optional(),
});
const listDealsQuery = z.object({ stage: z.enum(DEAL_STAGES).optional() });
const listTasksQuery = z.object({
  scope: z.enum(["follow_ups", "tasks", "all"]).default("all"),
  status: z.enum(["open", "done", "all"]).default("open"),
  leadId: z.string().max(64).optional(),
  dealId: z.string().max(64).optional(),
});

function ownerOf(req: any): string {
  return req.user.claims.sub as string;
}

function handleError(res: Response, error: unknown, action: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.errors[0]?.message || "Invalid input", details: error.errors });
  }
  if (error instanceof CrmReferenceError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`[CRM] Failed to ${action}:`, error);
  return res.status(500).json({ error: `Failed to ${action}` });
}

export function registerCrmRoutes(app: Express, { repo, isAuthenticated, getIntegrations }: Deps) {
  const auth = isAuthenticated;

  /* ---------------------------------------------------------- dashboard */

  app.get("/api/crm/dashboard", auth, async (req, res) => {
    try {
      const owner = ownerOf(req);
      const integrations = await getIntegrations(owner);
      res.json(await repo.getDashboardSummary(owner, integrations));
    } catch (error) {
      handleError(res, error, "load dashboard");
    }
  });

  app.get("/api/crm/integrations", auth, async (req, res) => {
    try {
      res.json({ integrations: await getIntegrations(ownerOf(req)) });
    } catch (error) {
      handleError(res, error, "load integrations");
    }
  });

  /* -------------------------------------------------------------- leads */

  app.get("/api/crm/leads", auth, async (req, res) => {
    try {
      const query = listLeadsQuery.parse(req.query);
      res.json({ leads: await repo.listLeads(ownerOf(req), query) });
    } catch (error) {
      handleError(res, error, "list leads");
    }
  });

  app.post("/api/crm/leads", auth, async (req, res) => {
    try {
      const input = createLeadSchema.parse(req.body ?? {});
      res.status(201).json({ lead: await repo.createLead(ownerOf(req), input) });
    } catch (error) {
      handleError(res, error, "create lead");
    }
  });

  app.get("/api/crm/leads/:id", auth, async (req, res) => {
    try {
      const lead = await repo.getLead(ownerOf(req), String(req.params.id));
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json({ lead });
    } catch (error) {
      handleError(res, error, "load lead");
    }
  });

  app.patch("/api/crm/leads/:id", auth, async (req, res) => {
    try {
      const input = updateLeadSchema.parse(req.body ?? {});
      const lead = await repo.updateLead(ownerOf(req), String(req.params.id), input);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json({ lead });
    } catch (error) {
      handleError(res, error, "update lead");
    }
  });

  app.delete("/api/crm/leads/:id", auth, async (req, res) => {
    try {
      const deleted = await repo.deleteLead(ownerOf(req), String(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Lead not found" });
      res.status(204).send();
    } catch (error) {
      handleError(res, error, "delete lead");
    }
  });

  app.post("/api/crm/leads/:id/convert", auth, async (req, res) => {
    try {
      const deal = await repo.convertLeadToDeal(ownerOf(req), String(req.params.id));
      if (!deal) return res.status(404).json({ error: "Lead not found" });
      res.status(201).json({ deal });
    } catch (error) {
      handleError(res, error, "convert lead");
    }
  });

  /* -------------------------------------------------------------- deals */

  app.get("/api/crm/deals", auth, async (req, res) => {
    try {
      const query = listDealsQuery.parse(req.query);
      res.json({ deals: await repo.listDeals(ownerOf(req), query) });
    } catch (error) {
      handleError(res, error, "list deals");
    }
  });

  app.post("/api/crm/deals", auth, async (req, res) => {
    try {
      const input = createDealSchema.parse(req.body ?? {});
      res.status(201).json({ deal: await repo.createDeal(ownerOf(req), input) });
    } catch (error) {
      handleError(res, error, "create deal");
    }
  });

  app.patch("/api/crm/deals/:id", auth, async (req, res) => {
    try {
      const input = updateDealSchema.parse(req.body ?? {});
      const deal = await repo.updateDeal(ownerOf(req), String(req.params.id), input);
      if (!deal) return res.status(404).json({ error: "Deal not found" });
      res.json({ deal });
    } catch (error) {
      handleError(res, error, "update deal");
    }
  });

  app.delete("/api/crm/deals/:id", auth, async (req, res) => {
    try {
      const deleted = await repo.deleteDeal(ownerOf(req), String(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Deal not found" });
      res.status(204).send();
    } catch (error) {
      handleError(res, error, "delete deal");
    }
  });

  /* ------------------------------------------------ follow-ups & tasks */

  app.get("/api/crm/tasks", auth, async (req, res) => {
    try {
      const query = listTasksQuery.parse(req.query);
      res.json({ tasks: await repo.listTasks(ownerOf(req), query) });
    } catch (error) {
      handleError(res, error, "list tasks");
    }
  });

  app.post("/api/crm/tasks", auth, async (req, res) => {
    try {
      const input = createTaskSchema.parse(req.body ?? {});
      res.status(201).json({ task: await repo.createTask(ownerOf(req), input) });
    } catch (error) {
      handleError(res, error, "create task");
    }
  });

  app.patch("/api/crm/tasks/:id", auth, async (req, res) => {
    try {
      const input = updateTaskSchema.parse(req.body ?? {});
      const task = await repo.updateTask(ownerOf(req), String(req.params.id), input);
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json({ task });
    } catch (error) {
      handleError(res, error, "update task");
    }
  });

  app.delete("/api/crm/tasks/:id", auth, async (req, res) => {
    try {
      const deleted = await repo.deleteTask(ownerOf(req), String(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Task not found" });
      res.status(204).send();
    } catch (error) {
      handleError(res, error, "delete task");
    }
  });
}
