'use client';

import { useState, useEffect } from 'react';
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedPlanId, setGeneratedPlanId] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState('');

  const steps = [
    'チャット履歴を分析中...',
    '目標の詳細を評価中...',
    'OKRプランを生成中...',
    'データベースに保存中...',
    'ロードマップが完成しました！',
  ];

  // Initialize plan generation with Mastra
  useEffect(() => {
    const initializePlan = async () => {
      try {
        if (status === 'loading') return;

        if (status === 'unauthenticated' || !session?.user?.id) {
          router.push('/');
          return;
        }

        const resolvedParams = await params;
        const paramGoalId = resolvedParams.id;
        setGoalId(paramGoalId);

        // Get session ID from localStorage (saved from chat)
        const sessionId = localStorage.getItem(`chatSessionId_${paramGoalId}`);
        if (!sessionId) {
          setError('チャットセッションが見つかりません');
          return;
        }

        // Initialize plan generation data
        setProcessingStatus('計画生成を初期化中...');
        setCurrentStep(0);
        
        const planInit = await initializePlanGeneration(
          paramGoalId,
          session.user.id,
          sessionId,
        );

        setIsLoading(false);

        // Start actual plan generation process with real-time updates
        await generatePlanWithRealTimeProgress(
          paramGoalId,
          session.user?.id || '',
          planInit.goalData,
          planInit.chatHistory,
        );
      } catch (error) {
        console.error('Error initializing plan generation:', error);
        setError('計画生成の初期化に失敗しました');
        setIsLoading(false);
      }
    };

    initializePlan();
  }, [params, session, status, router]);

  // Real-time plan generation with progress updates
  const generatePlanWithRealTimeProgress = async (
    goalId: string,
    userId: string,
    goalData: { title: string; deadline: string },
    chatHistory: Array<{ role: string; content: string }>,
  ) => {
    try {
      // Step 1: Analyze chat history
      setCurrentStep(0);
      setProcessingStatus('チャット履歴を分析中...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause for UX

      // Step 2: Evaluate goal details
      setCurrentStep(1);
      setProcessingStatus('目標の詳細を評価中...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Generate OKR plan
      setCurrentStep(2);
      setProcessingStatus('OKRプランを生成中...');
      
      const generatedPlan = await generatePlanWithMastra(
        goalId,
        userId,
        goalData,
        chatHistory,
      );

      // Step 4: Save to database
      setCurrentStep(3);
      setProcessingStatus('データベースに保存中...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Complete
      setCurrentStep(4);
      setProcessingStatus('ロードマップが完成しました！');
      setGeneratedPlanId(generatedPlan.planId);
      setIsComplete(true);

    } catch (error) {
      console.error('Plan generation failed:', error);
      setError('計画の生成に失敗しました');
    }
  };

  // No more automatic step animation - controlled by real progress

  const handleViewPlan = () => {
    router.push(`/plan/${generatedPlanId || goalId}`);
  };

  // Show loading state during initialization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">計画生成を初期化中...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>再試行</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            {isComplete ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            )}

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isComplete ? '計画が完成しました！' : '計画を生成中'}
            </h2>

            {!isComplete && (
              <p className="text-gray-600 mb-6">
                {processingStatus || steps[currentStep]}
              </p>
            )}
          </div>

          {!isComplete && (
            <div className="space-y-3 mb-6">
              {steps.map((step, index) => (
                <div key={`step-${index}`} className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 ${
                      index < currentStep
                        ? 'bg-green-500'
                        : index === currentStep
                          ? 'bg-indigo-500 animate-pulse'
                          : 'bg-gray-200'
                    }`}
                  />
                  <span
                    className={`text-sm ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isComplete && (
            <>
              <p className="text-gray-600 mb-6">
                あなたの目標を実現するための、
                パーソナライズされたロードマップが完成しました。
              </p>
              <Button onClick={handleViewPlan} className="w-full">
                <ArrowRightIcon className="w-4 h-4 mr-2" />
                計画を確認する
              </Button>
            </>
          )}

          {!isComplete && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
