import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, User, CheckCircle2, ArrowRight, Loader2, RefreshCw, ChevronLeft, ExternalLink } from "lucide-react";

interface OTCFormProps {
  onSuccess: (targetLink: string, leadData: any) => void;
  onShowToast: (message: string, code: string) => void;
}

export default function OTCForm({ onSuccess, onShowToast }: OTCFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timer for code resend
  const [countdown, setCountdown] = useState(0);
  
  // Refs for the 6-digit OTC input boxes
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Format WhatsApp input: (XX) XXXXX-XXXX
  const formatWhatsapp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsapp(e.target.value);
    setWhatsapp(formatted);
  };

  // Submit step 1 (Send Code)
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Por favor, digite seu nome.");
      return;
    }
    const cleanNum = whatsapp.replace(/\D/g, "");
    if (cleanNum.length < 10) {
      setError("Por favor, digite um número de WhatsApp válido com DDD.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leads/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp: cleanNum }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor está iniciando ou instável. Por favor, aguarde alguns segundos e clique novamente.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao enviar o código.");
      }

      // Show toast with simulation code
      if (data.demoCode) {
        onShowToast(`Enviado para ${whatsapp}`, data.demoCode);
      }

      setStep(2);
      setCountdown(60); // 60 seconds cooldown for resend
    } catch (err: any) {
      setError(err.message || "Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle pasting or inputting digits
  const handleCodeChange = (index: number, value: string) => {
    // Only accept digits
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) {
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
      return;
    }

    const digit = cleanValue[cleanValue.length - 1]; // get last digit
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const newCode = [...code];
      
      // If current cell is empty, clear previous cell and focus it
      if (!code[index] && index > 0) {
        newCode[index - 1] = "";
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  // Check if code is fully filled, and if so, automatically trigger validation
  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === 6 && step === 2) {
      handleVerifyCode();
    }
  }, [code, step]);

  // Submit step 2 (Verify Code)
  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) return;

    setLoading(true);
    setError(null);

    try {
      const cleanNum = whatsapp.replace(/\D/g, "");
      const response = await fetch("/api/leads/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: cleanNum, code: fullCode }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor está iniciando ou instável. Por favor, aguarde alguns segundos e tente novamente.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Código inválido ou expirado.");
      }

      // Success! Pass the link and lead to parent
      onSuccess(data.targetLink, data.lead);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Erro ao verificar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const cleanNum = whatsapp.replace(/\D/g, "");
      const response = await fetch("/api/leads/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp: cleanNum }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("O servidor está iniciando ou instável. Por favor, aguarde alguns segundos e tente novamente.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao reenviar o código.");
      }

      if (data.demoCode) {
        onShowToast(`Enviado para ${whatsapp}`, data.demoCode);
      }
      
      // Clear code inputs
      setCode(Array(6).fill(""));
      inputRefs.current[0]?.focus();
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "Erro ao reenviar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="otc-form-container" className="w-full">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                Receba seu acesso exclusivo
              </h2>
              <p className="text-slate-500 mt-2 text-sm md:text-base leading-relaxed">
                Preencha seus dados abaixo para validar sua inscrição via WhatsApp.
              </p>
            </div>

            <form onSubmit={handleSendCode} className="space-y-5">
              {error && (
                <div id="step1-error" className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm rounded">
                  {error}
                </div>
              )}

              {/* Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="name-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    id="name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none text-slate-800 placeholder-slate-400 transition-all font-medium text-sm md:text-base"
                  />
                </div>
              </div>

              {/* WhatsApp Input */}
              <div className="space-y-1.5">
                <label htmlFor="whatsapp-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  WhatsApp com DDD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    id="whatsapp-input"
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={handleWhatsappChange}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none text-slate-800 placeholder-slate-400 transition-all font-medium text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="send-code-btn"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm md:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    Enviar código via WhatsApp
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6">
              <button
                id="back-to-step1-btn"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft size={14} />
                Editar número / nome
              </button>
            </div>

            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">
                Insira o código de validação
              </h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Enviamos um código de 6 dígitos para o número <span className="font-semibold text-slate-700">{whatsapp}</span>.
              </p>
            </div>

            <div className="space-y-6">
              {error && (
                <div id="step2-error" className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm rounded">
                  {error}
                </div>
              )}

              {/* 6 Digit Input Group */}
              <div className="flex justify-between gap-2 max-w-sm mx-auto" id="code-inputs-group">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`code-digit-${idx}`}
                    ref={(el) => {
                      if (el) inputRefs.current[idx] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl md:text-2xl font-display font-bold bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-lg outline-none text-slate-800 transition-all shadow-sm"
                  />
                ))}
              </div>

              {/* Actions & Resend */}
              <div className="text-center space-y-4">
                <button
                  id="resend-code-btn"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-600 hover:text-emerald-500 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  {countdown > 0 ? `Reenviar código em ${countdown}s` : "Não recebi o código? Reenviar"}
                </button>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                    <Loader2 size={14} className="animate-spin text-emerald-600" />
                    Validando código...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
