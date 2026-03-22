// components/AgentFeed.tsx
"use client";

interface AgentEvent {
  agent: string;
  status: "running" | "done";
  message: string;
  hcs_tx?: string;
  topic?: string;
  verdict?: string;
}

const agentColors: Record<string, string> = {
  "Market Scout": "#3b82f6",      // blue
  "Strategy Advisor": "#8b5cf6",  // purple
  "Risk Auditor": "#f59e0b",      // amber
};

const agentIcons: Record<string, string> = {
  "Market Scout": "🔍",
  "Strategy Advisor": "🧠",
  "Risk Auditor": "🛡️",
};

export default function AgentFeed({ events, isLoading }: { events: AgentEvent[], isLoading: boolean }) {
  if (events.length === 0 && !isLoading) return null;

  return (
    <div className="agent-feed" style={{ fontFamily: "'IBM Plex Mono', monospace", marginTop: "20px" }}>
      <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "12px", letterSpacing: "0.1em" }}>
        ◈ AGENT NETWORK — LIVE ACTIVITY
      </div>
      
      {events.map((event, i) => (
        <div key={i} style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          padding: "12px",
          border: `1px solid ${agentColors[event.agent]}33`,
          borderLeft: `3px solid ${agentColors[event.agent]}`,
          borderRadius: "4px",
          background: "#0a0a0a"
        }}>
          <div style={{ fontSize: "20px" }}>{agentIcons[event.agent]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: agentColors[event.agent], fontSize: "11px", fontWeight: "bold" }}>
                {event.agent.toUpperCase()}
              </span>
              <span style={{ color: event.status === "done" ? "#22c55e" : "#f59e0b", fontSize: "10px" }}>
                {event.status === "done" ? "● DONE" : "◌ RUNNING..."}
              </span>
            </div>
            <div style={{ color: "#d1d5db", fontSize: "12px", marginTop: "4px" }}>
              {event.message}
            </div>
            {event.hcs_tx && event.topic && (
              <a
                href={`https://hashscan.io/testnet/topic/${event.topic}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#6366f1", fontSize: "10px", textDecoration: "none", marginTop: "4px", display: "block" }}
              >
                ↗ HCS Topic {event.topic} — View on HashScan
              </a>
            )}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div style={{ color: "#6b7280", fontSize: "11px", animation: "pulse 1.5s infinite" }}>
          ◌ Agents communicating via Hedera HCS...
        </div>
      )}
    </div>
  );
}
