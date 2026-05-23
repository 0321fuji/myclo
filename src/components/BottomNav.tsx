"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shirt, Settings } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "ホーム" },
  { href: "/closet", icon: Shirt, label: "クローゼット" },
  { href: "/settings", icon: Settings, label: "設定" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-50 max-w-md mx-auto">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-colors ${
                isActive ? "text-rose-400" : "text-stone-400"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-bottom" />
    </nav>
  );
}
