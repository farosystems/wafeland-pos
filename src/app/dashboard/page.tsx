import { UserInfo } from "@/components/user-info";
import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <>
      <div>
        <UserInfo />
      </div>
      <div>
        <UserButton />
      </div>
    </>
  );
}
