import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-center">
        Welcome back to <span className="text-gradient">Ragebait</span>
      </h1>
      <p className="mt-2 text-center text-sm text-white/50">
        Log in with your username or email
      </p>

      <Card className="mt-8">
        <form className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-white/70">
              Username or email
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
              placeholder="VoidRoaster or you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-white/50">
              <input type="checkbox" className="rounded border-line bg-surface2" />
              Remember me
            </label>
            <Link href="#" className="text-aura-blue hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Log in
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-white/50">
        New to Ragebait?{" "}
        <Link href="/signup" className="text-aura-blue hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
