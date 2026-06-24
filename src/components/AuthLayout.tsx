import { useAuth } from "@/hooks/useAuth";
import { Outlet } from "react-router";
import { AuthLayoutSkeleton } from "./AuthLayoutSkeleton";
import { Button } from "./ui/button";
import { LOGIN_PATH } from "@/const";

export default function AuthLayout() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <AuthLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-center">
                Alice Chains
              </h1>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Sign in to start messaging with your contacts in real-time.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = LOGIN_PATH;
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
