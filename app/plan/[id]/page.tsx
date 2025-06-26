'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Target, Edit } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@radix-ui/react-icons';

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  type: 'yearly' | 'monthly';
  year?: number;
  month?: number;
}

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    new Set([2024]),
  );
  const [milestones, setMilestones] = useState<Milestone[]>([
    // 2024年
    {
      id: '2024',
      title: '基盤構築の年',
      completed: false,
      type: 'yearly',
      year: 2024,
    },
    {
      id: '2024-1',
      title: 'ビジネスアイデアの具体化と市場調査',
      completed: true,
      type: 'monthly',
      year: 2024,
      month: 1,
    },
    {
      id: '2024-2',
      title: '必要なスキルの洗い出しと学習計画策定',
      completed: true,
      type: 'monthly',
      year: 2024,
      month: 2,
    },
    {
      id: '2024-3',
      title: '副業として小規模ビジネスを開始',
      completed: false,
      type: 'monthly',
      year: 2024,
      month: 3,
    },
    {
      id: '2024-4',
      title: '初回売上10万円を達成',
      completed: false,
      type: 'monthly',
      year: 2024,
      month: 4,
    },

    // 2025年
    {
      id: '2025',
      title: '事業拡大の年',
      completed: false,
      type: 'yearly',
      year: 2025,
    },
    {
      id: '2025-1',
      title: '月収100万円を安定して達成',
      completed: false,
      type: 'monthly',
      year: 2025,
      month: 1,
    },
    {
      id: '2025-6',
      title: 'チーム構築開始（初回採用）',
      completed: false,
      type: 'monthly',
      year: 2025,
      month: 6,
    },
    {
      id: '2025-12',
      title: '年収1000万円を達成',
      completed: false,
      type: 'monthly',
      year: 2025,
      month: 12,
    },

    // 2026年
    {
      id: '2026',
      title: 'スケールアップの年',
      completed: false,
      type: 'yearly',
      year: 2026,
    },
    {
      id: '2026-6',
      title: '事業の自動化システム構築',
      completed: false,
      type: 'monthly',
      year: 2026,
      month: 6,
    },
    {
      id: '2026-12',
      title: '年収3000万円を達成',
      completed: false,
      type: 'monthly',
      year: 2026,
      month: 12,
    },

    // 2027年
    {
      id: '2027',
      title: '多角化の年',
      completed: false,
      type: 'yearly',
      year: 2027,
    },
    {
      id: '2027-6',
      title: '新規事業領域への参入',
      completed: false,
      type: 'monthly',
      year: 2027,
      month: 6,
    },
    {
      id: '2027-12',
      title: '年収5000万円を達成',
      completed: false,
      type: 'monthly',
      year: 2027,
      month: 12,
    },

    // 2028年
    {
      id: '2028',
      title: '投資拡大の年',
      completed: false,
      type: 'yearly',
      year: 2028,
    },
    {
      id: '2028-6',
      title: '投資ポートフォリオの構築',
      completed: false,
      type: 'monthly',
      year: 2028,
      month: 6,
    },
    {
      id: '2028-12',
      title: '年収7000万円を達成',
      completed: false,
      type: 'monthly',
      year: 2028,
      month: 12,
    },

    // 2029年
    {
      id: '2029',
      title: '目標達成の年',
      completed: false,
      type: 'yearly',
      year: 2029,
    },
    {
      id: '2029-12',
      title: '年収1億円を達成！',
      completed: false,
      type: 'monthly',
      year: 2029,
      month: 12,
    },
  ]);

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const toggleMilestone = (id: string) => {
    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === id
          ? { ...milestone, completed: !milestone.completed }
          : milestone,
      ),
    );
  };

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalCount = milestones.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const yearlyMilestones = milestones.filter((m) => m.type === 'yearly');
  const monthlyMilestones = milestones.filter((m) => m.type === 'monthly');

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
              5年後に1億円稼ぐ
            </h1>
            <div className="flex items-center text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4 mr-1" />
              2029年12月31日まで
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
                {progressPercentage}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="mb-2" />
            <p className="text-sm text-gray-600">
              {completedCount} / {totalCount} のOKRが完了
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {yearlyMilestones.map((yearMilestone) => {
            const year = yearMilestone.year!;
            const isExpanded = expandedYears.has(year);
            const yearMonthlyMilestones = monthlyMilestones.filter(
              (m) => m.year === year,
            );
            const yearCompletedCount = yearMonthlyMilestones.filter(
              (m) => m.completed,
            ).length;
            const yearTotalCount = yearMonthlyMilestones.length;
            const yearProgress =
              yearTotalCount > 0
                ? Math.round((yearCompletedCount / yearTotalCount) * 100)
                : 0;

            return (
              <Card key={yearMilestone.id}>
                <CardContent className="p-0">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleYear(year)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={yearMilestone.completed}
                          onCheckedChange={() =>
                            toggleMilestone(yearMilestone.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {year}年: {yearMilestone.title}
                          </h3>
                          {yearTotalCount > 0 && (
                            <p className="text-sm text-gray-600">
                              {yearCompletedCount}/{yearTotalCount} 完了 (
                              {yearProgress}%)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    {yearTotalCount > 0 && (
                      <div className="mt-2 ml-8">
                        <Progress value={yearProgress} className="h-1" />
                      </div>
                    )}
                  </div>

                  {isExpanded && yearMonthlyMilestones.length > 0 && (
                    <div className="border-t border-gray-200">
                      {yearMonthlyMilestones.map((monthMilestone) => (
                        <div
                          key={monthMilestone.id}
                          className="p-4 pl-12 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={monthMilestone.completed}
                                onCheckedChange={() =>
                                  toggleMilestone(monthMilestone.id)
                                }
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {monthMilestone.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {monthMilestone.month}月
                                </p>
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
