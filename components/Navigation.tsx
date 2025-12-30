"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Trades", path: "/trades" },
  { name: "Strategies", path: "/strategies" },
  { name: "Performance", path: "/performance" },
  { name: "Account", path: "/account" }
];

export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="bg-gray-900 text-white px-4 py-2 flex gap-6 shadow-md">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`hover:text-blue-400 transition-colors duration-200 ${
            pathname === item.path ? "text-blue-400 font-bold" : ""
          }`}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
