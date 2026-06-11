import { SignIn } from "@clerk/nextjs";
import { PublicShell } from "@/components/public-shell";

export default function Page() {
  return (
    <PublicShell>
      <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
        <SignIn />
      </div>
    </PublicShell>
  );
}
