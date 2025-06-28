'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Target, Edit } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import {
  loadPlanData,
  toggleOKRCompletion,
  updateOKRProgress,
  type PlanData,
} from '@/app/utils/plan-detail-helpers';

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [goalId, setGoalId] = useState<string>('');
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load plan data from database
  useEffect(() => {
    const loadPlan = async () => {
      try {
        if (status === 'loading') return;

        if (status === 'unauthenticated' || !session?.user?.id) {
          router.push('/');
          return;
        }

        const resolvedParams = await params;
        const paramGoalId = resolvedParams.id;
        setGoalId(paramGoalId);

        // Load plan data from database
        const loadedPlanData = await loadPlanData(paramGoalId, session.user.id);
        setPlanData(loadedPlanData);

        // Expand the current year by default
        const currentYear = new Date().getFullYear();
        setExpandedYears(new Set([currentYear]));

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading plan data:', error);
        setError('計画データの読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    loadPlan();
  }, [params, session, status, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">計画を読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>再試行</Button>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">計画データが見つかりません</p>
      </div>
    );
  }

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const handleToggleOKRCompletion = async (
    okrId: string,
    currentStatus: boolean,
    okrType: 'yearly' | 'quarterly',
  ) => {
    try {
      await toggleOKRCompletion(okrId, currentStatus, okrType);

      // Reload plan data to reflect changes
      const updatedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(updatedPlanData);
    } catch (error) {
      console.error('Error toggling OKR completion:', error);
      setError('OKRステータスの更新に失敗しました');
    }
  };

  const _handleProgressUpdate = async (
    keyResultId: string,
    newCurrentValue: number,
    targetValue: number,
  ) => {
    try {
      await updateOKRProgress(keyResultId, newCurrentValue, targetValue);

      // Reload plan data to reflect changes
      const updatedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(updatedPlanData);
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('進捗の更新に失敗しました');
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
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              {planData.goal.title}
            </h1>
            <div className="flex items-center text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4 mr-1" />
              {new Date(planData.goal.deadline).toLocaleDateString('ja-JP')}まで
            </div>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-600" />
                全体の進捗
              </span>
              <span className="text-lg font-bold text-indigo-600">
                {planData.totalProgress}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={planData.totalProgress} className="mb-2" />
            <p className="text-sm text-gray-600">全体の進捗状況</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {planData.yearlyOKRs.map((yearlyOKR) => {
            const year = yearlyOKR.year;
            const isExpanded = expandedYears.has(year);
            const quarterlyOKRs = yearlyOKR.quarterlyOKRs;
            const yearCompletedCount = quarterlyOKRs.filter(
              (q) => q.progressPercentage >= 100,
            ).length;
            const yearTotalCount = quarterlyOKRs.length;
            const yearProgress =
              yearTotalCount > 0
                ? Math.round((yearCompletedCount / yearTotalCount) * 100)
                : 0;

            return (
              <Card key={yearlyOKR.id}>
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        checked={yearlyOKR.progressPercentage >= 100}
                        onCheckedChange={() =>
                          handleToggleOKRCompletion(
                            yearlyOKR.id,
                            yearlyOKR.progressPercentage >= 100,
                            'yearly',
                          )
                        }
                      />
                      <button
                        type="button"
                        className="flex-1 text-left hover:bg-gray-50 transition-colors p-2 -m-2 rounded"
                        onClick={() => toggleYear(year)}
                      >
                        <h3 className="font-semibold text-gray-900">
                          {year}年: {yearlyOKR.objective}
                        </h3>
                        {yearTotalCount > 0 && (
                          <p className="text-sm text-gray-600">
                            {yearCompletedCount}/{yearTotalCount} 完了 (
                            {yearProgress}%)
                          </p>
                        )}
                        {yearTotalCount > 0 && (
                          <div className="mt-2">
                            <Progress value={yearProgress} className="h-1" />
                          </div>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <button
                        type="button"
                        className="p-1"
                        onClick={() => toggleYear(year)}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && quarterlyOKRs.length > 0 && (
                    <div className="border-t border-gray-200">
                      {quarterlyOKRs.map((quarterlyOKR) => (
                        <div
                          key={quarterlyOKR.id}
                          className="p-4 pl-12 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={quarterlyOKR.progressPercentage >= 100}
                                onCheckedChange={() =>
                                  handleToggleOKRCompletion(
                                    quarterlyOKR.id,
                                    quarterlyOKR.progressPercentage >= 100,
                                    'quarterly',
                                  )
                                }
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {quarterlyOKR.objective}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Q{quarterlyOKR.quarter}
                                </p>
                                {quarterlyOKR.keyResults.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {quarterlyOKR.keyResults.map(
                                      (keyResult) => (
                                        <div
                                          key={keyResult.id}
                                          className="text-xs text-gray-500"
                                        >
                                          {keyResult.result}:{' '}
                                          {keyResult.currentValue}/
                                          {keyResult.targetValue}(
                                          {Math.round(
                                            (keyResult.currentValue /
                                              keyResult.targetValue) *
                                              100,
                                          )}
                                          %)
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="p-4 pl-12">
                        <Button variant="outline" size="sm" className="w-full">
                          <PlusIcon className="w-4 h-4 mr-2" />
                          {year}年にOKRを追加
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 border-dashed border-2 border-gray-300">
          <CardContent className="p-6 text-center">
            <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">新しい年次目標を追加しますか？</p>
            <Button variant="outline">
              <PlusIcon className="w-4 h-4 mr-2" />
              年次目標を追加
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
