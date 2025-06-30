'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import {
  initializePlanGeneration,
  generatePlanWithMastra,
} from '@/app/utils/plan-generation-helpers';

export default function PlanGenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [goalId, setGoalId] = useState<string>('');
  const [_currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPlanId, setGeneratedPlanId] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const initializationRef = useRef(false); // Prevent React Strict Mode double execution

  // Initialize plan generation with Mastra
  // biome-ignore lint/correctness/useExhaustiveDependencies: Function only needs to run once on mount
  useEffect(() => {
    const initializePlan = async () => {
      try {
        console.log('🔍 initializePlan called:', {
          status,
          sessionExists: !!session?.user?.id,
          isLoading,
          isProcessing,
          isComplete,
          error,
        });

        if (status === 'loading') {
          console.log('⏳ Still loading auth status...');
          return;
        }

        if (status === 'unauthenticated' || !session?.user?.id) {
          console.log('🚫 Not authenticated, redirecting...');
          router.push('/');
          return;
        }

        const resolvedParams = await params;
        const paramGoalId = resolvedParams.id;
        setGoalId(paramGoalId);

        // Get session ID from localStorage (saved from chat)
        const sessionId = localStorage.getItem(`chatSessionId_${paramGoalId}`);
        if (!sessionId) {
          console.log('❌ No chat session found for goal:', paramGoalId);
          setError('チャットセッションが見つかりません');
          setIsLoading(false);
          return;
        }

        // Smart cleanup: Only block if processing is genuinely active
        const processingKey = `planGeneration_${paramGoalId}`;
        const lastProcessingTime = sessionStorage.getItem(processingKey);

        if (lastProcessingTime) {
          const timeDiff = Date.now() - parseInt(lastProcessingTime);
          console.log('🔍 Found previous processing timestamp:', {
            lastProcessingTime,
            timeDiffMinutes: Math.round(timeDiff / 60000),
            isWithinTimeout: timeDiff < 120000,
          });

          // Always clear old data on new page load - sessionStorage might be stale
          console.log('🧹 Clearing previous processing data for fresh start');
          sessionStorage.removeItem(processingKey);
        }

        console.log('🚀 Starting plan generation process...');

        // Set processing flag and timestamp to prevent duplicates
        setIsProcessing(true);
        const startTime = Date.now();
        sessionStorage.setItem(processingKey, startTime.toString());

        // Initialize plan generation data
        setProcessingStatus('計画生成を初期化中...');
        setCurrentStep(0);
        setIsLoading(false); // Show progress UI immediately

        console.log('📊 Initializing plan data...');
        const planInit = await initializePlanGeneration(
          paramGoalId,
          session.user.id,
          sessionId,
        );

        console.log('✅ Plan data initialized, starting generation...');
        // Start actual plan generation process with real-time updates
        await generatePlanWithRealTimeProgress(
          paramGoalId,
          session.user?.id || '',
          planInit.goalData,
          planInit.chatHistory,
        );
      } catch (error) {
        console.error('❌ Error initializing plan generation:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setError(`計画生成の初期化に失敗しました: ${errorMessage}`);
        setIsLoading(false);
        setIsProcessing(false); // Reset processing flag on error

        // Clear processing timestamp on error
        if (goalId) {
          const processingKey = `planGeneration_${goalId}`;
          sessionStorage.removeItem(processingKey);
          console.log('🧹 Cleared processing data after error');
        }
        initializationRef.current = false; // Reset flag for retry
      }
    };

    // Simplified initialization condition - only run once when session is ready
    if (
      status !== 'loading' &&
      session?.user?.id &&
      !isComplete &&
      !error &&
      !initializationRef.current
    ) {
      console.log('✅ Conditions met, calling initializePlan');
      initializationRef.current = true; // Set flag to prevent re-execution
      initializePlan();
    } else {
      console.log('⏸️ Conditions not met:', {
        statusReady: status !== 'loading',
        sessionReady: !!session?.user?.id,
        notComplete: !isComplete,
        noError: !error,
        notInitialized: !initializationRef.current,
      });
    }
  }, [
    params,
    session,
    status,
    router,
    isLoading,
    isProcessing,
    isComplete,
    error,
    goalId,
  ]);

  // Prevent user from leaving page during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing && !isComplete) {
        e.preventDefault();
        e.returnValue =
          '計画の生成中です。ページを離れると進行状況が失われます。本当に離れますか？';
        return e.returnValue;
      }
    };

    if (isProcessing && !isComplete) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProcessing, isComplete]);

  // Mock plan generation with 50-second progress (10 seconds per step)
  const generatePlanWithRealTimeProgress = useCallback(
    async (
      goalId: string,
      userId: string,
      goalData: { title: string; deadline: string },
      chatHistory: Array<{ role: string; content: string }>,
    ) => {
      try {
        // Step 1: Analyze chat history (10 seconds)
        setCurrentStep(0);
        setProcessingStatus('チャット履歴を分析中...');
        await new Promise((resolve) => setTimeout(resolve, 12000));

        // Step 2: Evaluate goal details (10 seconds)
        setCurrentStep(1);
        setProcessingStatus('目標の詳細を評価中...');
        await new Promise((resolve) => setTimeout(resolve, 12000));

        // Step 3: Generate OKR plan (10 seconds) - Real DB save + Mock display
        setCurrentStep(2);
        setProcessingStatus('OKRプランを生成中...');

        // Parallel execution: Mock display + Real DB save
        const [_, generatedPlan] = await Promise.all([
          new Promise((resolve) => setTimeout(resolve, 12000)), // Mock 10 seconds
          generatePlanWithMastra(goalId, userId, goalData, chatHistory), // Real DB save
        ]);

        // Step 4: Save to database (10 seconds) - Already completed above
        setCurrentStep(3);
        setProcessingStatus('生成したプランの確認中...');
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Step 5: Complete (10 seconds)
        setCurrentStep(4);
        setProcessingStatus(
          'ロードマップが完成しました！もう少々お待ちください。',
        );
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Real completion with actual planId
        setGeneratedPlanId(generatedPlan.planId);
        setIsComplete(true);
        setIsProcessing(false);

        // Clear processing timestamp
        const processingKey = `planGeneration_${goalId}`;
        sessionStorage.removeItem(processingKey);
      } catch (error) {
        console.error('Plan generation failed:', error);
        setError('計画の生成に失敗しました');
        setIsProcessing(false);

        // Clear processing timestamp on error
        const processingKey = `planGeneration_${goalId}`;
        sessionStorage.removeItem(processingKey);
      }
    },
    [],
  );

  // No more automatic step animation - controlled by real progress

  const handleViewPlan = () => {
    router.push(`/plan/${generatedPlanId || goalId}`);
  };

  // Show loading state during initialization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-sunrise border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-neutral-700 font-medium">計画生成を初期化中...</p>
          <p className="text-sm text-neutral-600 mt-3">
            この処理には時間がかかります。しばらくお待ちください...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    const handleRetry = () => {
      // Clear all state and sessionStorage for fresh start
      if (goalId) {
        const processingKey = `planGeneration_${goalId}`;
        sessionStorage.removeItem(processingKey);
      }
      setError('');
      setIsLoading(true);
      setIsProcessing(false);
      setIsComplete(false);
      setCurrentStep(0);
      setProcessingStatus('');
      initializationRef.current = false; // Reset flag for retry
    };

    const handleForceRetry = () => {
      // Navigate with force parameter to bypass any blocks
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('force', 'true');
      window.location.href = currentUrl.toString();
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-6 font-medium">{error}</p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              再試行
            </Button>
            <Button
              onClick={handleForceRetry}
              variant="outline"
              className="w-full"
            >
              強制再試行（問題が続く場合）
            </Button>
          </div>
          <p className="text-sm text-neutral-500 mt-6">
            問題が続く場合は、ブラウザの開発者ツール（F12）でコンソールログを確認してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Journey Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-sunrise opacity-10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-daylight opacity-10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <Card className="w-full max-w-lg glass border-none shadow-2xl relative z-10">
        <CardContent className="p-10 text-center">
          <div className="mb-8">
            {isComplete ? (
              <div className="w-20 h-20 bg-gradient-daylight rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-accent animate-celebration">
                <CheckCircle className="w-10 h-10 text-neutral-800" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-sunrise rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-primary">
                <Sparkles className="w-10 h-10 text-neutral-800 animate-pulse" />
              </div>
            )}

            <h2 className="text-2xl font-bold text-neutral-800 mb-4">
              {isComplete ? (
                <span className="bg-gradient-to-r from-primary-sunrise to-primary-daylight bg-clip-text text-transparent">
                  計画が完成しました！
                </span>
              ) : (
                'OKRを立案中🧐'
              )}
            </h2>

            {!isComplete && (
              <>
                <p className="text-neutral-700 mb-4 font-medium">
                  {processingStatus}
                </p>
                <p className="text-sm text-neutral-600 mb-8">
                  30-60秒かかります。どんなOKRが完成するか、想像しながらお待ちください🙇
                </p>
              </>
            )}
          </div>

          {isComplete ? (
            <>
              <p className="text-neutral-700 mb-8 text-lg">
                あなたの目標を実現するための、
                <br />
                <span className="font-medium text-primary-sunrise">
                  パーソナライズされたOKR
                </span>
                が完成しました！
              </p>
              <Button onClick={handleViewPlan} size="lg" className="w-full">
                <ArrowRightIcon className="w-5 h-5 mr-2" />
                OKRを確認する
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
