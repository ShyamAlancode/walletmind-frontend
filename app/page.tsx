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
              <span>ANALYZING {wallet.substring(0, 10)}...</span>
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
                label="HBAR BALANCE" 
                value={walletData ? `${walletData.hbar_balance.toLocaleString()} ℏ` : "—"} 
                color="hbar"
                active={!!walletData}
              />
              <StatCard 
                label="TOTAL ASSETS" 
                value={walletData ? `${walletData.token_count} assets` : "—"} 
                color="token"
                active={!!walletData}
              />
              <StatCard 
                label="30D ACTIVITY" 
                value={walletData ? `${walletData.tx_count_30d} TXs` : "—"} 
                color="activity"
                active={!!walletData}
              />
            </div>
          </section>

          <section className="token-list-section">
            <label className="section-label">KEY ASSETS</label>
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
                {loading ? "PRODUCING LOGS..." : "ANALYZE NOW →"}
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
            <label className="section-label">TERMINAL QUERIES</label>
            <div className="pill-grid">
              {["Best yield strategy?", "Risk exposure?", "SaucerSwap LP?", "DeFi opportunities?"].map(q => (
                <button key={q} onClick={() => setQuestion(q)} className="pill-btn">
                  {q}
                </button>
              ))}
            </div>
          </section>

          {stats && (
            <section className="network-stats-box">
              <label className="section-label">LIVE NETWORK STATS</label>
              <div className="network-stat">
                <span className="n-val">{stats.total_analyses}</span>
                <span className="n-lbl">ANALYSES</span>
              </div>
              <div className="network-stat">
                <span className="n-val">{stats.hcs_messages_logged}</span>
                <span className="n-lbl">ON-CHAIN LOGS</span>
              </div>
            </section>
          )}
        </aside>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --bg-main: #09090b;
          --bg-card: rgba(255, 255, 255, 0.03);
          --border: rgba(255, 255, 255, 0.08);
          --text-main: #ffffff;
          --text-dim: #a1a1aa;
          --text-muted: #52525b;
          --accent-violet: #7c3aed;
          --accent-indigo: #4f46e5;
          --accent-green: #22c55e;
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-main);
          z-index: 100;
        }

        .logo-section { display: flex; align-items: center; gap: 12px; }
        .logo-mark {
          width: 32px; height: 32px; border-radius: 4px;
          background: linear-gradient(135deg, var(--accent-violet), var(--accent-indigo));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 18px;
        }

        .brand-name { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: #fff; }
        .brand-tagline { font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; }

        .status-section { display: flex; align-items: center; gap: 20px; }
        .analyzing-status {
          display: flex; align-items: center; gap: 8px;
          color: var(--accent-violet); font-size: 10px; font-weight: 700;
          letter-spacing: 0.05em;
        }

        .testnet-indicator {
          display: flex; align-items: center; gap: 8px;
          background: rgba(34, 197, 94, 0.1); padding: 4px 12px;
          border-radius: 4px; border: 1px solid rgba(34, 197, 94, 0.3);
          font-size: 10px; font-weight: 700; color: var(--accent-green);
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
          background: var(--bg-main);
        }
        .right-sidebar { border-right: none; border-left: 1px solid var(--border); }

        .section-label {
          display: block; font-size: 10px; font-weight: 700;
          color: var(--text-muted); letter-spacing: 0.15em; margin-bottom: 16px;
          text-transform: uppercase;
        }

        .input-group { margin-bottom: 32px; }
        .input-wrapper { position: relative; }
        .wallet-input {
          width: 100%; background: #111113; border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px; padding: 12px 14px; color: #fff;
          font-family: 'JetBrains Mono', monospace; font-size: 13px;
          transition: all 0.2s; outline: none;
        }
        .wallet-input:focus { border-color: var(--accent-violet); }
        .wallet-input.invalid { border-color: #ef4444; }
        .wallet-input.valid { border-color: var(--accent-green); }
        .valid-check {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: var(--accent-green); font-size: 12px;
        }

        .input-hint { font-size: 10px; color: var(--text-muted); margin-top: 6px; }
        .input-hint.error { color: #f87171; }

        .stat-cards-grid { display: grid; gap: 12px; }
        .stat-card {
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border); 
          border-left: 3px solid var(--accent-violet);
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .stat-card.active { background: rgba(124, 58, 237, 0.05); }
        .sc-lbl { font-size: 9px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.1em; }
        .sc-val { font-size: 24px; font-weight: 700; margin: 4px 0; color: #fff; display: block; }

        .token-list { display: flex; flex-direction: column; gap: 4px; }
        .token-item {
          display: flex; justify-content: space-between; padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02); border-radius: 4px; font-size: 12px;
        }
        .token-sym { color: var(--text-dim); }
        .token-bal { font-family: 'JetBrains Mono', monospace; font-weight: 500; }

        .chat-container {
          display: flex; flex-direction: column; background: var(--bg-main);
          position: relative;
        }

        .messages-scroll {
          flex: 1; overflow-y: auto; padding: 40px;
          display: flex; flex-direction: column; gap: 32px;
        }

        .input-area {
          padding: 24px 40px; border-top: 1px solid var(--border);
          background: var(--bg-main);
        }

        .chat-input-wrapper {
          display: flex; gap: 12px; background: #111113;
          padding: 6px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .chat-input {
          flex: 1; background: transparent; border: none; padding: 10px 16px;
          color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 13px; outline: none;
        }
        .chat-input::placeholder { color: #3f3f46; }

        .analyze-btn {
          background: #27272a; color: #a1a1aa; padding: 0 24px;
          border: none; border-radius: 6px; font-weight: 700; font-size: 12px;
          cursor: not-allowed; transition: all 0.3s; white-space: nowrap;
          letter-spacing: 0.1em;
        }
        .analyze-btn.active {
          background: linear-gradient(135deg, var(--accent-violet), var(--accent-indigo));
          color: #fff; cursor: pointer;
        }
        .analyze-btn.active:hover {
          background: linear-gradient(135deg, #6d28d9, #4338ca);
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
        }

        .chat-meta { text-align: center; margin-top: 12px; font-size: 10px; color: var(--text-muted); }

        .tool-list { display: flex; flex-direction: column; gap: 4px; }
        .tool-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px;
          background: #000; border-left: 2px solid var(--border);
          transition: border-color 0.2s;
        }
        .tool-item:hover { border-color: var(--accent-violet); }
        .tool-item:hover .tool-name { color: #fff; }
        .tool-icon { font-size: 14px; opacity: 0.7; }
        .tool-name { flex: 1; font-size: 12px; color: var(--text-dim); transition: color 0.2s; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; opacity: 0.4; transition: opacity 0.3s; }
        .status-dot.active { 
          background: var(--accent-green); 
          box-shadow: 0 0 6px var(--accent-green); 
          opacity: 1;
        }

        .pill-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .pill-btn {
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); color: var(--text-dim);
          padding: 6px 12px; border-radius: 4px; font-size: 11px;
          cursor: pointer; transition: all 0.2s;
        }
        .pill-btn:hover { border-color: var(--accent-violet); color: #fff; background: rgba(124, 58, 237, 0.05); }

        .network-stats-box { 
          background: #000; padding: 24px; border-radius: 4px; 
          border-top: 2px solid var(--accent-violet);
        }
        .network-stat { margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px; }
        .n-val { font-size: 36px; font-weight: 800; color: #fff; line-height: 1; }
        .n-lbl { font-size: 10px; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-mini {
          width: 12px; height: 12px; border: 2px solid rgba(124, 58, 237, 0.1);
          border-top-color: var(--accent-violet); border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }

        @media (max-width: 1024px) {
          .layout-grid { grid-template-columns: 1fr; overflow-y: auto; }
          .sidebar, .chat-container { height: auto; overflow: visible; border: none; border-bottom: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color, active }: { label: string; value: string; color: string; active: boolean }) {
  return (
    <div className={`stat-card ${active ? 'active' : ''}`}>
      <span className="sc-lbl">{label}</span>
      <span className="sc-val">{value}</span>
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
        .system-msg-wrap { display: flex; justify-content: center; margin-bottom: 12px; }
        .system-msg {
          color: #3f3f46; font-size: 13px; text-align: center; max-width: 90%;
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
            <div className="dot"></div>
            AI used {message.agentSteps} local tools
          </div>
        )}

        {!isUser && message.txHash && (
          <div className="hcs-badge">
            <div className="hcs-header">
              <div className="hcs-dot"></div>
              <span>LOGGED ON HEDERA</span>
            </div>
            <a href={`https://hashscan.io/testnet/transaction/${message.txHash}`} target="_blank" rel="noopener noreferrer" className="hcs-link">
              {message.txHash.substring(0, 16)}...
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
              {message.scheduleId}
            </a>
          </div>
        )}

        <div className="message-meta">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <style jsx>{`
        .message-bubble-wrap { display: flex; gap: 16px; max-width: 90%; animation: fadeIn 0.4s ease-out; }
        .message-bubble-wrap.user { align-self: flex-end; flex-direction: row-reverse; }
        .message-bubble-wrap.assistant { align-self: flex-start; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .msg-avatar {
          width: 28px; height: 28px; border-radius: 4px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-violet), var(--accent-indigo));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 14px; margin-top: 4px;
        }

        .message-content-box { display: flex; flex-direction: column; gap: 8px; }

        .message-text {
          padding: 16px 24px; border-radius: 12px; font-size: 14px; line-height: 1.7;
          background: var(--bg-card); backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .user .message-text { background: rgba(124, 58, 237, 0.1); border-color: rgba(124, 58, 237, 0.2); }

        .agent-badge {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; color: var(--accent-violet); font-weight: 700;
          letter-spacing: 0.05em; margin-top: 4px;
        }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        .message-meta { font-size: 9px; color: var(--text-muted); }
        .user .message-meta { text-align: right; }

        /* Badge Styles */
        .hcs-badge, .schedule-badge {
          margin-top: 4px; padding: 10px 14px; border-radius: 6px;
          display: flex; align-items: center; gap: 12px;
          background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border);
        }

        .hcs-header, .sch-header { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; }
        .hcs-header { color: var(--accent-green); }
        .hcs-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
        
        .sch-header { color: #f59e0b; }
        .sch-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }

        .hcs-link, .sch-link { font-size: 10px; color: var(--text-muted); text-decoration: none; font-family: 'JetBrains Mono', monospace; }
        .hcs-link:hover, .sch-link:hover { color: #fff; }
      `}</style>
    </div>
  );
}

function AssistantMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="md-rendered">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i}>{line.substring(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i}>{line.substring(4)}</h3>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i}>{line.substring(2)}</li>;
        return <p key={i}>{line}</p>;
      })}
      <style jsx>{`
        .md-rendered h2 { font-size: 15px; font-weight: 700; margin: 20px 0 10px; color: #fff; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
        .md-rendered h3 { font-size: 13px; font-weight: 700; margin: 16px 0 8px; color: var(--accent-violet); text-transform: uppercase; letter-spacing: 0.05em; }
        .md-rendered p { margin-bottom: 12px; }
        .md-rendered li { margin: 6px 0 6px 16px; list-style-type: circle; }
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
        <span>Thinking...</span>
      </div>
      <style jsx>{`
        .typing-wrap { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; }
        .typing-bubble {
          background: var(--bg-card); border: 1px solid var(--border); padding: 12px 20px;
          border-radius: 12px; display: flex; align-items: center; gap: 12px;
          color: var(--text-dim); font-size: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .dot-pulse {
          width: 6px; height: 6px; border-radius: 50%; background: var(--accent-violet);
          animation: blink 1.2s infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .msg-avatar {
          width: 28px; height: 28px; border-radius: 4px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent-violet), var(--accent-indigo));
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 14px;
        }
      `}</style>
    </div>
  );
}
