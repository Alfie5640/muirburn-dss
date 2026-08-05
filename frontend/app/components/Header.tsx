export default function Header() {
  return (
    <header
      style={{
        background: "var(--moor-900)",
        color: "var(--paper)",
        padding: "20px 28px",
        borderBottom: "3px solid var(--moor-700)",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "22px",
            letterSpacing: "0.01em",
          }}
        >
          Muirburn Decision-Support Tool
        </h1>
        <p
        style={{
          margin: "4px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--paper-line)",
          opacity: 0.85,
        }}
      >
        Pre-burn compliance check. Rules gathered from{" "}
        <a
          href="https://www.nature.scot/doc/guidance-muirburn-code"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--paper)",
            textDecoration: "underline",
          }}
        >
          Muirburn Code
        </a>
        . Not a substitute for official guidance or legal advice.
      </p>
      </div>
    </header>
  );
}