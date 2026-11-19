"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ right }: { right?: React.ReactNode }) {
  const p = usePathname();
  const items = [
    ["/", "Today"],
    ["/review", "Weekly review"],
    ["/settings", "Settings"],
  ];
  return (
    <div className="top">
      <div className="row" style={{ gap: 18 }}>
        <Link href="/" className="wordmark">HUMAN 3.0</Link>
        <nav className="nav">
          {items.map(([href, label]) => (
            <Link key={href} href={href} className={p === href ? "on" : ""}>{label}</Link>
          ))}
        </nav>
      </div>
      {right}
    </div>
  );
}
