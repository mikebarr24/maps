import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-border bg-surface px-6 py-4 text-foreground">
      <ul className="flex gap-4">
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <Link href="/maps">Maps</Link>
        </li>
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      </ul>
    </nav>
  );
}
