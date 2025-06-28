'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Edit, MapPin, Plane, FileText } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ComponentPlaceholderIcon,
} from '@radix-ui/react-icons';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: 'yearly' | 'monthly' | 'task';
  year?: number;
  month?: number;
  category?: 'planning' | 'financial' | 'documentation' | 'booking';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
}

export default function WorldTravelPlanPage() {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    new Set([2024]),
  );
  const [tasks, setTasks] = useState<Task[]>([
    // 2024年 - 準備期間
    {
      id: '2024',
      title: '準備・計画の年',
      completed: false,
      type: 'yearly',
      year: 2024,
    },
    {
      id: '2024-1',
      title: '世界一周ルートの詳細計画',
      completed: true,
      type: 'task',
      year: 2024,
      month: 1,
      category: 'planning',
      priority: 'high',
      dueDate: '2024-01-31',
    },
    {
      id: '2024-2',
      title: 'パスポート更新・ビザ申請準備',
      completed: true,
      type: 'task',
      year: 2024,
      month: 2,
      category: 'documentation',
      priority: 'high',
      dueDate: '2024-02-28',
    },
    {
      id: '2024-3',
      title: '旅行資金の積立開始（月20万円）',
      completed: true,
      type: 'task',
      year: 2024,
      month: 3,
      category: 'financial',
      priority: 'high',
      dueDate: '2024-03-31',
    },
    {
      id: '2024-4',
      title: '海外旅行保険の比較検討',
      completed: false,
      type: 'task',
      year: 2024,
      month: 4,
      category: 'planning',
      priority: 'medium',
      dueDate: '2024-04-30',
    },
    {
      id: '2024-5',
      title: '英語・現地語学習開始',
      completed: false,
      type: 'task',
      year: 2024,
      month: 5,
      category: 'planning',
      priority: 'medium',
      dueDate: '2024-05-31',
    },
    {
      id: '2024-6',
      title: '旅行用品・装備の選定',
      completed: false,
      type: 'task',
      year: 2024,
      month: 6,
      category: 'planning',
      priority: 'low',
      dueDate: '2024-06-30',
    },

    // 2025年 - 本格準備
    {
      id: '2025',
      title: '本格準備の年',
      completed: false,
      type: 'yearly',
      year: 2025,
    },
    {
      id: '2025-1',
      title: '航空券の予約（早期割引活用）',
      completed: false,
      type: 'task',
      year: 2025,
      month: 1,
      category: 'booking',
      priority: 'high',
      dueDate: '2025-01-31',
    },
    {
      id: '2025-3',
      title: '宿泊先の予約（主要都市）',
      completed: false,
      type: 'task',
      year: 2025,
      month: 3,
      category: 'booking',
      priority: 'high',
      dueDate: '2025-03-31',
    },
    {
      id: '2025-6',
      title: '必要なビザの申請完了',
      completed: false,
      type: 'task',
      year: 2025,
      month: 6,
      category: 'documentation',
      priority: 'high',
      dueDate: '2025-06-30',
    },
    {
      id: '2025-9',
      title: '予防接種・健康診断',
      completed: false,
      type: 'task',
      year: 2025,
      month: 9,
      category: 'documentation',
      priority: 'high',
      dueDate: '2025-09-30',
    },
    {
      id: '2025-12',
      title: '旅行資金目標額達成（500万円）',
      completed: false,
      type: 'task',
      year: 2025,
      month: 12,
      category: 'financial',
      priority: 'high',
      dueDate: '2025-12-31',
    },

    // 2026年 - 出発準備
    {
      id: '2026',
      title: '出発準備・実行の年',
      completed: false,
      type: 'yearly',
      year: 2026,
    },
    {
      id: '2026-1',
      title: '最終的な荷物準備・パッキング',
      completed: false,
      type: 'task',
      year: 2026,
      month: 1,
      category: 'planning',
      priority: 'medium',
      dueDate: '2026-01-31',
    },
    {
      id: '2026-3',
      title: '住居・仕事の整理',
      completed: false,
      type: 'task',
      year: 2026,
      month: 3,
      category: 'planning',
      priority: 'high',
      dueDate: '2026-03-31',
    },
    {
      id: '2026-6',
      title: '世界一周旅行出発！',
      completed: false,
      type: 'task',
      year: 2026,
      month: 6,
      category: 'planning',
      priority: 'high',
      dueDate: '2026-06-30',
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

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const yearlyTasks = tasks.filter((t) => t.type === 'yearly');
  const regularTasks = tasks.filter((t) => t.type === 'task');

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'planning':
        return <MapPin className="w-4 h-4" />;
      case 'financial':
        return <ComponentPlaceholderIcon className="w-4 h-4" />;
      case 'documentation':
        return <FileText className="w-4 h-4" />;
      case 'booking':
        return <Plane className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'financial':
        return 'bg-green-100 text-green-800';
      case 'documentation':
        return 'bg-purple-100 text-purple-800';
      case 'booking':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              世界一周旅行を実現する
            </h1>
            <div className="flex items-center text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4 mr-1" />
              2026年6月30日まで
            </div>
          </div>
          <Badge className="bg-green-100 text-green-800">計画実行中</Badge>
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
              <span className="text-lg font-bold text-indigo-600">45%</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={45} className="mb-2" />
            <p className="text-sm text-gray-600">
              {completedCount} / {totalCount} のタスクが完了
            </p>
          </CardContent>
        </Card>

        {/* カテゴリー別サマリー */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">計画・準備</p>
                  <p className="text-xs text-gray-600">6タスク</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ComponentPlaceholderIcon className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">資金準備</p>
                  <p className="text-xs text-gray-600">2タスク</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">書類手続き</p>
                  <p className="text-xs text-gray-600">3タスク</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">予約・手配</p>
                  <p className="text-xs text-gray-600">2タスク</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {yearlyTasks.map((yearTask) => {
            const year = yearTask.year!;
            const isExpanded = expandedYears.has(year);
            const yearRegularTasks = regularTasks.filter(
              (t) => t.year === year,
            );
            const yearCompletedCount = yearRegularTasks.filter(
              (t) => t.completed,
            ).length;
            const yearTotalCount = yearRegularTasks.length;
            const yearProgress =
              yearTotalCount > 0
                ? Math.round((yearCompletedCount / yearTotalCount) * 100)
                : 0;

            return (
              <Card key={yearTask.id}>
                <CardContent className="p-0">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleYear(year)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={yearTask.completed}
                          onCheckedChange={() => toggleTask(yearTask.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {year}年: {yearTask.title}
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

                  {isExpanded && yearRegularTasks.length > 0 && (
                    <div className="border-t border-gray-200">
                      {yearRegularTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-4 pl-12 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTask(task.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {getCategoryIcon(task.category)}
                                  <p
                                    className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                  >
                                    {task.title}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2 text-xs">
                                  <Badge
                                    variant="outline"
                                    className={getCategoryColor(task.category)}
                                  >
                                    {task.category === 'planning' && '計画'}
                                    {task.category === 'financial' && '資金'}
                                    {task.category === 'documentation' &&
                                      '書類'}
                                    {task.category === 'booking' && '予約'}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={getPriorityColor(task.priority)}
                                  >
                                    {task.priority === 'high' && '高'}
                                    {task.priority === 'medium' && '中'}
                                    {task.priority === 'low' && '低'}
                                  </Badge>
                                  {task.dueDate && (
                                    <span className="text-gray-500">
                                      期限:{' '}
                                      {new Date(
                                        task.dueDate,
                                      ).toLocaleDateString('ja-JP')}
                                    </span>
                                  )}
                                </div>
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
                          {year}年にタスクを追加
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
