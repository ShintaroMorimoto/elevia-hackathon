'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '@radix-ui/react-icons';

export default function PlanGenerationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    'あなたの価値観を分析中...',
    '最適なスキルアッププランを検索中...',
    '年単位のOKRを組み立てています...',
    '月次の具体的なアクションを設計中...',
    'あなただけのロードマップが、まもなく完成します！',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsComplete(true);
          clearInterval(interval);
          return prev;
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleViewPlan = () => {
    router.push('/plan/1');
  };

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
              <p className="text-gray-600 mb-6">{steps[currentStep]}</p>
            )}
          </div>

          {!isComplete && (
            <div className="space-y-3 mb-6">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
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
                あなたの「5年後に1億円稼ぐ」という夢を実現するための、
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
