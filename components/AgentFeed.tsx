"use client";

interface AgentEvent {
  agent: string;
  status: string;
  message: string;
  hcs_tx?: string | null;
  topic?: string | null;
  data?: any;
  verdict?: string;
}

interface AgentFeedProps {
  events: AgentEvent[];
  isLoading?: boolean;
}

export default function AgentFeed({ events, isLoading }: AgentFeedProps) {
  if (!events || events.length === 0) return null;

  const doneEvents = events.filter(e => e.status === "done");

  const agentIcons: Record<string, string> = {
    "Market Scout": "🔍",
    "Strategy Advisor": "🧠",
    "Risk Auditor": "🛡️",
  };

  const verdictColor = (verdict?: string) => {
    if (!verdict) return "#a78bfa";
    if (verdict.includes("SAFE")) return "#22c55e";
    if (verdict.includes("CAUTION")) return "#f59e0b";
    if (verdict.includes("HIGH RISK")) return "#ef4444";
    return "#a78bfa";
  };

  return (
    <div style={{
      background: "rgba(167,139,250,0.05)",
      border: "1px solid rgba(167,139,250,0.2)",
      borderRadius: "8px",
      padding: "12px",
      marginBottom: "12px",
      fontFamily: "monospace"
    }}>
      <div style={{ color: "#a78bfa", fontSize: "11px", marginBottom: "8px" }}>
        ⚡ AGENT NETWORK — {doneEvents.length}/3 COMPLETE
      </div>

      {["Market Scout", "Strategy Advisor", "Risk Auditor"].map((agentName) => {
        const running = events.find(e => e.agent === agentName && e.status === "running");
        const done = events.find(e => e.agent === agentName && e.status === "done");
        const event = done || running;

        return (
          <div key={agentName} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}>
            {/* Status dot */}
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              marginTop: "4px",
              flexShrink: 0,
              background: done ? "#22c55e" : running ? "#f59e0b" : "#374151"
            }} />

            <div style={{ flex: 1 }}>
              {/* Agent name */}
              <div style={{ color: "#e5e7eb", fontSize: "12px", fontWeight: "bold" }}>
                {agentIcons[agentName] || "🤖"} {agentName}
                {done && (
                  <span style={{ color: "#22c55e", marginLeft: "8px", fontSize: "11px" }}>
                    ✓ DONE
                  </span>
                )}
                {running && !done && (
                  <span style={{ color: "#f59e0b", marginLeft: "8px", fontSize: "11px" }}>
                    ⟳ RUNNING
                  </span>
                )}
              </div>

              {/* Message */}
              {event && (
                <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px" }}>
                  {event.message}
                </div>
              )}

              {/* Verdict for Risk Auditor */}
              {done?.verdict && (
                <div style={{
                  color: verdictColor(done.verdict),
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginTop: "4px"
                }}>
                  VERDICT: {done.verdict}
                </div>
              )}

              {/* HCS tx hash */}
              {done?.hcs_tx && (
                <div style={{ marginTop: "4px" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    color: "#22c55e"
                  }}>
                    <span style={{
                      width: "6px", height: "6px",
                      borderRadius: "50%",
                      background: "#22c55e",
                      display: "inline-block"
                    }} />
                    LOGGED ON HEDERA
                    <a
                      href={`https://hashscan.io/testnet/transaction/${done.hcs_tx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#22c55e", textDecoration: "underline" }}
                    >
                      {String(done.hcs_tx).substring(0, 30)}...
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "8px" }}>
          Agents processing...
        </div>
      )}
    </div>
  );
}
