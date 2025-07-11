"use client";

import {
  IconHome,
  IconPackage,
  IconCalendar,
  IconSearch,
  IconSettings,
  IconCash,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: IconHome,
  },
  {
    label: "Productos",
    href: "/articles",
    icon: IconPackage,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: IconCalendar,
  },
  {
    label: "Usuarios",
    href: "/usuarios",
    icon: User,
  },
  {
    label: "Ventas",
    href: "/ventas",
    icon: IconSearch,
  },
  {
    label: "Informes",
    href: "/informes",
    icon: IconSettings,
  },
  {
    label: "Caja",
    href: "/caja",
    icon: IconCash,
  },
];


export function AppSidebar() {
  const { user, isSignedIn, isLoaded } = useUser();
  return (
    <aside className="flex flex-col h-full w-60 bg-white border-r">
      <div className="px-4 py-4 text-xs font-bold tracking-widest text-gray-700">
        FARO POS DEMO
      </div>
      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors text-gray-800"
                prefetch={false}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto p-4 flex items-center gap-2">
        <UserButton afterSignOutUrl="/sign-in" />
        {isLoaded && isSignedIn && (
          <span className="text-sm font-medium">Hola, {user.firstName}</span>
        )}
      </div>
    </aside>
  );
 }

