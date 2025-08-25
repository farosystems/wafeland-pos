import { AppSidebar } from "@/components/app-sidebar";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

import { RouteGuard } from "@/components/route-guard";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <head>
          <link rel="icon" type="image/png" href="/favicon.png" />
        </head>
        <body className="flex h-screen">
            <SidebarProvider>
              <RouteGuard>
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-0">
                  <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
                  <footer className="py-2 text-center text-xs text-gray-400 border-t bg-gray-50">
                    Los derechos de política y privacidad son de FaroAi
                  </footer>
                </div>
              </RouteGuard>
            </SidebarProvider>
        </body>
      </html>
      <Toaster position="top-right" richColors />
    </ClerkProvider>
  );
}
