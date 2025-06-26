'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, CalendarIcon } from '@radix-ui/react-icons';
import { createGoal } from '@/actions/goals';
import { createChatSession } from '@/actions/chat';
import { useSession } from 'next-auth/react';

export default function NewGoalPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (status === 'unauthenticated') {
      router.push('/'); // Redirect to login page
      return;
    }
  }, [status, router]);

  // Show loading while session is being checked
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  // Don't render form if not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || !deadline) return;

    // Check if user is authenticated
    if (!session?.user?.id) {
      setError('ログインが必要です');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Use actual user ID from session
      const userId = session.user.id;
      
      // Create goal in database
      const goalResult = await createGoal({
        userId: userId,
        title: goal.trim(),
        description: goal.trim(),
        dueDate: deadline,
        status: 'active',
      });

      if (!goalResult.success) {
        throw new Error(goalResult.error);
      }

      // Create chat session for this goal
      const chatResult = await createChatSession({
        goalId: goalResult.data.id,
        status: 'active',
      });

      if (!chatResult.success) {
        throw new Error(chatResult.error);
      }

      // Redirect to chat page
      router.push(`/chat/${goalResult.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">新しいOKRを追加</h1>
        </div>
      </header>

      <main className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-600" />
              あなたの夢を教えてください
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="goal">達成したい夢・目標</Label>
                <Textarea
                  id="goal"
                  placeholder="例：5年後に1億円稼ぐ、世界一周旅行をする、起業して成功する..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
                <p className="text-sm text-gray-600">
                  どんなに大きな夢でも大丈夫です。AIが一緒に現実的な計画を立てます。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">達成期限</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={!goal.trim() || !deadline || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    処理中...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    AIとの対話を始める
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">次のステップ</h3>
          <p className="text-sm text-blue-800">
            目標を登録すると、AIがあなたの夢について詳しく質問します。
            この対話を通じて、あなただけのパーソナライズされた計画を作成します。
          </p>
        </div>
      </main>
    </div>
  );
}
