import type { BurnReadinessResponse } from "../lib/types";

type BurnReadinessProps = {
  loading: boolean;
  data: BurnReadinessResponse | null;
};

export default function BurnReadiness({ loading, data }: BurnReadinessProps) {
  if (!loading && !data) return null;

  return (
    <section style={{ margin: "0 20px 32px" }}>
      <div
        style={{
          borderRadius: "var(--radius)",
          border: `2px solid ${data ? (data.ready ? "var(--pass)" : "var(--fail)") : "var(--paper-line)"}`,
          background: data ? (data.ready ? "var(--pass-bg)" : "var(--fail-bg)") : "var(--paper)",
          padding: "16px 20px",
        }}
      >
        {loading && <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", margin: 0 }}>Assessing overall readiness…</p>}

        {!loading && data && (
          <>
            <h2
              style={{
                margin: "0 0 8px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "16px",
                color: data.ready ? "var(--pass)" : "var(--fail)",
              }}
            >
              {data.ready ? "No blocking issues — manual checks still required" : "Not ready to burn"}
            </h2>

            {data.actions.length === 0 && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", margin: 0 }}>
                All automated checks passed. Complete the manual checklist above before proceeding.
              </p>
            )}

            {data.actions.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: "20px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                {data.actions
                  .slice()
                  .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "required" ? -1 : 1))
                  .map((action, i) => (
                    <li key={i} style={{ marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "10px", marginRight: "6px" }}>
                        {action.priority}
                      </span>
                      {action.action}
                    </li>
                  ))}
              </ul>
            )}

            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-soft)", marginTop: "10px", marginBottom: 0 }}>
              Generated {new Date(data.generated).toLocaleString("en-GB")}. This tool supports judgement — it does not
              replace it. Final go/no-go remains with the licence holder.
            </p>
          </>
        )}
      </div>
    </section>
  );
}