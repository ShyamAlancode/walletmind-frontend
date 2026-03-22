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
  token_count: number; tx_count_30d: number; txCount30d?: number; evm_address: string;
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
  const [showTools, setShowTools] = useState(false);
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
        body: JSON.stringify({ 
          wallet_address: addr, 
          question: q 
        }),
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
  const hasMessages = messages.length > 1;

  return (
    <div className="saas-root">
      {/* Header */}
      <header className="saas-header">
        <div className="h-left">
          <div className="logo-box">W</div>
          <div className="brand-group">
            <span className="brand-name">WALLETMIND</span>
            <span className="brand-subtitle">VERIFIABLE AI DEFI COPILOT</span>
          </div>
        </div>
        <div className="h-right">
          <div className="testnet-badge">
            <div className="pulse-dot"></div>
            TESTNET LIVE
          </div>
        </div>
      </header>

      <div className="saas-main-layout">
        {/* Sidebar */}
        <aside className="saas-sidebar">
          <div className="sidebar-scroll">
            <section className="wallet-section">
              <label className="sidebar-label">WALLET ADDRESS</label>
              <input 
                value={wallet} 
                onChange={e => setWallet(e.target.value)} 
                placeholder="0.0.8307413" 
                onKeyDown={handleKey}
                className="wallet-field"
              />
            </section>

            <section className="stats-section">
              <SidebarStat 
                label="HBAR BALANCE" 
                value={walletData ? walletData.hbar_balance.toLocaleString() : "—"} 
                suffix="ℏ" 
                subValue={walletData ? `$${(walletData.hbar_balance * 0.065).toFixed(2)} USD` : ""} 
                empty={!walletData}
              />
              <SidebarStat 
                label="TOTAL ASSETS" 
                value={walletData ? `${walletData.token_count}` : "0"} 
                suffix="tokens" 
                empty={!walletData}
              />
              <SidebarStat 
                label="30D ACTIVITY" 
                value={walletData ? `${walletData?.tx_count_30d ?? walletData?.txCount30d ?? 0}` : "0"} 
                suffix="transactions" 
                empty={!walletData}
              />
            </section>

            {walletData?.tokens && walletData.tokens.length > 0 && (
              <section className="asset-list-section">
                <label className="sidebar-label">TOP INTERESTS</label>
                <div className="asset-list">
                  {walletData.tokens.slice(0, 5).map(t => (
                    <div key={t.token_id} className="asset-item">
                      <span className="asset-sym">{t.symbol}</span>
                      <span className="asset-val">{t.balance?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="queries-section">
              <label className="sidebar-label">QUICK QUERIES</label>
              <div className="query-stack">
                {["Yield strategy?", "Risk exposure?", "SaucerSwap LP?", "Opportunities?"].map(q => (
                  <button key={q} onClick={() => setQuestion(q)} className="query-pill">
                    {q}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* Content Area */}
        <main className="saas-content">
          {!hasMessages && !loading ? (
            <div className="hero-state">
              <div className="hero-logo-glowing">W</div>
              <h2 className="hero-title-new">Paste a wallet address to begin</h2>
              <p className="hero-subtitle-new">Every analysis is permanently logged on Hedera Consensus Service</p>
              <div className="hero-pills">
                <div className="hero-pill">● MIRROR NODE LIVE</div>
                <div className="hero-pill">● GROQ 3.3 70B</div>
                <div className="hero-pill">● HCS IMMUTABLE</div>
              </div>
            </div>
          ) : (
            <div className="chat-feed">
              {messages.slice(1).map((msg, i) => (
                <MessageItem key={i} message={msg} />
              ))}
              {loading && <LoadingPrompt />}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Fixed Input Bar */}
          <div className="bottom-dock">
            <div className="dock-inner">
              <div className="input-container">
                {error && <div className="inline-error">{error}</div>}
                <div className="input-row">
                  <input 
                    value={question} 
                    onChange={e => setQuestion(e.target.value)} 
                    onKeyDown={handleKey}
                    placeholder="/Ask about yields, risks, or strategies..."
                    className="saas-input"
                  />
                  <button 
                    onClick={analyzeWallet} 
                    disabled={loading || !isValidWallet}
                    className={`saas-btn ${loading ? 'loading' : ''} ${isValidWallet && !loading ? 'active' : ''}`}
                  >
                    {loading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="btn-spinner"></div>
                        <span>ANALYZING...</span>
                      </div>
                    ) : (
                      "ANALYZE NOW →"
                    )}
                  </button>
                </div>
                <div className="dock-footer">
                  <button onClick={() => setShowTools(!showTools)} className="tools-toggle">
                    {showTools ? "CLOSE TOOLS" : "AGENT TOOLS"} {showTools ? "↓" : "↑"}
                  </button>
                  {stats && (
                    <div className="global-stats">
                      <span>{stats.total_analyses} analyses</span>
                      <span>{stats.hcs_messages_logged} logged on-chain</span>
                    </div>
                  )}
                </div>
              </div>

              {showTools && (
                <div className="agent-tools-panel">
                  {["Mirror Node", "Exchange API", "DeFi Protocols", "HCS Logging", "Scheduled Tx"].map(t => (
                    <div key={t} className="tool-chip">
                      <div className="dot green"></div>
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          --bg-black: #000000;
          --bg-side: #0a0a0a;
          --border: #1a1a1a;
          --text-high: #ffffff;
          --text-main: #d4d4d4;
          --text-dim: #525252;
          --text-label: #404040;
          --accent: #7c3aed;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-black); color: var(--text-main); font-family: 'Inter', sans-serif; overflow: hidden; }

        .saas-root { height: 100vh; display: flex; flex-direction: column; }

        /* Header */
        .saas-header {
          height: 48px; border-bottom: 1px solid #141414; padding: 0 24px;
          display: flex; align-items: center; justify-content: space-between; background: var(--bg-black);
        }
        .h-left { display: flex; align-items: center; gap: 12px; }
        .logo-box {
          width: 28px; height: 28px; background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border-radius: 4px; display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 16px;
        }
        .brand-group { display: flex; flex-direction: column; }
        .brand-name { font-size: 13px; font-weight: 700; letter-spacing: 0.15em; color: #fff; }
        .brand-subtitle { font-size: 9px; color: var(--text-label); letter-spacing: 0.1em; }
        
        .testnet-badge {
          display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 600;
          color: #22c55e; border: 1px solid #166534; padding: 4px 10px; border-radius: 4px;
        }
        .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }

        /* Layout */
        .saas-main-layout { flex: 1; display: flex; overflow: hidden; }

        .saas-sidebar {
          width: 300px; border-right: 1px solid var(--border); background: var(--bg-side);
          display: flex; flex-direction: column;
        }
        .sidebar-scroll { flex: 1; overflow-y: auto; padding: 32px 24px; }

        .sidebar-label { display: block; font-size: 9px; color: var(--text-label); letter-spacing: 0.12em; margin-bottom: 12px; }

        .wallet-section { margin-bottom: 40px; }
        .wallet-field {
          width: 100%; background: #111111; border: none; border-bottom: 1px solid #262626;
          padding: 8px 0; color: #fff; font-family: 'JetBrains Mono', monospace;
          outline: none; transition: border-color 0.2s; font-size: 14px;
        }
        .wallet-field:focus { border-color: var(--accent); }

        .stats-section { display: flex; flex-direction: column; gap: 32px; margin-bottom: 40px; }
        .side-stat { border-left: 2px solid var(--accent); padding-left: 16px; }
        .ss-val-row { display: flex; align-items: baseline; gap: 6px; margin: 4px 0; }
        .ss-val { font-size: 22px; font-weight: 600; color: #fff; line-height: 1; }
        .ss-suffix { font-size: 14px; color: var(--text-dim); }
        .ss-sub { font-size: 11px; color: var(--text-dim); }

        .asset-list-section { margin-bottom: 40px; }
        .asset-list { display: flex; flex-direction: column; gap: 8px; }
        .asset-item { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); }
        .asset-sym { font-weight: 600; }
        .asset-val { font-family: 'JetBrains Mono', monospace; }

        .query-stack { display: flex; flex-direction: column; gap: 6px; }
        .query-pill {
          width: 100%; text-align: left; background: transparent; border: 1px solid transparent;
          color: var(--text-label); font-size: 12px; padding: 6px 0; cursor: pointer;
        }
        .query-pill:hover { color: #fff; }

        /* Main Area */
        .saas-content {
          flex: 1; background: var(--bg-black); position: relative;
          background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 24px 24px;
          display: flex; flex-direction: column;
        }

        .hero-state {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding-bottom: 100px;
        }
        .hero-logo-glowing {
          width: 64px; height: 64px; background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-weight: 800; color: white; font-size: 32px; margin-bottom: 24px;
          box-shadow: 0 0 80px rgba(124,58,237,0.15);
        }
        .hero-title-new { font-size: 18px; font-weight: 500; color: #fff; margin-bottom: 8px; }
        .hero-subtitle-new { font-size: 13px; color: #525252; margin-bottom: 32px; }
        .hero-pills { display: flex; gap: 12px; }
        .hero-pill { 
          background: #111; border: 1px solid #222; text-shadow: none;
          color: #666; font-size: 11px; font-weight: 500;
          padding: 6px 14px; border-radius: 20px;
        }

        .chat-feed { 
          height: calc(100vh - 120px);
          overflow-y: auto; 
          scroll-behavior: smooth;
          padding: 48px 10% 120px; 
          display: flex; 
          flex-direction: column; 
          gap: 48px; 
        }

        .bottom-dock {
          padding: 24px 10%; background: linear-gradient(to top, var(--bg-black), transparent);
          z-index: 10;
        }
        .dock-inner {
          background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 12px;
          padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .input-row { display: flex; gap: 12px; }
        .saas-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: #fff; font-size: 14px; padding: 8px 12px;
        }
        .saas-input::placeholder { color: var(--text-dim); }

        .saas-btn {
          background: #7c3aed; color: #white; border: none; padding: 0 20px;
          border-radius: 6px; font-size: 12px; font-weight: 700; cursor: not-allowed;
          letter-spacing: 0.1em; transition: all 0.2s; opacity: 0.5;
        }
        .saas-btn.active { opacity: 1; cursor: pointer; }
        .saas-btn.active:hover { background: #6d28d9; box-shadow: 0 0 16px rgba(124,58,237,0.5); }

        .dock-footer {
          margin-top: 10px; padding: 8px 12px 0; border-top: 1px solid #1a1a1a;
          display: flex; justify-content: space-between; align-items: center;
        }
        .tools-toggle { background: transparent; border: none; color: var(--text-dim); font-size: 9px; font-weight: 700; cursor: pointer; letter-spacing: 0.05em; }
        .tools-toggle:hover { color: #fff; }
        .global-stats { font-size: 9px; color: var(--text-label); display: flex; gap: 16px; font-weight: 500; }

        .agent-tools-panel {
          padding: 12px; background: #080808; border-top: 1px solid #141414; margin-top: 12px;
          display: flex; flex-wrap: wrap; gap: 12px;
        }
        .tool-chip { display: flex; align-items: center; gap: 8px; font-size: 10px; color: #888; }
        .dot { width: 5px; height: 5px; border-radius: 50%; }
        .dot.green { background: #22c55e; }

        .inline-error { color: #ef4444; font-size: 11px; padding: 0 12px 8px; }

        .btn-spinner {
          width: 14px; height: 14px; border: 2px solid transparent; 
          border-top-color: white; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }

        @media (max-width: 1024px) {
          .saas-main-layout { flex-direction: column; overflow-y: auto; }
          .saas-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); }
          .chat-feed { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}

function SidebarStat({ label, value, suffix, subValue, empty }: { label: string; value: string; suffix: string; subValue?: string; empty?: boolean }) {
  return (
    <div className="side-stat">
      <label className="sidebar-label">{label}</label>
      <div className="ss-val-row">
        <span className={`ss-val ${empty ? 'empty' : ''}`}>{value}</span>
        {!empty && <span className="ss-suffix">{suffix}</span>}
      </div>
      {subValue && <div className="ss-sub">{subValue}</div>}
      <style jsx>{`
        .ss-val.empty { color: #2a2a2a; font-weight: 400; }
        .ss-val { font-size: 20px; font-weight: 700; color: #fff; line-height: 1; }
        .ss-sub { font-size: 12px; color: #525252; margin-top: 4px; }
      `}</style>
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) return (
    <div className="user-msg-wrap">
      <div className="user-msg">{message.content}</div>
      <style jsx>{`
        .user-msg-wrap { display: flex; justify-content: flex-end; animation: fadeIn 0.3s ease; }
        .user-msg {
          background: #111111; border: 1px solid #1e1e1e; padding: 12px 16px;
          border-radius: 12px; border-bottom-right-radius: 4px;
          color: var(--text-high); font-size: 14px; max-width: 70%;
        }
      `}</style>
    </div>
  );

  return (
    <div className="ai-res-wrap">
      <div className="ai-body">
        <AiContent content={message.content} />
      </div>

      <div className="ai-metadata">
        {message.agentSteps !== undefined && message.agentSteps > 0 && (
          <div className="meta-badge steps">
            ● Used {message.agentSteps} Hedera tools
          </div>
        )}

        {message.txHash && (
          <div className="meta-badge hcs">
            <div className="dot pulse"></div>
            VERIFIED ON HEDERA · {message.txHash.substring(0, 8)}...{message.txHash.substring(message.txHash.length - 8)}
            <a href={`https://hashscan.io/testnet/transaction/${message.txHash}`} target="_blank" rel="noopener noreferrer" className="hcs-link-icon">
              ↗
            </a>
          </div>
        )}

        {message.scheduleId && (
          <div className="meta-badge sch">
            ● STRATEGY SCHEDULED: {message.scheduleId}
          </div>
        )}
      </div>

      <style jsx>{`
        .ai-res-wrap { animation: fadeIn 0.4s ease; transition: all 0.2s; }
        .ai-body { color: var(--text-main); font-size: 14px; line-height: 1.8; }
        
        .ai-metadata { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px; }
        .meta-badge {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid #1a1a1a;
          padding: 6px 12px; border-radius: 20px; font-size: 10px; font-weight: 500;
          color: #888;
        }

        .meta-badge.hcs {
          background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.15);
          color: #22c55e; font-family: 'JetBrains Mono', monospace; font-size: 11px;
        }
        .dot.pulse { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse-kf 2s infinite; }
        @keyframes pulse-kf { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .hcs-link-icon { color: inherit; text-decoration: none; margin-left: 4px; opacity: 0.7; }
        .hcs-link-icon:hover { opacity: 1; }
      `}</style>
    </div>
  );
}

function AiContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="md-content">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i}>{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i}>{line.substring(4)}</h3>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i}><Highlighted line={line.substring(2)} /></li>;
        }
        return <p key={i}><Highlighted line={line} /></p>;
      })}
      <style jsx>{`
        .md-content h2 { 
          font-size: 11px; font-weight: 700; color: #525252; text-transform: uppercase; 
          letter-spacing: 0.12em; margin: 32px 0 12px; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px; 
        }
        .md-content h3 { font-size: 13px; font-weight: 600; color: #fff; margin: 24px 0 8px; }
        .md-content p { margin-bottom: 12px; }
        .md-content li { margin: 8px 0 8px 16px; list-style-type: none; position: relative; }
        .md-content li::before { content: "●"; position: absolute; left: -16px; color: var(--accent); font-size: 8px; top: 8px; }
      `}</style>
    </div>
  );
}

function Highlighted({ line }: { line: string }) {
  // Simple regex to find numbers and currencies for highlighting
  const parts = line.split(/(\d+\.?\d*[ℏ$]|\d+\%)/g);
  return (
    <>
      {parts.map((part, i) => (
        part.match(/(\d+\.?\d*[ℏ$]|\d+\%)/) ? 
        <span key={i} style={{ color: '#a78bfa', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{part}</span> : 
        part
      ))}
    </>
  );
}

function LoadingPrompt() {
  return (
    <div className="ai-res-wrap">
      <div className="loading-state">
        <div className="line-pulse"></div>
        <span className="loading-txt">WalletMind is analyzing network data...</span>
      </div>
      <style jsx>{`
        .loading-state { display: flex; align-items: center; gap: 16px; }
        .line-pulse { width: 40px; height: 2px; background: var(--accent); animation: width-pulse 1.5s infinite ease-in-out; }
        @keyframes width-pulse { 0%,100%{width:20px;opacity:0.3} 50%{width:60px;opacity:1} }
        .loading-txt { font-size: 13px; color: var(--text-dim); }
      `}</style>
    </div>
  );
}

function Spinner() { return <div className="spinner"></div>; }
