//app/(app)/layout.tsx
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import { getViewerServer } from "@/lib/auth/viewer.server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children,}: Readonly<{ children: React.ReactNode }>) {
    const { user } = await getViewerServer();
    if (!user) redirect("/login");
    return (
    <div className="flex min-h-screen">
      <NavBar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header email={user.email ?? "-"} />
        <main className="flex-1 px-8 py-2">{children}</main>
      </div>
    </div>
    );
}