'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Target, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { CalendarIcon } from '@radix-ui/react-icons';

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return <DashboardPage />;
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
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
          <div className="space-y-2">
            <Input type="email" placeholder="メールアドレス" />
            <Input type="password" placeholder="パスワード" />
          </div>
          <Button onClick={onLogin} className="w-full">
            ログイン
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <button className="text-indigo-600 hover:underline">
              新規登録
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardPage() {
  const goals = [
    {
      id: 1,
      title: '5年後に1億円稼ぐ',
      deadline: '2029年12月31日',
      progress: 15,
      status: '対話中',
    },
    {
      id: 2,
      title: '世界一周旅行を実現する',
      deadline: '2026年6月30日',
      progress: 45,
      status: '計画実行中',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">My OKR</h1>
          <Link href="/goals/new">
            <Button size="sm">
              <Target className="w-4 h-4 mr-2" />
              Add New OKR
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="grid gap-4">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => (window.location.href = `/plan/${goal.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 flex-1">
                    {goal.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      goal.status === '対話中'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {goal.status}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  {goal.deadline}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">進捗</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
                {goal.status === '対話中' && (
                  <Link href={`/chat/${goal.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      対話を続ける
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

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
      </main>
    </div>
  );
}
