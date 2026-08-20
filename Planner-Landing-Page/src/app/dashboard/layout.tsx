import { LoginModal } from "@/components/landing/LoginModal";
import { UpsellModal } from "@/components/shared/UpsellModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LoginModal />
      <UpsellModal />
    </>
  );
}
