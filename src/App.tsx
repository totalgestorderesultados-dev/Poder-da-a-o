import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Settings, CheckCircle2, ExternalLink, ArrowRight, Clipboard, ChevronRight, AlertCircle } from "lucide-react";
import OTCForm from "./components/OTCForm.js";
import AdminPanel from "./components/AdminPanel.js";

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [registeredLead, setRegisteredLead] = useState<any>(null);
  
  // Simulated Toast Notification for OTC code
  const [toast, setToast] = useState<{ message: string; code: string } | null>(null);
  const [countdown, setCountdown] = useState(5); // Success redirect countdown

  // Show Toast handler
  const handleShowToast = (message: string, code: string) => {
    setToast({ message, code });
    // Auto-dismiss toast after 10 seconds
    const timer = setTimeout(() => {
      setToast(null);
    }, 12000);
    return () => clearTimeout(timer);
  };

  // Copy code to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show copy animation or update label
  };

  // Autofill code in the inputs
  const autoFillCode = () => {
    if (!toast) return;
    const digits = toast.code.split("");
    digits.forEach((digit, idx) => {
      const el = document.getElementById(`code-digit-${idx}`) as HTMLInputElement;
      if (el) {
        el.value = digit;
        // Trigger React change manually
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(el, digit);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    setToast(null);
  };

  // Handle successful registration and verification
  const handleRegistrationSuccess = (targetLink: string, lead: any) => {
    setRedirectUrl(targetLink);
    setRegisteredLead(lead);
    setIsVerified(true);
    setCountdown(5); // Start 5-second countdown
  };

  // Countdown and automatic redirect for Success State
  useEffect(() => {
    if (isVerified && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isVerified && countdown === 0 && redirectUrl) {
      // Trigger automatic redirect
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    }
  }, [isVerified, countdown, redirectUrl]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-emerald-200">
      
      {/* Simulated WhatsApp Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Simulação do WhatsApp</span>
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Mensagem Recebida:</span>
                <p className="mt-1 bg-slate-950 p-2 rounded text-slate-200 font-mono text-xs border border-slate-800 flex items-center justify-between">
                  <span>Olá! Seu código do ValidaZap é: <strong className="text-emerald-400 font-bold text-sm tracking-wider">{toast.code}</strong></span>
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 text-[11px] font-bold mt-1">
                <button
                  id="toast-copy-btn"
                  onClick={() => {
                    copyToClipboard(toast.code);
                    alert("Código copiado!");
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded transition-colors flex items-center gap-1"
                >
                  <Clipboard size={10} /> Copiar
                </button>
                <button
                  id="toast-autofill-btn"
                  onClick={autoFillCode}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-0.5"
                >
                  Preencher <ChevronRight size={10} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="py-6 px-4 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div 
          id="app-logo"
          onClick={() => {
            setIsAdminMode(false);
            setIsVerified(false);
          }}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-200 group-hover:bg-emerald-500 transition-colors">
            <MessageSquare size={20} />
          </div>
          <div>
            <span className="font-display font-black text-slate-800 text-lg leading-none tracking-tight">Valida<span className="text-emerald-600">Zap</span></span>
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">OTC Lead Verifier</span>
          </div>
        </div>

        <div>
          {!isAdminMode ? (
            <button
              id="header-admin-btn"
              onClick={() => setIsAdminMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
              <Settings size={14} />
              Administração
            </button>
          ) : (
            <button
              id="header-home-btn"
              onClick={() => setIsAdminMode(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
              Voltar para Início
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {isAdminMode ? (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <AdminPanel onClose={() => setIsAdminMode(false)} />
              </motion.div>
            ) : isVerified ? (
              <motion.div
                key="success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-150 p-6 md:p-10 text-center space-y-6"
                id="success-screen"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} className="animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                    Inscrição Confirmada!
                  </h2>
                  <p className="text-slate-500 text-sm md:text-base leading-relaxed">
                    Parabéns <strong className="text-slate-700 font-semibold">{registeredLead?.name}</strong>, seu cadastro via WhatsApp foi validado com sucesso!
                  </p>
                </div>

                {/* Informação Bem Destacada (Instrução de Instalação) */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 text-left max-w-sm mx-auto shadow-sm flex items-start gap-3">
                  <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <AlertCircle size={18} />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-amber-900 uppercase tracking-wider block">⚠️ Instrução de Instalação</span>
                    <p className="font-semibold text-xs md:text-sm text-amber-800 leading-relaxed">
                      Clique no link e após abrir o aplicativo clique no botão instalar para um perfeito funcionamento do aplicativo.
                    </p>
                  </div>
                </div>

                {/* Simulated redirect details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 space-y-3.5 max-w-sm mx-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Link de Acesso Exclusivo</span>
                  <a
                    id="success-target-link"
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs md:text-sm font-semibold text-emerald-600 hover:text-emerald-500 transition-colors break-all flex items-center justify-center gap-1 hover:underline"
                  >
                    {redirectUrl}
                    <ExternalLink size={12} />
                  </a>

                  {/* Countdown Timer Visual */}
                  <div className="pt-2">
                    <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                      Redirecionando automaticamente em <strong className="text-slate-700 font-semibold">{countdown}</strong> segundos...
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-emerald-500 h-full"
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Main Redirect Button */}
                <div className="space-y-3 pt-3">
                  <a
                    id="redirect-now-btn"
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm md:text-base"
                  >
                    Acessar Link Imediatamente
                    <ArrowRight size={18} />
                  </a>

                  <button
                    id="back-to-form-btn"
                    onClick={() => {
                      setIsVerified(false);
                      setRegisteredLead(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
                  >
                    Cadastrar outro contato
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-150 p-6 md:p-8"
              >
                <OTCForm onSuccess={handleRegistrationSuccess} onShowToast={handleShowToast} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center max-w-7xl mx-auto w-full border-t border-slate-100">
        <p className="text-xs text-slate-400 font-medium">
          ValidaZap &copy; {new Date().getFullYear()} &middot; Desenvolvido para proteção e captação qualificada de leads.
        </p>
      </footer>

    </div>
  );
}
