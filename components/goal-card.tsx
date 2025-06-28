'use client';

import { Card, CardContent } from '@/components/ui/card';
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
    window.location.href = `/plan/${goal.id}`;
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
        // Refresh the page to update the goals list
        router.refresh();
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <CalendarIcon className="w-4 h-4 mr-1" />
          {goal.dueDate}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">進捗</span>
            <span className="font-medium">{parseFloat(goal.progressPercentage || '0').toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(goal.progressPercentage || '0')))}%` }}
            />
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