import type { BurnReadinessResponse } from "../lib/types";

type BurnReadinessProps = {
  loading: boolean;
  data: BurnReadinessResponse | null;
};

export default function BurnReadiness({
  loading,
  data,
}: BurnReadinessProps) {
  if (!loading && !data) return null;

  return (
    <section style={{ margin: "0 20px 32px" }}>
      <div
        style={{
          borderRadius: "var(--radius)",
          border: `2px solid ${
            data
              ? data.ready
                ? "var(--pass)"
                : "var(--fail)"
              : "var(--paper-line)"
          }`,
          background: data
            ? data.ready
              ? "var(--pass-bg)"
              : "var(--fail-bg)"
            : "var(--paper)",
          padding: "16px 20px",
        }}
      >
        {loading && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              margin: 0,
            }}
          >
            Checking burn readiness…
          </p>
        )}

        {!loading && data && (
          <>
            <h2
              style={{
                margin: "0 0 8px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "16px",
                color: data.ready
                  ? "var(--pass)"
                  : "var(--fail)",
              }}
            >
              {data.ready
                ? "Preparation checks complete"
                : "Preparation checks incomplete"}
            </h2>


            {data.actions.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  margin: 0,
                }}
              >
                No outstanding preparation actions detected.
                Complete the final manual checks before burning.
              </p>
            ) : (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "20px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                }}
              >
                {data.actions
                  .slice()
                  .sort((a, b) =>
                    a.priority === b.priority
                      ? 0
                      : a.priority === "required"
                      ? -1
                      : 1
                  )
                  .map((action, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: "5px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontSize: "10px",
                          marginRight: "6px",
                        }}
                      >
                        {action.priority}
                      </span>

                      {action.action}
                    </li>
                  ))}
              </ul>
            )}


            <div
              style={{
                marginTop: "14px",
                paddingTop: "10px",
                borderTop: "1px solid var(--paper-line)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--ink-soft)",
              }}
            >
              Final checks before burning:
              <ul style={{ marginTop: "6px", paddingLeft: "18px" }}>
                <li>Weather forecast reviewed</li>
                <li>Fire Danger Rating checked</li>
                <li>Landowners/occupiers notified</li>
                <li>SFRS Control Centre notified before burning</li>
              </ul>
            </div>


            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--ink-soft)",
                marginTop: "10px",
                marginBottom: 0,
              }}
            >
              This checklist supports the licence holder's decision-making.
              It does not replace required judgement, training, or official
              guidance.
            </p>
          </>
        )}
      </div>
    </section>
  );
}