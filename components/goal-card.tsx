'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@radix-ui/react-icons';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { deleteGoal } from '@/actions/goals';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import type { Goal } from '@/lib/db/schema';

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/plan/${goal.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!session?.user?.id) {
      console.error('User not authenticated');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteGoal(goal.id, session.user.id);
      if (result.success) {
        setIsDeleteDialogOpen(false);
        // Navigate to home page instead of refresh to prevent navigation to deleted goal
        router.push('/');
      } else {
        console.error('Failed to delete goal:', result.error);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const progressPercentage = parseFloat(goal.progressPercentage || '0');

  const getProgressGradient = (progress: number) => {
    if (progress <= 25) return 'bg-gradient-dawn';
    if (progress <= 75) return 'bg-gradient-sunrise';
    return 'bg-gradient-daylight';
  };

  const getCardGradient = (progress: number) => {
    if (progress >= 100) return 'progress-100';
    if (progress >= 50) return 'progress-50';
    return '';
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden',
        getCardGradient(progressPercentage),
      )}
      onClick={handleCardClick}
    >
      {/* Journey Background Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-bold text-neutral-900 flex-1 text-lg leading-tight">
            {goal.title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            className="h-10 w-10 text-neutral-500 hover:text-red-500 hover:bg-red-50/80 hover:scale-110 transition-all duration-200"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center text-sm text-neutral-600 mb-4">
          <CalendarIcon className="w-4 h-4 mr-2 text-primary-sunrise" />
          <span className="font-medium">{goal.dueDate}</span>
        </div>

        {/* Enhanced Progress Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-neutral-600">
              目標への進捗
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-neutral-800">
                {Math.round(progressPercentage)}%
              </span>
              {progressPercentage >= 100 && (
                <div className="w-2 h-2 rounded-full bg-gradient-daylight animate-glow" />
              )}
            </div>
          </div>

          {/* Journey Progress Bar */}
          <div className="relative">
            <div className="w-full bg-neutral-200/60 rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  'h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden',
                  getProgressGradient(progressPercentage),
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
                }}
              >
                {/* Shimmer effect for active progress */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer bg-[length:200%_100%]" />
              </div>
            </div>

            {/* Milestone markers */}
            <div className="absolute top-0 left-1/4 w-px h-3 bg-white/50" />
            <div className="absolute top-0 left-2/4 w-px h-3 bg-white/50" />
            <div className="absolute top-0 left-3/4 w-px h-3 bg-white/50" />
          </div>

          {/* Progress Labels */}
          <div className="flex justify-between text-xs text-neutral-500 px-1">
            <span>開始</span>
            <span>成長中</span>
            <span>達成</span>
          </div>
        </div>
      </CardContent>

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={goal.title}
        isLoading={isDeleting}
      />
    </Card>
  );
}
