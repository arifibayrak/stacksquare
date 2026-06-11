import { SignUp } from "@clerk/nextjs";
import { PublicShell } from "@/components/public-shell";

export default function Page() {
  return (
    <PublicShell>
      <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
        <SignUp />
      </div>
    </PublicShell>
  );
}
