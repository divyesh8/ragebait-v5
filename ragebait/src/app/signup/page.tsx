import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-center">
        Join <span className="text-gradient">Ragebait</span>
      </h1>
      <p className="mt-2 text-center text-sm text-white/50">
        Your Aura starts at zero. Make it count.
      </p>

      <Card className="mt-8">
        <form className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white/70">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
              placeholder="Pick something unique"
            />
            <p className="mt-1 text-xs text-white/30">
              Usernames are unique platform-wide — no duplicates allowed.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
              placeholder="you@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70">
                Confirm
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-white/70">
              Date of birth
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white focus-visible:border-aura-purple"
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Create account
          </Button>

          <p className="text-center text-xs text-white/30">
            We'll send a one-time code to verify your email before you can battle.
          </p>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="text-aura-blue hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
