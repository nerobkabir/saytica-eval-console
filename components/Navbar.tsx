"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const path = usePathname();

  return (
    <header
      style={{
        background: "rgba(17,19,24,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--accent)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="#0a0c10" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="#0a0c10" opacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="#0a0c10" opacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="#0a0c10" />
            </svg>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "0.05em",
            }}
          >
            SAYTICA
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              paddingLeft: 8,
              borderLeft: "1px solid var(--border-bright)",
              marginLeft: 2,
            }}
          >
            Eval Console
          </span>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          <NavLink href="/" active={path === "/"} label="Leaderboard" />
          <NavLink href="/tasks" active={path === "/tasks"} label="Task Board" />
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? "var(--accent)" : "var(--text-secondary)",
        background: active ? "var(--accent-dim)" : "transparent",
        border: active ? "1px solid rgba(74,222,128,0.2)" : "1px solid transparent",
        textDecoration: "none",
        transition: "all 0.15s",
      }}
    >
      {label}
    </Link>
  );
}
