import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { ArticlesTable } from "@/components/articles/articles-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ArticlesContent } from "@/components/articles/articles-content";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">¡Bienvenidos al POS!</h1>
      <p className="text-muted-foreground text-lg">
        Gestiona tus productos, ventas y clientes desde un solo lugar.
      </p>
    </div>
  );
}
