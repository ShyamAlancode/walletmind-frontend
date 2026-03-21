"use client";
import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  txHash?: string;
  scheduleId?: string;
  agentSteps?: number;
  walletData?: WalletData;
  timestamp: string;
};

type Token = { token_id: string; symbol: string; name: string; balance: number; type: string };

type WalletData = {
  account_id: string; hbar_balance: number; tokens: Token[];
  token_count: number; tx_count_30d: number; evm_address: string;
};

type Stats = {
  total_analyses: number; unique_wallets: number;
  hcs_messages_logged: number; scheduled_transactions: number;
};

export default function WalletMind() {
  const [wallet, setWallet] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: "system",
    content: "WalletMind v2.0 — Autonomous DeFi Agent on Hedera. 5 real Hedera tools. Every analysis logged on-chain. Paste a wallet address to begin.",
    timestamp: new Date().toISOString(),
  }]);
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const getFriendlyError = (err: unknown): string => {
    if (!(err instanceof Error)) return "Unknown error occurred";
    const msg = err.message.toLowerCase();
    if (msg.includes("404") || msg.includes("not found"))
      return "Wallet not found on Hedera testnet. Try: 0.0.8307413";
    if (msg.includes("400") || msg.includes("invalid"))
      return "Invalid wallet format. Use: 0.0.xxxxxx (e.g. 0.0.8307413)";
    if (msg.includes("500") || msg.includes("agent"))
      return "Agent temporarily unavailable. Please try again in a moment.";
    if (msg.includes("fetch") || msg.includes("network"))
      return "Cannot reach WalletMind backend. Check your connection.";
    return err.message;
  };

  const analyzeWallet = async () => {
    const addr = wallet.trim();
    const q = question.trim() || "Give me a complete portfolio analysis and DeFi strategy.";
    if (!addr) { setError("Enter a Hedera wallet address (e.g. 0.0.8307413)"); return; }
    setError(""); setLoading(true);

    setMessages(m => [...m, {
      role: "user",
      content: `Analyzing wallet ${addr}${question ? ` — "${q}"` : ""}`,
      timestamp: new Date().toISOString(),
    }]);

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: addr, question: q }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      const data = await res.json();
      setWalletData(data.wallet_data);
      setMessages(m => [...m, {
        role: "assistant",
        content: data.analysis,
        txHash: data.tx_hash,
        scheduleId: data.schedule_id,
        agentSteps: data.agent_steps,
        walletData: data.wallet_data,
        timestamp: data.timestamp,
      }]);
      setQuestion("");
      // Refresh stats
      fetch(`${API_URL}/stats`).then(r => r.json()).then(setStats).catch(() => {});
    } catch (e) {
      const msg = getFriendlyError(e);
      setError(msg);
      setMessages(m => [...m, { role: "system", content: `⚠ ${msg}`, timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyzeWallet(); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'IBM Plex Mono','Courier New',monospace", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1e293b", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#030712", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>W</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.05em", color: "#f1f5f9" }}>WALLETMIND</div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>AUTONOMOUS HEDERA DeFi AGENT</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>TESTNET LIVE</span>
          </div>
          {stats && (
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.05em" }}>
              {stats.total_analyses} analyses · {stats.unique_wallets} wallets · {stats.hcs_messages_logged} on-chain logs
            </div>
          )}
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <aside style={{ width: 260, borderRight: "1px solid #1e293b", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", marginBottom: 8 }}>WALLET ADDRESS</div>
            <input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0.0.xxxxxx" onKeyDown={handleKey}
              style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "#1e293b"}
            />
            <div style={{ fontSize: 10, color: "#334155", marginTop: 6 }}>Format: 0.0.xxxxxx · Try: 0.0.8307413</div>
          </div>

          {walletData && (
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", marginBottom: 12 }}>PORTFOLIO SNAPSHOT</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <StatRow label="HBAR" value={`${walletData.hbar_balance.toLocaleString()} ℏ`} accent="#a78bfa" />
                <StatRow label="TOKENS" value={`${walletData.token_count} assets`} accent="#34d399" />
                <StatRow label="TXS (30D)" value={`${walletData.tx_count_30d}`} accent="#60a5fa" />
              </div>
              {walletData.tokens?.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid #1e293b", paddingTop: 12 }}>
                  {walletData.tokens.slice(0, 5).map(t => (
                    <div key={t.token_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: "#94a3b8" }}>{t.symbol}</span>
                      <span style={{ color: "#e2e8f0" }}>{t.balance?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", marginBottom: 8 }}>QUICK QUESTIONS</div>
            {["Best yield strategy for my holdings?", "What are my risk exposures?", "Should I provide liquidity on SaucerSwap?", "Top DeFi opportunities on Hedera?"].map(q => (
              <button key={q} onClick={() => setQuestion(q)}
                style={{ display: "block", width: "100%", textAlign: "left", background: question === q ? "#1e1b4b" : "transparent", border: `1px solid ${question === q ? "#6366f1" : "#1e293b"}`, borderRadius: 5, padding: "7px 10px", color: question === q ? "#a78bfa" : "#64748b", fontSize: 11, fontFamily: "inherit", cursor: "pointer", marginBottom: 5 }}>
                {q}
              </button>
            ))}
          </div>

          {/* Agent info */}
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.15em", marginBottom: 8 }}>AGENT TOOLS</div>
            {["Mirror Node", "Exchange Rate API", "DeFi Protocols", "HCS Logging", "Scheduled Tx"].map((t, i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: ["#6366f1","#8b5cf6","#34d399","#22c55e","#f59e0b"][i] }} />
                <span style={{ fontSize: 10, color: "#64748b" }}>{t}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            {loading && <LoadingIndicator />}
            <div ref={bottomRef} />
          </div>

          <div style={{ borderTop: "1px solid #1e293b", padding: "16px 24px", background: "#030712" }}>
            {error && (
              <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 6, padding: "8px 12px", color: "#fca5a5", fontSize: 12, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={handleKey}
                placeholder="Ask about your portfolio... or press Enter for full analysis"
                style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 16px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#1e293b"}
              />
              <button onClick={analyzeWallet} disabled={loading || !wallet.trim()}
                style={{ background: loading || !wallet.trim() ? "#1e293b" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, padding: "12px 24px", color: loading || !wallet.trim() ? "#475569" : "#fff", fontSize: 13, fontFamily: "inherit", fontWeight: 600, cursor: loading || !wallet.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                {loading ? "ANALYZING..." : "ANALYZE →"}
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" }}>
              Autonomous LangChain agent · 5 real Hedera tools · Every analysis logged on-chain · Groq Llama 3.3 70B
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "system") return (
    <div style={{ textAlign: "center", color: "#334155", fontSize: 11, marginBottom: 20, animation: "fadeIn 0.3s ease" }}>
      <span style={{ background: "#0f172a", padding: "4px 12px", borderRadius: 20, border: "1px solid #1e293b" }}>{message.content}</span>
    </div>
  );

  if (message.role === "user") return (
    <div style={{ textAlign: "right", marginBottom: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "inline-block", background: "#1e1b4b", border: "1px solid #3730a3", borderRadius: "8px 8px 2px 8px", padding: "10px 14px", maxWidth: "70%", fontSize: 13, color: "#c7d2fe", textAlign: "left" }}>{message.content}</div>
      <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );

  return (
    <div style={{ marginBottom: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 2 }}>W</div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "2px 8px 8px 8px", padding: "14px 16px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {message.content}
          </div>

          {/* Agent steps badge */}
          {message.agentSteps !== undefined && message.agentSteps > 0 && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
              <span style={{ fontSize: 10, color: "#6366f1" }}>
                Agent made {message.agentSteps} Hedera tool calls
              </span>
            </div>
          )}

          {/* HCS badge */}
          {message.txHash && (
            <div style={{ marginTop: 8, background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, letterSpacing: "0.1em" }}>✓ LOGGED ON HEDERA BLOCKCHAIN</span>
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>
                Topic: {HCS_TOPIC_ID} · Tx: {message.txHash.substring(0, 24)}...
              </div>
              <a href={`https://hashscan.io/testnet/transaction/${message.txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: "#6366f1", textDecoration: "none" }}>
                View on HashScan →
              </a>
            </div>
          )}

          {/* Scheduled transaction badge */}
          {message.scheduleId && (
            <div style={{ marginTop: 6, background: "#0a1a0a", border: "1px solid #14532d", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.1em" }}>⚡ STRATEGY SCHEDULED ON HEDERA</span>
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Schedule ID: {message.scheduleId}</div>
              <a href={`https://hashscan.io/testnet/schedule/${message.scheduleId}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: "#f59e0b", textDecoration: "none" }}>
                View Schedule on HashScan →
              </a>
            </div>
          )}

          <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>{new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}

const HCS_TOPIC_ID = "0.0.8315989";

function LoadingIndicator() {
  const [step, setStep] = useState(0);
  const steps = ["Fetching wallet from Mirror Node...", "Checking HBAR price...", "Querying DeFi protocols...", "Agent reasoning..."];
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 2000); return () => clearInterval(t); }, []);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>W</div>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "2px 8px 8px 8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 12 }}>
        <span>{steps[step]}</span>
        <span style={{ animation: "blink 1s infinite" }}>▋</span>
      </div>
    </div>
  );
}
