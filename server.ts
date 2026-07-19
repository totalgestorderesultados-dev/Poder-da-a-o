import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { Lead, AdminConfig, VerificationSession } from "./src/types.ts";

// Paths for JSON storage
const LEADS_FILE = path.join(process.cwd(), "leads.json");
const CONFIG_FILE = path.join(process.cwd(), "config.json");

// In-memory sessions store for OTC
const otcSessions = new Map<string, { code: string; expiresAt: number; name: string }>();

// Helper to read leads safely
async function readLeads(): Promise<Lead[]> {
  try {
    const data = await fs.readFile(LEADS_FILE, "utf-8");
    return JSON.parse(data) as Lead[];
  } catch (error) {
    return [];
  }
}

// Helper to write leads safely
async function writeLeads(leads: Lead[]): Promise<void> {
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

// Helper to read config safely
async function readConfig(): Promise<AdminConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(data) as AdminConfig;
    return {
      targetLink: parsed.targetLink || "https://google.com",
      adminPasscode: parsed.adminPasscode || process.env.ADMIN_PASSCODE || "admin123",
    };
  } catch (error) {
    const defaultConfig: AdminConfig = {
      targetLink: "https://chat.whatsapp.com/invite/EXEMPLO",
      adminPasscode: process.env.ADMIN_PASSCODE || "admin123",
    };
    await writeConfig(defaultConfig);
    return defaultConfig;
  }
}

// Helper to write config safely
async function writeConfig(config: AdminConfig): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Initialize files
  await readConfig();
  await readLeads();

  // --- API ROUTES ---

  // 1. Send Code (OTC)
  app.post("/api/leads/send-code", async (req, res) => {
    try {
      const { name, whatsapp } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Nome é obrigatório." });
      }

      if (!whatsapp || typeof whatsapp !== "string" || whatsapp.trim().length === 0) {
        return res.status(400).json({ error: "WhatsApp é obrigatório." });
      }

      // Sanitize whatsapp (keep digits only)
      const cleanWhatsapp = whatsapp.replace(/\D/g, "");
      if (cleanWhatsapp.length < 10) {
        return res.status(400).json({ error: "Número de WhatsApp inválido. Digite o DDD e o número." });
      }

      // Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      // Store in memory
      otcSessions.set(cleanWhatsapp, { code, expiresAt, name: name.trim() });

      console.log(`[OTC] Código gerado para ${cleanWhatsapp} (${name}): ${code}`);

      // We return the generated code in the response to make user testing/simulation flawless and extremely smooth!
      return res.status(200).json({
        success: true,
        message: "Código enviado com sucesso (simulado).",
        demoCode: code, // Frontend can intercept this to show a realistic mock notification toast
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Erro interno no servidor ao enviar código." });
    }
  });

  // 2. Verify Code
  app.post("/api/leads/verify-code", async (req, res) => {
    try {
      const { whatsapp, code } = req.body;

      if (!whatsapp || !code) {
        return res.status(400).json({ error: "WhatsApp e código são obrigatórios." });
      }

      const cleanWhatsapp = whatsapp.replace(/\D/g, "");
      const session = otcSessions.get(cleanWhatsapp);

      if (!session) {
        return res.status(400).json({ error: "Nenhum código foi solicitado para este número ou expirou." });
      }

      if (Date.now() > session.expiresAt) {
        otcSessions.delete(cleanWhatsapp);
        return res.status(400).json({ error: "O código expirou. Solicite um novo." });
      }

      if (session.code !== code.trim()) {
        return res.status(400).json({ error: "Código incorreto. Tente novamente." });
      }

      // Code validated! Add lead to database
      const leads = await readLeads();
      
      // Check if lead already exists to avoid duplicates (optional but good, or just append)
      const existingLeadIndex = leads.findIndex((l) => l.whatsapp === cleanWhatsapp);
      const newLead: Lead = {
        id: Math.random().toString(36).substring(2, 11),
        name: session.name,
        whatsapp: cleanWhatsapp,
        verifiedAt: new Date().toISOString(),
      };

      if (existingLeadIndex >= 0) {
        leads[existingLeadIndex] = newLead;
      } else {
        leads.push(newLead);
      }

      await writeLeads(leads);

      // Delete OTC session now that it is validated
      otcSessions.delete(cleanWhatsapp);

      // Get target link
      const config = await readConfig();

      return res.status(200).json({
        success: true,
        targetLink: config.targetLink,
        lead: newLead,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Erro interno no servidor ao verificar código." });
    }
  });

  // Middleware to authenticate Admin
  const adminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const config = await readConfig();

      if (!authHeader || authHeader !== `Bearer ${config.adminPasscode}`) {
        return res.status(401).json({ error: "Não autorizado. Senha administrativa incorreta." });
      }
      next();
    } catch (err) {
      return res.status(500).json({ error: "Erro na autenticação do admin." });
    }
  };

  // 3. Admin: Get Leads list
  app.get("/api/admin/leads", adminAuth, async (req, res) => {
    try {
      const leads = await readLeads();
      // Sort leads by newest verifiedAt first
      leads.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());
      return res.status(200).json({ leads });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao ler leads." });
    }
  });

  // 4. Admin: Delete Lead
  app.delete("/api/admin/leads/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      let leads = await readLeads();
      leads = leads.filter((l) => l.id !== id);
      await writeLeads(leads);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao excluir lead." });
    }
  });

  // 5. Admin: Get Config
  app.get("/api/admin/config", adminAuth, async (req, res) => {
    try {
      const config = await readConfig();
      // Don't return passcode to client for extra security, or return it if they are already authorized anyway
      return res.status(200).json({ targetLink: config.targetLink });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao ler configurações." });
    }
  });

  // 6. Admin: Update Config
  app.post("/api/admin/config", adminAuth, async (req, res) => {
    try {
      const { targetLink, adminPasscode } = req.body;
      const config = await readConfig();

      if (targetLink && typeof targetLink === "string") {
        config.targetLink = targetLink.trim();
      }

      if (adminPasscode && typeof adminPasscode === "string" && adminPasscode.trim().length > 0) {
        config.adminPasscode = adminPasscode.trim();
      }

      await writeConfig(config);
      return res.status(200).json({ success: true, targetLink: config.targetLink });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao salvar configurações." });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
