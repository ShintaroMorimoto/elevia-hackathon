'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@radix-ui/react-icons';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import type { Goal } from '@/lib/db/schema';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const handleCardClick = () => {
    window.location.href = `/plan/${goal.id}`;
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 flex-1">
            {goal.title}
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              goal.status === 'active'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {goal.status === 'active' ? 'アクティブ' : goal.status}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <CalendarIcon className="w-4 h-4 mr-1" />
          {goal.dueDate}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">進捗</span>
            <span className="font-medium">{goal.progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${goal.progressPercentage}%` }}
            />
          </div>
        </div>
        <Link href={`/chat/${goal.id}`}>
          <Button variant="outline" size="sm" className="w-full mt-3">
            <MessageCircle className="w-4 h-4 mr-2" />
            AI対話を開始
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}