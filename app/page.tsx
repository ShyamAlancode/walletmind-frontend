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
    content: "WalletMind — Verifiable AI DeFi Copilot for Hedera. Personalized trading, staking, yield, and risk insights for your wallet, with every recommendation immutably logged on-chain.",
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
    if (!addr || !/^0\.0\.\d+$/.test(addr)) { 
      setError("Enter a valid Hedera wallet address (e.g. 0.0.8307413)"); 
      return; 
    }
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

  const isValidWallet = /^0\.0\.\d+$/.test(wallet.trim());

  return (
    <div className="dashboard-root">
      {/* Header */}
      <header className="main-header">
        <div className="logo-section">
          <div className="logo-mark">W</div>
          <div className="brand-info">
            <h1 className="brand-name">WALLETMIND</h1>
            <p className="brand-tagline">VERIFIABLE AI DeFi COPILOT FOR HEDERA</p>
          </div>
        </div>

        <div className="status-section">
          {loading && (
            <div className="analyzing-status">
              <div className="spinner-mini"></div>
              <span>Analyzing {wallet.substring(0, 10)}...</span>
            </div>
          )}
          <div className="testnet-indicator">
            <div className="pulse-dot green"></div>
            <span>TESTNET LIVE</span>
          </div>
        </div>
      </header>

      <div className="layout-grid">
        {/* Left Sidebar: Wallet & Snapshot */}
        <aside className="sidebar left-sidebar">
          <section className="input-group">
            <label className="section-label">WALLET ADDRESS</label>
            <div className="input-wrapper">
              <input 
                value={wallet} 
                onChange={e => setWallet(e.target.value)} 
                placeholder="0.0.8307413" 
                onKeyDown={handleKey}
                className={`wallet-input ${wallet && !isValidWallet ? 'invalid' : ''} ${isValidWallet ? 'valid' : ''}`}
              />
              {isValidWallet && <span className="valid-check">✓</span>}
            </div>
            {wallet && !isValidWallet && (
              <p className="input-hint error">Invalid format. Use 0.0.xxxxxx</p>
            )}
            {!wallet && (
              <p className="input-hint">Enter your Hedera account ID</p>
            )}
          </section>

          <section className="stats-group">
            <label className="section-label">PORTFOLIO SNAPSHOT</label>
            <div className="stat-cards-grid">
              <StatCard 
                label="HBAR" 
                value={walletData ? `${walletData.hbar_balance.toLocaleString()} ℏ` : "—"} 
                subtext={walletData ? `~$${(walletData.hbar_balance * 0.1).toFixed(2)}` : ""}
                color="indigo"
              />
              <StatCard 
                label="TOKENS" 
                value={walletData ? `${walletData.token_count}` : "—"} 
                subtext="Assets"
                color="emerald"
              />
              <StatCard 
                label="ACTIVITY" 
                value={walletData ? `${walletData.tx_count_30d}` : "—"} 
                subtext="30D Txs"
                color="blue"
              />
            </div>
          </section>

          <section className="token-list-section">
            <label className="section-label">TOP ASSETS</label>
            <div className="token-list">
              {walletData?.tokens && walletData.tokens.length > 0 ? (
                walletData.tokens.slice(0, 5).map(t => (
                  <div key={t.token_id} className="token-item">
                    <span className="token-sym">{t.symbol}</span>
                    <span className="token-bal">{t.balance?.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="empty-msg">No tokens found</p>
              )}
            </div>
          </section>
        </aside>

        {/* Center: Chat Area */}
        <main className="chat-container">
          <div className="messages-scroll">
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <div className="input-area">
            {error && <div className="error-banner">{error}</div>}
            <div className="chat-input-wrapper">
              <input 
                value={question} 
                onChange={e => setQuestion(e.target.value)} 
                onKeyDown={handleKey}
                placeholder="Ask about your yield strategy or risk..."
                className="chat-input"
              />
              <button 
                onClick={analyzeWallet} 
                disabled={loading || !isValidWallet}
                className={`analyze-btn ${loading ? 'loading' : ''} ${isValidWallet && !loading ? 'active' : ''}`}
              >
                {loading ? "PRODUCING LOGS..." : "ANALYZE NOW"}
              </button>
            </div>
            <div className="chat-meta">
              <p>Verifiable AI · Groq Llama 3.3 70B · Immutably logged on Hedera</p>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Tools & Stats */}
        <aside className="sidebar right-sidebar">
          <section className="tools-section">
            <label className="section-label">AGENT TOOLS</label>
            <div className="tool-list">
              {[
                { name: "Mirror Node", status: "active", icon: "🌐" },
                { name: "Exchange Rate API", status: "active", icon: "💱" },
                { name: "DeFi Protocols", status: "active", icon: "🔌" },
                { name: "HCS Logging", status: "active", icon: "📑" },
                { name: "Scheduled Tx", status: "active", icon: "⚡" },
              ].map((t) => (
                <div key={t.name} className="tool-item">
                  <span className="tool-icon">{t.icon}</span>
                  <span className="tool-name">{t.name}</span>
                  <div className={`status-dot ${t.status}`}></div>
                </div>
              ))}
            </div>
          </section>

          <section className="quick-qs-section">
            <label className="section-label">RECOMMENDED QUERIES</label>
            <div className="pill-grid">
              {["Best yield strategy?", "Risk exposure?", "SaucerSwap LP?", "DeFi opportunities?"].map(q => (
                <button key={q} onClick={() => setQuestion(q)} className="pill-btn">
                  {q}
                </button>
              ))}
            </div>
          </section>

          {stats && (
            <section className="stats-box">
              <label className="section-label">LIVE NETWORK STATS</label>
              <div className="network-stat">
                <span className="n-val">{stats.total_analyses}</span>
                <span className="n-lbl">Analyses</span>
              </div>
              <div className="network-stat">
                <span className="n-val">{stats.hcs_messages_logged}</span>
                <span className="n-lbl">On-chain Logs</span>
              </div>
            </section>
          )}
        </aside>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --bg-main: #020617;
          --bg-card: #0b1120;
          --border: rgba(148, 163, 184, 0.1);
          --text-main: #f1f5f9;
          --text-dim: #94a3b8;
          --accent-indigo: #6366f1;
          --accent-violet: #8b5cf6;
          --accent-emerald: #10b981;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--bg-main);
          color: var(--text-main);
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        .dashboard-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-header {
          height: 64px;
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(2, 6, 23, 0.8);
          backdrop-filter: blur(8px);
          z-index: 100;
        }

        .logo-section { display: flex; alignItems: center; gap: 12px; }
        .logo-mark {
          width: 36px; height: 36px; border-radius: 8px;
          background: linear-gradient(135deg, var(--accent-indigo), var(--accent-violet));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 20px;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }

        .brand-name { font-size: 16px; font-weight: 700; letter-spacing: 0.05em; color: #fff; }
        .brand-tagline { font-size: 9px; color: var(--text-dim); letter-spacing: 0.1em; }

        .status-section { display: flex; align-items: center; gap: 20px; }
        .analyzing-status {
          display: flex; align-items: center; gap: 8px;
          color: var(--accent-indigo); font-size: 11px; font-weight: 600;
        }

        .testnet-indicator {
          display: flex; align-items: center; gap: 8px;
          background: rgba(16, 185, 129, 0.1); padding: 4px 10px;
          border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.2);
          font-size: 10px; font-weight: 700; color: #34d399;
        }

        .layout-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 320px 1fr 280px;
          overflow: hidden;
        }

        .sidebar {
          padding: 24px;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          background: #030712;
        }
        .right-sidebar { border-right: none; border-left: 1px solid var(--border); }

        .section-label {
          display: block; font-size: 10px; font-weight: 700;
          color: var(--text-dim); letter-spacing: 0.15em; margin-bottom: 12px;
        }

        .input-group { margin-bottom: 32px; }
        .input-wrapper { position: relative; }
        .wallet-input {
          width: 100%; background: #0f172a; border: 1px solid #1e293b;
          border-radius: 10px; padding: 14px 16px; color: #fff;
          font-family: 'JetBrains Mono', monospace; font-size: 14px;
          transition: all 0.2s; outline: none;
        }
        .wallet-input:focus { border-color: var(--accent-indigo); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .wallet-input.invalid { border-color: #ef4444; }
        .wallet-input.valid { border-color: var(--accent-emerald); }
        .valid-check {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          color: var(--accent-emerald); font-weight: 700;
        }

        .input-hint { font-size: 10px; color: var(--text-dim); margin-top: 8px; }
        .input-hint.error { color: #f87171; }

        .stat-cards-grid { display: grid; gap: 12px; }
        .stat-card {
          background: linear-gradient(145deg, #0f172a, #030712);
          border: 1px solid var(--border); border-radius: 12px; padding: 16px;
          transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); border-color: rgba(148, 163, 184, 0.3); }
        .sc-lbl { font-size: 9px; color: var(--text-dim); font-weight: 700; }
        .sc-val { font-size: 18px; font-weight: 700; margin: 4px 0; display: block; }
        .sc-sub { font-size: 10px; color: var(--text-dim); }

        .token-list { display: flex; flex-direction: column; gap: 8px; }
        .token-item {
          display: flex; justify-content: space-between; padding: 8px 12px;
          background: rgba(15, 23, 42, 0.5); border-radius: 8px; font-size: 12px;
          border: 1px solid transparent;
        }
        .token-sym { color: var(--text-dim); font-weight: 600; }
        .token-bal { font-family: 'JetBrains Mono', monospace; }

        .chat-container {
          display: flex; flex-direction: column; background: #020617;
          position: relative;
        }

        .messages-scroll {
          flex: 1; overflow-y: auto; padding: 32px;
          display: flex; flex-direction: column; gap: 24px;
        }

        .input-area {
          padding: 24px 32px; border-top: 1px solid var(--border);
          background: rgba(2, 6, 23, 0.9);
        }

        .chat-input-wrapper {
          display: flex; gap: 12px; background: #0f172a;
          padding: 8px; border-radius: 16px; border: 1px solid #1e293b;
        }
        .chat-input {
          flex: 1; background: transparent; border: none; padding: 12px 16px;
          color: #fff; font-size: 14px; outline: none;
        }
        .analyze-btn {
          background: var(--text-dim); color: #000; padding: 0 24px;
          border: none; border-radius: 10px; font-weight: 700; font-size: 13px;
          cursor: not-allowed; transition: all 0.3s; white-space: nowrap;
        }
        .analyze-btn.active {
          background: linear-gradient(135deg, var(--accent-indigo), var(--accent-violet));
          color: #fff; cursor: pointer;
          animation: btnPulse 2s infinite;
        }
        .analyze-btn:hover.active { transform: scale(1.02); box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }

        @keyframes btnPulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        .chat-meta { text-align: center; margin-top: 12px; font-size: 10px; color: var(--text-dim); }

        .tool-list { display: flex; flex-direction: column; gap: 10px; }
        .tool-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 14px;
          background: #0f172a; border-radius: 10px; border: 1px solid var(--border);
        }
        .tool-icon { font-size: 14px; }
        .tool-name { flex: 1; font-size: 12px; font-weight: 500; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-dot.active { background: var(--accent-emerald); box-shadow: 0 0 4px var(--accent-emerald); }

        .pill-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill-btn {
          background: #0f172a; border: 1px solid #1e293b; color: var(--text-dim);
          padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .pill-btn:hover { border-color: var(--accent-indigo); color: #fff; }

        .stats-box { background: #0f172a; padding: 20px; border-radius: 16px; border: 1px solid var(--border); }
        .network-stat { margin-bottom: 12px; display: flex; align-items: baseline; gap: 8px; }
        .n-val { font-size: 20px; font-weight: 800; color: #fff; }
        .n-lbl { font-size: 10px; color: var(--text-dim); font-weight: 700; text-transform: uppercase; }

        .error-banner {
          background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171; padding: 10px 16px; border-radius: 10px; font-size: 12px; margin-bottom: 12px;
        }

        .spinner-mini {
          width: 14px; height: 14px; border: 2px solid rgba(99, 102, 241, 0.1);
          border-top-color: var(--accent-indigo); border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pulse-dot.green { background: #22c55e; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }

        @media (max-width: 1024px) {
          .layout-grid { grid-template-columns: 1fr; overflow-y: auto; }
          .sidebar, .chat-container { height: auto; overflow: visible; border: none; border-bottom: 1px solid var(--border); }
          .chat-container { min-height: 500px; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, subtext, color }: { label: string; value: string; subtext: string; color: string }) {
  const c = color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : '#3b82f6';
  return (
    <div className="stat-card">
      <span className="sc-lbl">{label}</span>
      <span className="sc-val" style={{ color: c }}>{value}</span>
      <span className="sc-sub">{subtext}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isSystem = message.role === "system";
  const isUser = message.role === "user";

  if (isSystem) return (
    <div className="system-msg-wrap">
      <div className="system-msg">{message.content}</div>
      <style jsx>{`
        .system-msg-wrap { display: flex; justify-content: center; margin-bottom: 8px; }
        .system-msg {
          background: rgba(15, 23, 42, 0.5); padding: 6px 16px; border-radius: 20px;
          border: 1px solid var(--border); font-size: 11px; color: var(--text-dim);
          text-align: center; max-width: 80%;
        }
      `}</style>
    </div>
  );

  return (
    <div className={`message-bubble-wrap ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="msg-avatar">W</div>}
      <div className="message-content-box">
        <div className="message-text">
          {isUser ? message.content : <AssistantMarkdown content={message.content} />}
        </div>

        {!isUser && message.agentSteps !== undefined && message.agentSteps > 0 && (
          <div className="agent-badge">
            <div className={`dot pulse`}></div>
            AI used {message.agentSteps} Hedera tools
          </div>
        )}

        {!isUser && message.txHash && (
          <div className="hcs-badge">
            <div className="hcs-header">
              <div className="hcs-dot"></div>
              <span>LOGGED ON HEDERA</span>
            </div>
            <a 
              href={`https://hashscan.io/testnet/transaction/${message.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hcs-link"
            >
              HCS Hash: {message.txHash.substring(0, 16)}...
            </a>
          </div>
        )}

        {!isUser && message.scheduleId && (
          <div className="schedule-badge">
            <div className="sch-header">
              <div className="sch-dot"></div>
              <span>STRATEGY SCHEDULED</span>
            </div>
            <a href={`https://hashscan.io/testnet/schedule/${message.scheduleId}`} target="_blank" rel="noopener noreferrer" className="sch-link">
              Schedule {message.scheduleId}
            </a>
          </div>
        )}

        <div className="message-meta">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <style jsx>{`
        .message-bubble-wrap { display: flex; gap: 12px; max-width: 85%; animation: fadeIn 0.4s ease-out; }
        .message-bubble-wrap.user { align-self: flex-end; flex-direction: row-reverse; }
        .message-bubble-wrap.assistant { align-self: flex-start; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .msg-avatar {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-indigo), var(--accent-violet));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 14px; margin-top: 4px;
        }

        .message-content-box {
          display: flex; flex-direction: column; gap: 8px;
        }

        .message-text {
          padding: 16px 20px; border-radius: 12px; font-size: 14px; line-height: 1.6;
        }

        .user .message-text {
          background: #1e1b4b; color: #c7d2fe; border: 1px solid #312e81;
          border-bottom-right-radius: 2px;
        }

        .assistant .message-text {
          background: #0f172a; color: #cbd5e1; border: 1px solid #1e293b;
          border-top-left-radius: 2px;
        }

        .agent-badge {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: var(--accent-indigo); font-weight: 600;
        }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .dot.pulse { animation: pulse 1.5s infinite; }

        .message-meta { font-size: 9px; color: var(--text-dim); }
        .user .message-meta { text-align: right; }

        /* Badge Styles */
        .hcs-badge, .schedule-badge {
          margin-top: 4px; padding: 10px 14px; border-radius: 10px;
          display: flex; flex-direction: column; gap: 4px;
        }

        .hcs-badge { background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); }
        .hcs-header { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: #22c55e; letter-spacing: 0.05em; }
        .hcs-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }
        .hcs-link { font-size: 10px; color: #64748b; text-decoration: none; font-family: 'JetBrains Mono', monospace; }
        .hcs-link:hover { color: var(--accent-indigo); }

        .schedule-badge { background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); }
        .sch-header { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: #f59e0b; }
        .sch-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }
        .sch-link { font-size: 10px; color: #64748b; text-decoration: none; font-family: 'JetBrains Mono', monospace; }
      `}</style>
    </div>
  );
}

function AssistantMarkdown({ content }: { content: string }) {
  // Simple markdown-style renderer
  const lines = content.split('\n');
  return (
    <div className="md-rendered">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i}>{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i}>{line.substring(4)}</h3>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i}>{line.substring(2)}</li>;
        }
        return <p key={i}>{line}</p>;
      })}
      <style jsx>{`
        .md-rendered h2 { font-size: 16px; font-weight: 700; margin: 16px 0 8px; color: #fff; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
        .md-rendered h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: var(--accent-indigo); }
        .md-rendered p { margin-bottom: 10px; }
        .md-rendered li { margin: 4px 0 4px 16px; list-style-type: circle; }
      `}</style>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="typing-wrap">
      <div className="msg-avatar">W</div>
      <div className="typing-bubble">
        <div className="dot-pulse"></div>
        <span>AI is thinking...</span>
      </div>
      <style jsx>{`
        .typing-wrap { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
        .typing-bubble {
          background: #0f172a; border: 1px solid #1e293b; padding: 12px 20px;
          border-radius: 2px 12px 12px 12px; display: flex; align-items: center; gap: 12px;
          color: var(--text-dim); font-size: 12px;
        }
        .dot-pulse {
          width: 8px; height: 8px; border-radius: 50%; background: var(--accent-indigo);
          box-shadow: 0 0 10px var(--accent-indigo); animation: blink 1.2s infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
        .msg-avatar {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-indigo), var(--accent-violet));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 14px;
        }
      `}</style>
    </div>
  );
}
