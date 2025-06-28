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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Elevia</CardTitle>
          <CardDescription>
            AIと一緒に、あなたのOKRを現実的な計画に変えましょう
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleSignInButton />
          <div className="text-center text-sm text-muted-foreground">
            Googleアカウントでログインして始めましょう
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">My OKR</h1>
            {user?.name && (
              <span className="text-sm text-gray-600">
                {user.name}さん、こんにちは
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="grid gap-4">
          {goals.map((goal: Goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>

        {goals.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-4">
                新しいOKRを追加して、AIと一緒に計画を立てましょう
              </p>
              <Link href="/goals/new">
                <Button>OKRを追加する</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-4">
                現在のOKRを削除してから、新しいOKRを追加できます
              </p>
              <p className="text-sm text-gray-500">
                ※ 一度に管理できるOKRは1つまでです
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
