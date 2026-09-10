import { getSession, isAdminAuthed } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { BrandFooter } from "@/components/brand/brand-mark";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, isAdmin] = await Promise.all([getSession(), isAdminAuthed()]);
  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      }}
      isAdmin={isAdmin}
    >
      {children}
      <BrandFooter />
    </AppShell>
  );
}
