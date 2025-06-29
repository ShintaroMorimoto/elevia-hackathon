import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Target } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { GoogleSignInButton, SignOutButton } from '@/components/auth-buttons';
import { getGoalsWithProgress } from '@/actions/goals';
import { GoalCard } from '@/components/goal-card';
import type { Goal } from '@/lib/db/schema';

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    return <LoginPage />;
  }

  if (!session?.user?.id) {
    return <LoginPage />;
  }

  return <DashboardPage user={session.user} userId={session.user.id} />;
}

function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Journey Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-sunrise/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-primary-daylight/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-24 h-24 bg-accent-purple/20 rounded-full blur-2xl animate-float"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <Card className="w-full max-w-md glass relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg overflow-hidden">
            <Image
              src="/logo.jpeg"
              alt="Elevia Logo"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-neutral-800">
            Elevia
          </CardTitle>
          <CardDescription className="text-lg text-neutral-700 mt-4">
            10xな成長を目指すためのOKRを一緒に作りましょう🚀
          </CardDescription>
          <div className="text-sm text-neutral-600 mb-2">
            あなたの夢が、現実的な計画に。
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <GoogleSignInButton />
          <div className="text-center">
            <div className="text-xs text-neutral-500">
              Googleアカウントで安全にログイン
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardPageProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userId: string;
}

async function DashboardPage({ user, userId }: DashboardPageProps) {
  // Fetch actual goals from database with calculated progress
  const goalsResult = await getGoalsWithProgress(userId);
  const goals = goalsResult.success ? goalsResult.data : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 relative overflow-hidden">
      {/* Journey Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-20 w-64 h-64 bg-gradient-sunrise opacity-10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-daylight opacity-10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* Header with Horizon Journey Theme */}
      <header className="glass border-b border-white/20 px-6 py-4 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto min-h-[60px]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-primary overflow-hidden flex-shrink-0">
              <Image
                src="/logo.jpeg"
                alt="Elevia Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-dawn to-primary-sunrise bg-clip-text text-transparent leading-none">
                My Journey
              </h1>
              {user?.name && (
                <p className="text-sm text-neutral-600 leading-none mt-1">
                  {user.name}さんの10xな成長への旅🚀
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-4xl mx-auto relative z-10">
        {/* Hero Section */}
        {goals.length > 0 && (
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold text-neutral-800 mb-4">
              OKR一覧
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              千里の道も一歩から🚶‍♂️
            </p>
          </div>
        )}

        {/* Goals Grid */}
        <div className="grid gap-6">
          {goals.map((goal: Goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>

        {/* Call to Action Section */}
        {goals.length === 0 ? (
          <div className="text-center py-16">
            <Card className="border-dashed border-2 border-primary-sunrise/30 bg-gradient-to-br from-white/80 to-primary-sunrise/5 glass">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-sunrise rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-primary animate-glow">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-800 mb-4">
                  ワクワクするOKRを一緒に作りましょう🚀
                </h3>
                <Link href="/goals/new">
                  <Button size="lg" className="px-8 py-4 text-lg font-medium">
                    OKRを作成する
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <Card className="border-dashed border-2 border-neutral-300 bg-white/60 glass">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-700 mb-3">
                  今のOKRに集中しましょう👓
                </h3>
                <p className="text-neutral-600 mb-2">
                  現在のOKRを完了または削除してから、新しい目標を設定できます
                </p>
                <p className="text-sm text-neutral-500">
                  ※ 一度に管理できるOKRは1つまでです
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
