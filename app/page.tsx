"use client";
import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  txHash?: string;
  walletData?: WalletData;
  timestamp: string;
};

type Token = {
  token_id: string;
  symbol: string;
  name: string;
  balance: number;
  type: string;
};

type WalletData = {
  account_id: string;
  hbar_balance: number;
  tokens: Token[];
  token_count: number;
  tx_count_30d: number;
  evm_address: string;
};

export default function WalletMind() {
  const [wallet, setWallet] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "WalletMind v1.0 — Personalized DeFi Intelligence on Hedera. Paste your wallet address to begin.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const analyzeWallet = async () => {
    const addr = wallet.trim();
    const q = question.trim() || "Give me a complete portfolio analysis and strategy.";
    const walletRegex = /^\d+\.\d+\.\d+$/;
    if (!addr) { setError("Enter a Hedera wallet address (e.g. 0.0.445523)"); return; }
    if (!walletRegex.test(addr)) { setError("Invalid format. Use Hedera format: 0.0.xxxxxx"); return; }
    setError("");
    setLoading(true);

    setMessages((m) => [...m, {
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }

      const data = await res.json();
      setWalletData(data.wallet_data);
      setMessages((m) => [...m, {
        role: "assistant",
        content: data.analysis,
        txHash: data.tx_hash,
        walletData: data.wallet_data,
        timestamp: data.timestamp,
      }]);
      setQuestion("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setMessages((m) => [...m, {
        role: "system",
        content: `Error: ${msg}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyzeWallet(); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      color: "#e2e8f0",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid #1e293b",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#030712",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "6px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: "700", color: "#fff",
          }}>W</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "0.05em", color: "#f1f5f9" }}>
              WALLETMIND
            </div>
            <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.1em" }}>
              HEDERA DeFi INTELLIGENCE
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: "11px", color: "#64748b" }}>TESTNET LIVE</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{
          width: "260px",
          borderRight: "1px solid #1e293b",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflowY: "auto",
        }}>
          <div>
            <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.15em", marginBottom: "10px" }}>
              WALLET ADDRESS
            </div>
            <input
              ref={inputRef}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0.0.xxxxxx"
              onKeyDown={handleKey}
              style={{
                width: "100%",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "6px",
                padding: "10px 12px",
                color: "#e2e8f0",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#6366f1"}
              onBlur={(e) => e.target.style.borderColor = "#1e293b"}
            />
          </div>

          {walletData && (
            <div style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "14px",
            }}>
              <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.15em", marginBottom: "12px" }}>
                PORTFOLIO SNAPSHOT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <StatRow label="HBAR" value={`${walletData.hbar_balance.toLocaleString()} ℏ`} accent="#a78bfa" />
                <StatRow label="TOKENS" value={`${walletData.token_count} assets`} accent="#34d399" />
                <StatRow label="TXS (30D)" value={`${walletData.tx_count_30d}`} accent="#60a5fa" />
              </div>
              {walletData.tokens.length > 0 && (
                <div style={{ marginTop: "12px", borderTop: "1px solid #1e293b", paddingTop: "12px" }}>
                  {walletData.tokens.slice(0, 5).map((t) => (
                    <div key={t.token_id} style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: "11px", marginBottom: "5px",
                    }}>
                      <span style={{ color: "#94a3b8" }}>{t.symbol}</span>
                      <span style={{ color: "#e2e8f0" }}>{t.balance.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.15em", marginBottom: "8px" }}>
              QUICK QUESTIONS
            </div>
            {[
              "Best yield strategy for my holdings?",
              "What are my risk exposures?",
              "Should I rebalance?",
              "Top DeFi opportunities on Hedera?",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: question === q ? "#1e1b4b" : "transparent",
                  border: `1px solid ${question === q ? "#6366f1" : "#1e293b"}`,
                  borderRadius: "5px",
                  padding: "7px 10px",
                  color: question === q ? "#a78bfa" : "#64748b",
                  fontSize: "11px",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  marginBottom: "5px",
                  transition: "all 0.15s",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </aside>

        {/* Main chat */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && <LoadingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            borderTop: "1px solid #1e293b",
            padding: "16px 24px",
            background: "#030712",
          }}>
            {error && (
              <div style={{
                background: "#1a0a0a",
                border: "1px solid #7f1d1d",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#fca5a5",
                fontSize: "12px",
                marginBottom: "12px",
              }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your portfolio... or press Enter to run full analysis"
                style={{
                  flex: 1,
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "#1e293b"}
              />
              <button
                onClick={analyzeWallet}
                disabled={loading || !wallet.trim()}
                style={{
                  background: loading || !wallet.trim() ? "#1e293b" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  color: loading || !wallet.trim() ? "#475569" : "#fff",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  fontWeight: "600",
                  cursor: loading || !wallet.trim() ? "not-allowed" : "pointer",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "ANALYZING..." : "ANALYZE →"}
              </button>
            </div>
            <div style={{ fontSize: "10px", color: "#334155", marginTop: "8px", textAlign: "center" }}>
              Every analysis is immutably logged on Hedera blockchain · Powered by Claude AI
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
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: "12px", color: accent, fontWeight: "600" }}>{value}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  if (isSystem) {
    return (
      <div style={{
        textAlign: "center",
        color: "#334155",
        fontSize: "11px",
        marginBottom: "20px",
        letterSpacing: "0.05em",
        animation: "fadeIn 0.3s ease",
      }}>
        <span style={{ background: "#0f172a", padding: "4px 12px", borderRadius: "20px", border: "1px solid #1e293b" }}>
          {message.content}
        </span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div style={{
        textAlign: "right",
        marginBottom: "16px",
        animation: "fadeIn 0.3s ease",
      }}>
        <div style={{
          display: "inline-block",
          background: "#1e1b4b",
          border: "1px solid #3730a3",
          borderRadius: "8px 8px 2px 8px",
          padding: "10px 14px",
          maxWidth: "70%",
          fontSize: "13px",
          color: "#c7d2fe",
          textAlign: "left",
        }}>
          {message.content}
        </div>
        <div style={{ fontSize: "10px", color: "#334155", marginTop: "4px" }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: "20px",
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
      }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "6px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: "700", color: "#fff",
          flexShrink: 0, marginTop: "2px",
        }}>W</div>
        <div style={{ flex: 1 }}>
          <div style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "2px 8px 8px 8px",
            padding: "14px 16px",
            fontSize: "13px",
            color: "#cbd5e1",
            lineHeight: "1.7",
            whiteSpace: "pre-wrap",
          }}>
            {message.content.split('\n').map((line, i) => (
              <span key={i} style={{display:'block', marginBottom: line.startsWith('## ') ? '8px' : '2px'}}>
                {line.startsWith('## ') ? (
                  <strong style={{color:'#a78bfa', fontSize:'14px'}}>{line.replace('## ','')}</strong>
                ) : line.startsWith('- ') || line.startsWith('* ') ? (
                  <span style={{paddingLeft:'12px'}}>• {line.slice(2)}</span>
                ) : line.replace(/\*\*(.*?)\*\*/g, '$1')}
              </span>
            ))}
          </div>
          {message.txHash && (
            <div style={{
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px #22c55e",
              }} />
              <span style={{ fontSize: "10px", color: "#475569" }}>LOGGED ON HEDERA:</span>
              <a
                href={`https://hashscan.io/testnet/transaction/${message.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "10px",
                  color: "#6366f1",
                  textDecoration: "none",
                  fontFamily: "inherit",
                  letterSpacing: "0.05em",
                }}
              >
                {message.txHash.substring(0, 30)}...
              </a>
            </div>
          )}
          <div style={{ fontSize: "10px", color: "#334155", marginTop: "4px" }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      marginBottom: "20px",
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "6px",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: "700", color: "#fff", flexShrink: 0,
      }}>W</div>
      <div style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "2px 8px 8px 8px",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#475569",
        fontSize: "12px",
      }}>
        <span>Fetching on-chain data</span>
        <span style={{ animation: "blink 1s infinite" }}>▋</span>
      </div>
    </div>
  );
}
