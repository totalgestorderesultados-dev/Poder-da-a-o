import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, KeyRound, Globe, Users, Save, Trash2, Search, Download, 
  ArrowLeft, Check, AlertCircle, Loader2, RefreshCw, MessageSquare, ExternalLink, Calendar 
} from "lucide-react";
import { Lead } from "../types.js";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  
  // Stored state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [targetLink, setTargetLink] = useState("");
  const [newTargetLink, setNewTargetLink] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Notification banner state
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Auto-clear message
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Load state when authenticated
  const fetchData = async (overridePasscode?: string) => {
    const authCode = overridePasscode || passcode;
    setLoading(true);
    setError(null);
    try {
      // Get leads
      const leadsRes = await fetch("/api/admin/leads", {
        headers: { "Authorization": `Bearer ${authCode}` }
      });
      
      const contentType = leadsRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Não foi possível conectar ao servidor. O navegador está bloqueando cookies de segurança devido ao visualizador integrado.");
      }

      if (!leadsRes.ok) {
        throw new Error("Senha administrativa incorreta.");
      }
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads || []);

      // Get config
      const configRes = await fetch("/api/admin/config", {
        headers: { "Authorization": `Bearer ${authCode}` }
      });
      if (configRes.ok) {
        const configData = await configRes.json();
        setTargetLink(configData.targetLink);
        setNewTargetLink(configData.targetLink);
      }

      setIsAuthenticated(true);
      // Save password in session storage to keep logged in on hot reload/turns
      sessionStorage.setItem("admin_token", authCode);
    } catch (err: any) {
      setError(err.message || "Erro de autenticação.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Try auto-login on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem("admin_token");
    if (savedToken) {
      setPasscode(savedToken);
      fetchData(savedToken);
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    fetchData();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    setPasscode("");
    setLeads([]);
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${passcode}`
        },
        body: JSON.stringify({
          targetLink: newTargetLink,
          adminPasscode: newPasscode ? newPasscode : undefined
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar configurações.");
      }

      setTargetLink(newTargetLink);
      if (newPasscode) {
        setPasscode(newPasscode);
        sessionStorage.setItem("admin_token", newPasscode);
        setNewPasscode("");
      }

      setStatusMsg({ text: "Configurações atualizadas com sucesso!", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Erro ao atualizar.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cadastro?")) return;
    
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${passcode}` }
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir lead.");
      }

      setLeads(leads.filter((lead) => lead.id !== id));
      setStatusMsg({ text: "Cadastro excluído com sucesso.", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Erro ao excluir.", type: "error" });
    }
  };

  // Export Leads to CSV
  const exportToCSV = () => {
    if (leads.length === 0) return;
    
    // Add UTF-8 BOM so Excel opens with accented characters correctly in Portuguese
    const BOM = "\uFEFF";
    const headers = "ID;Nome;WhatsApp;Data de Validação\n";
    const rows = leads.map(l => {
      const date = new Date(l.verifiedAt).toLocaleString("pt-BR");
      return `"${l.id}";"${l.name}";"${l.whatsapp}";"${date}"`;
    }).join("\n");

    const blob = new Blob([BOM + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_valida_zap_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter leads based on query
  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) || 
      lead.whatsapp.includes(query)
    );
  });

  return (
    <div id="admin-panel-root" className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <button
          id="admin-back-home"
          onClick={onClose}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
        >
          <ArrowLeft size={16} />
          Voltar para Início
        </button>
        <h1 className="font-display text-lg font-bold text-slate-700">Painel Administrativo</h1>
      </div>

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-md mx-auto bg-white rounded-xl shadow-md border border-slate-150 p-6 md:p-8"
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={22} />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-800">Acesso Restrito</h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">
                Insira a senha do administrador para visualizar cadastros e gerenciar o redirecionamento.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div id="admin-login-error" className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl space-y-3 flex flex-col">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </div>
                  {isIframe && (
                    <div className="pt-2.5 border-t border-rose-200/60 flex flex-col gap-2 text-left">
                      <span className="text-[11px] text-rose-700 font-medium leading-relaxed">
                        ⚠️ O navegador bloqueia os cookies de login no visualizador integrado. Abra em tela cheia para gerenciar o painel.
                      </span>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-850 hover:bg-slate-750 text-white font-bold rounded-lg text-xs transition-all shadow-md self-start"
                      >
                        Abrir em Nova Aba
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="admin-pass-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Senha Administrativa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound size={16} />
                  </div>
                  <input
                    id="admin-pass-input"
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Senha padrão (admin123)"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none text-slate-800 placeholder-slate-400 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <button
                id="admin-login-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Entrar no Painel"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Status updates toast / alert banner */}
            <AnimatePresence>
              {statusMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-3.5 rounded-lg text-sm flex items-center gap-2 shadow-sm ${
                    statusMsg.type === "success" 
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  {statusMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{statusMsg.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Cards (Metrics & Settings) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Metric Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Leads</span>
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={16} /></span>
                  </div>
                  <h3 className="font-display text-3xl font-extrabold text-slate-800" id="admin-metrics-total">
                    {leads.length}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Pessoas cadastradas e verificadas via OTC.</p>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Modo Simulado</span>
                  <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Ativo</span>
                </div>
              </div>

              {/* Redirect URL and Configuration */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-150 p-5">
                <h3 className="font-display text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-slate-500" />
                  Link de Redirecionamento & Configurações
                </h3>

                <form onSubmit={handleUpdateConfig} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="target-link-input" className="block text-xs font-semibold text-slate-500">
                        Link de Destino Pós-Validação
                      </label>
                      <input
                        id="target-link-input"
                        type="url"
                        required
                        value={newTargetLink}
                        onChange={(e) => setNewTargetLink(e.target.value)}
                        placeholder="https://exemplo.com/pagina-exclusiva"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg outline-none text-slate-800 placeholder-slate-400 font-medium text-sm transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="new-passcode-input" className="block text-xs font-semibold text-slate-500">
                        Nova Senha Admin (Opcional)
                      </label>
                      <input
                        id="new-passcode-input"
                        type="password"
                        value={newPasscode}
                        onChange={(e) => setNewPasscode(e.target.value)}
                        placeholder="Alterar senha do painel"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg outline-none text-slate-800 placeholder-slate-400 font-medium text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                    <div className="text-xs text-slate-400 max-w-md">
                      Link atual: <a href={targetLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-medium break-all hover:underline inline-flex items-center gap-0.5">{targetLink} <ExternalLink size={10} /></a>
                    </div>
                    <button
                      id="save-config-btn"
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Leads Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-150 overflow-hidden">
              <div className="p-5 border-b border-slate-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-800">Leads Cadastrados</h3>
                  <p className="text-xs text-slate-400">Lista completa de usuários que completaram a verificação.</p>
                </div>

                {/* Table Actions (Search & CSV Export) */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      id="lead-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome ou celular"
                      className="w-full sm:w-56 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg outline-none text-slate-700 placeholder-slate-400 text-xs font-medium transition-all"
                    />
                  </div>

                  <button
                    id="export-leads-csv"
                    onClick={exportToCSV}
                    disabled={leads.length === 0}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:text-slate-300 disabled:bg-slate-50 rounded-lg shadow-sm transition-all"
                    title="Exportar como CSV (Excel)"
                  >
                    <Download size={15} />
                  </button>

                  <button
                    id="refresh-leads"
                    onClick={() => fetchData()}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg shadow-sm transition-all"
                    title="Atualizar Tabela"
                  >
                    <RefreshCw size={15} />
                  </button>

                  <button
                    id="admin-logout-btn"
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    Sair
                  </button>
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="leads-table">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-150">
                      <th className="px-5 py-3">Nome</th>
                      <th className="px-5 py-3">WhatsApp</th>
                      <th className="px-5 py-3">Data de Validação</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => {
                        const formattedDate = new Date(lead.verifiedAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        
                        // WhatsApp link formatting
                        const waLink = `https://wa.me/${lead.whatsapp}`;
                        
                        return (
                          <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 font-semibold text-slate-800">{lead.name}</td>
                            <td className="px-5 py-4">
                              <a 
                                href={waLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-500 hover:underline font-medium"
                              >
                                <MessageSquare size={13} />
                                {lead.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                              </a>
                            </td>
                            <td className="px-5 py-4 text-slate-400 text-xs flex items-center gap-1 mt-2.5">
                              <Calendar size={12} />
                              {formattedDate}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                id={`delete-lead-${lead.id}`}
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors"
                                title="Excluir lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                          {leads.length === 0 ? "Nenhum lead cadastrado ainda." : "Nenhum cadastro coincide com sua busca."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
