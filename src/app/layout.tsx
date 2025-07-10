import { AppSidebar } from "@/components/app-sidebar";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className="flex h-screen">
          <SidebarProvider>
            <AppSidebar />
            <div className="flex flex-col flex-1 min-h-0">
              <header className="flex items-center justify-end h-16 px-6 border-b bg-white">
                {/* <UserButton afterSignOutUrl="/sign-in" /> */}
              </header>
              <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
            </div>
          </SidebarProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
