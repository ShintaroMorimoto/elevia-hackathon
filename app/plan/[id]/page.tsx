'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Target, Edit, Save, X, Loader2, Trash2 } from 'lucide-react';
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
  const [expandedOKRs, setExpandedOKRs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingKeyResult, setEditingKeyResult] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [tempTargetValue, setTempTargetValue] = useState<string>('');
  const [editingKeyResultDesc, setEditingKeyResultDesc] = useState<
    string | null
  >(null);
  const [tempKeyResultDesc, setTempKeyResultDesc] = useState<string>('');
  const [addingKeyResult, setAddingKeyResult] = useState<{
    type: 'yearly' | 'quarterly';
    okrId: string;
  } | null>(null);
  const [newKeyResultDesc, setNewKeyResultDesc] = useState<string>('');
  const [newKeyResultTarget, setNewKeyResultTarget] = useState<string>('');
  const [newKeyResultUnit, setNewKeyResultUnit] = useState<string>('');
  const [savingNewKeyResult, setSavingNewKeyResult] = useState<boolean>(false);
  const [editingOKR, setEditingOKR] = useState<{
    id: string;
    type: 'yearly' | 'quarterly';
    objective: string;
  } | null>(null);
  const [tempObjective, setTempObjective] = useState<string>('');
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [savingOKR, setSavingOKR] = useState<boolean>(false);
  const [deletingOKR, setDeletingOKR] = useState<{
    id: string;
    type: 'yearly' | 'quarterly';
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [confirmingHighValue, setConfirmingHighValue] = useState<{
    keyResultId: string;
    value: number;
    targetValue: number;
  } | null>(null);
  const [addingOKR, setAddingOKR] = useState<{
    type: 'yearly' | 'quarterly';
    year?: number;
  } | null>(null);
  const [newOKRObjective, setNewOKRObjective] = useState<string>('');
  const [newOKRQuarter, setNewOKRQuarter] = useState<number>(1);
  const [savingNewOKR, setSavingNewOKR] = useState<boolean>(false);

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

        // Expand the current year's OKRs by default
        const currentYear = new Date().getFullYear();
        const currentYearOKRs = loadedPlanData.yearlyOKRs
          .filter((okr) => okr.year === currentYear)
          .map((okr) => okr.id);
        setExpandedOKRs(new Set(currentYearOKRs));

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
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-sunrise border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">計画を読み込み中...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center">
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

  const toggleOKR = (okrId: string) => {
    const newExpanded = new Set(expandedOKRs);
    if (newExpanded.has(okrId)) {
      newExpanded.delete(okrId);
    } else {
      newExpanded.add(okrId);
    }
    setExpandedOKRs(newExpanded);
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

  const handleProgressUpdate = async (
    keyResultId: string,
    newCurrentValue: number,
    targetValue: number,
    newTargetValue?: number,
  ) => {
    // Set loading state
    setLoadingStates((prev) => ({ ...prev, [keyResultId]: true }));

    // Optimistic update
    if (planData) {
      const updatedPlanData = { ...planData };
      updatedPlanData.yearlyOKRs = updatedPlanData.yearlyOKRs.map(
        (yearlyOKR) => ({
          ...yearlyOKR,
          keyResults: yearlyOKR.keyResults.map((kr) =>
            kr.id === keyResultId
              ? {
                  ...kr,
                  currentValue: newCurrentValue,
                  targetValue:
                    newTargetValue !== undefined
                      ? newTargetValue
                      : kr.targetValue,
                }
              : kr,
          ),
          quarterlyOKRs: yearlyOKR.quarterlyOKRs.map((quarterlyOKR) => ({
            ...quarterlyOKR,
            keyResults: quarterlyOKR.keyResults.map((kr) =>
              kr.id === keyResultId
                ? {
                    ...kr,
                    currentValue: newCurrentValue,
                    targetValue:
                      newTargetValue !== undefined
                        ? newTargetValue
                        : kr.targetValue,
                  }
                : kr,
            ),
          })),
        }),
      );
      setPlanData(updatedPlanData);
    }

    try {
      await updateOKRProgress(
        keyResultId,
        newCurrentValue,
        targetValue,
        newTargetValue,
      );

      // Reload plan data to get accurate progress calculations
      const finalPlanData = await loadPlanData(goalId, session?.user?.id || '');
      setPlanData(finalPlanData);
      setEditingKeyResult(null);
      setTempValue('');
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('進捗の更新に失敗しました');

      // Revert optimistic update on error
      const revertedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(revertedPlanData);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [keyResultId]: false }));
    }
  };

  const handleStartEdit = (
    keyResultId: string,
    currentValue: number,
    targetValue: number,
  ) => {
    setEditingKeyResult(keyResultId);
    setTempValue(currentValue.toString());
    setTempTargetValue(targetValue.toString());
  };

  const handleSaveEdit = async (
    keyResultId: string,
    originalTargetValue: number,
    forceHighValue: boolean = false,
  ) => {
    const newValue = parseFloat(tempValue);
    const newTargetValue = parseFloat(tempTargetValue);

    if (Number.isNaN(newValue)) {
      setError('有効な実績値を入力してください');
      return;
    }
    if (Number.isNaN(newTargetValue)) {
      setError('有効な目標値を入力してください');
      return;
    }
    if (newValue < 0) {
      setError('実績値は0以上である必要があります');
      return;
    }
    if (newTargetValue <= 0) {
      setError('目標値は0より大きい必要があります');
      return;
    }

    // Check for high value but allow forced save
    if (newValue > newTargetValue * 2 && !forceHighValue) {
      setConfirmingHighValue({
        keyResultId,
        value: newValue,
        targetValue: newTargetValue,
      });
      return;
    }

    // Clear any existing errors
    setError('');

    // Only pass newTargetValue if it's different from original
    const targetValueToUpdate =
      newTargetValue !== originalTargetValue ? newTargetValue : undefined;
    await handleProgressUpdate(
      keyResultId,
      newValue,
      originalTargetValue,
      targetValueToUpdate,
    );
  };

  const handleConfirmHighValue = async () => {
    if (!confirmingHighValue) return;

    // Get the current target value for the confirmation
    const originalTarget = parseFloat(tempTargetValue);
    setConfirmingHighValue(null);
    await handleSaveEdit(confirmingHighValue.keyResultId, originalTarget, true);
  };

  const handleCancelHighValue = () => {
    setConfirmingHighValue(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    keyResultId: string,
    targetValue: number,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(keyResultId, targetValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    setEditingKeyResult(null);
    setTempValue('');
    setTempTargetValue('');
  };

  const handleStartKeyResultDescEdit = (
    keyResultId: string,
    currentDesc: string,
  ) => {
    setEditingKeyResultDesc(keyResultId);
    setTempKeyResultDesc(currentDesc);
  };

  const handleSaveKeyResultDescEdit = async () => {
    if (!editingKeyResultDesc || tempKeyResultDesc.trim().length < 5) {
      setError('Key Resultの説明は5文字以上である必要があります');
      return;
    }

    const trimmedDesc = tempKeyResultDesc.trim();

    try {
      setError('');

      // Key Result description更新のServer Actionを呼び出し
      const { updateKeyResult } = await import('@/actions/okr');
      await updateKeyResult(editingKeyResultDesc, { result: trimmedDesc });

      // データを再読み込みして画面を更新
      const updatedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(updatedPlanData);
      setEditingKeyResultDesc(null);
      setTempKeyResultDesc('');
    } catch (error) {
      console.error('Error updating Key Result description:', error);
      setError('Key Resultの更新に失敗しました');
    }
  };

  const handleCancelKeyResultDescEdit = () => {
    setEditingKeyResultDesc(null);
    setTempKeyResultDesc('');
  };

  const handleStartAddKeyResult = (
    type: 'yearly' | 'quarterly',
    okrId: string,
  ) => {
    setAddingKeyResult({ type, okrId });
    setNewKeyResultDesc('');
    setNewKeyResultTarget('');
    setNewKeyResultUnit('');
  };

  const handleSaveNewKeyResult = async () => {
    if (!addingKeyResult || !isNewKeyResultValid()) return;

    const trimmedDesc = newKeyResultDesc.trim();
    const targetValue = parseFloat(newKeyResultTarget);
    setSavingNewKeyResult(true);

    try {
      const { createKeyResult } = await import('@/actions/okr');

      if (addingKeyResult.type === 'yearly') {
        await createKeyResult({
          yearlyOkrId: addingKeyResult.okrId,
          result: trimmedDesc,
          targetValue: targetValue,
          currentValue: 0,
          unit: newKeyResultUnit.trim() || null,
        });
      } else {
        await createKeyResult({
          quarterlyOkrId: addingKeyResult.okrId,
          result: trimmedDesc,
          targetValue: targetValue,
          currentValue: 0,
          unit: newKeyResultUnit.trim() || null,
        });
      }

      // データを再読み込みして画面を更新
      const updatedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(updatedPlanData);
      setAddingKeyResult(null);
      setNewKeyResultDesc('');
      setNewKeyResultTarget('');
      setNewKeyResultUnit('');
    } catch (error) {
      console.error('Error creating Key Result:', error);
      setError('Key Resultの作成に失敗しました');
    } finally {
      setSavingNewKeyResult(false);
    }
  };

  const handleCancelAddKeyResult = () => {
    setAddingKeyResult(null);
    setNewKeyResultDesc('');
    setNewKeyResultTarget('');
    setNewKeyResultUnit('');
  };

  const isNewKeyResultValid = () => {
    const trimmedDesc = newKeyResultDesc.trim();
    const targetValue = parseFloat(newKeyResultTarget);
    return (
      trimmedDesc.length >= 5 &&
      trimmedDesc.length <= 200 &&
      !isNaN(targetValue) &&
      targetValue > 0
    );
  };

  const handleStartOKREdit = (
    okrId: string,
    type: 'yearly' | 'quarterly',
    objective: string,
  ) => {
    setEditingOKR({ id: okrId, type, objective });
    setTempObjective(objective);
  };

  const handleSaveOKREdit = async () => {
    if (!editingOKR || !isEditingOKRValid()) return;

    const trimmedObjective = tempObjective.trim();
    setSavingOKR(true);

    // Optimistic update
    if (planData && editingOKR) {
      const updatedPlanData = { ...planData };
      updatedPlanData.yearlyOKRs = updatedPlanData.yearlyOKRs.map(
        (yearlyOKR) => {
          if (yearlyOKR.id === editingOKR.id && editingOKR.type === 'yearly') {
            return { ...yearlyOKR, objective: trimmedObjective };
          }
          return {
            ...yearlyOKR,
            quarterlyOKRs: yearlyOKR.quarterlyOKRs.map((quarterlyOKR) =>
              quarterlyOKR.id === editingOKR.id &&
              editingOKR.type === 'quarterly'
                ? { ...quarterlyOKR, objective: trimmedObjective }
                : quarterlyOKR,
            ),
          };
        },
      );
      setPlanData(updatedPlanData);
    }

    try {
      // Clear any existing errors
      setError('');

      // Import the update functions dynamically to avoid circular imports
      const { updateYearlyOkr, updateQuarterlyOkr } = await import(
        '@/actions/okr'
      );

      if (editingOKR.type === 'yearly') {
        await updateYearlyOkr(editingOKR.id, { objective: trimmedObjective });
      } else {
        await updateQuarterlyOkr(editingOKR.id, {
          objective: trimmedObjective,
        });
      }

      // Reload plan data to ensure consistency
      const finalPlanData = await loadPlanData(goalId, session?.user?.id || '');
      setPlanData(finalPlanData);
      setEditingOKR(null);
      setTempObjective('');
    } catch (error) {
      console.error('Error updating OKR:', error);
      setError('OKRの更新に失敗しました');

      // Revert optimistic update on error
      const revertedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(revertedPlanData);
    } finally {
      setSavingOKR(false);
    }
  };

  const handleCancelOKREdit = () => {
    setEditingOKR(null);
    setTempObjective('');
  };

  const handleStartOKRDelete = (
    okrId: string,
    type: 'yearly' | 'quarterly',
    title: string,
  ) => {
    setDeletingOKR({ id: okrId, type, title });
  };

  const handleConfirmOKRDelete = async () => {
    if (!deletingOKR) return;

    setIsDeleting(true);
    try {
      setError('');

      // Import the delete functions dynamically
      const { deleteYearlyOkr, deleteQuarterlyOkr } = await import(
        '@/actions/okr'
      );

      if (deletingOKR.type === 'yearly') {
        await deleteYearlyOkr(deletingOKR.id);
      } else {
        await deleteQuarterlyOkr(deletingOKR.id);
      }

      // Reload plan data to ensure consistency
      const finalPlanData = await loadPlanData(goalId, session?.user?.id || '');
      setPlanData(finalPlanData);
      setDeletingOKR(null);
    } catch (error) {
      console.error('Error deleting OKR:', error);
      setError('OKRの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelOKRDelete = () => {
    setDeletingOKR(null);
  };

  const handleStartAddOKR = (type: 'yearly' | 'quarterly', year?: number) => {
    setAddingOKR({ type, year });
    setNewOKRObjective('');
    if (type === 'quarterly') {
      setNewOKRQuarter(1);
    }
  };

  const handleSaveNewOKR = async () => {
    if (!addingOKR || !isNewOKRValid()) return;

    const trimmedObjective = newOKRObjective.trim();
    setSavingNewOKR(true);

    try {
      const { createYearlyOkr, createQuarterlyOkr } = await import(
        '@/actions/okr'
      );

      if (addingOKR.type === 'yearly') {
        const currentYear = new Date().getFullYear();
        const maxYear =
          planData?.yearlyOKRs.reduce(
            (max, okr) => Math.max(max, okr.year),
            currentYear,
          ) || currentYear;
        const targetYear = maxYear + 1;

        await createYearlyOkr({
          goalId,
          targetYear,
          objective: trimmedObjective,
          sortOrder: 0,
        });
      } else if (addingOKR.type === 'quarterly' && addingOKR.year) {
        // Find the yearly OKR for this year
        const yearlyOKR = planData?.yearlyOKRs.find(
          (okr) => okr.year === addingOKR.year,
        );
        if (!yearlyOKR) {
          setError('指定された年の年次OKRが見つかりません');
          return;
        }

        await createQuarterlyOkr({
          yearlyOkrId: yearlyOKR.id,
          targetYear: addingOKR.year,
          targetQuarter: newOKRQuarter,
          objective: trimmedObjective,
          sortOrder: 0,
        });
      }

      // Reload plan data to reflect changes
      const updatedPlanData = await loadPlanData(
        goalId,
        session?.user?.id || '',
      );
      setPlanData(updatedPlanData);
      setAddingOKR(null);
      setNewOKRObjective('');
    } catch (error) {
      console.error('Error creating OKR:', error);
      setError('OKRの作成に失敗しました');
    } finally {
      setSavingNewOKR(false);
    }
  };

  const handleCancelAddOKR = () => {
    setAddingOKR(null);
    setNewOKRObjective('');
  };

  // Validation functions for real-time feedback
  const isNewOKRValid = () => {
    const trimmed = newOKRObjective.trim();
    return trimmed.length >= 10 && trimmed.length <= 200;
  };

  const isEditingOKRValid = () => {
    const trimmed = tempObjective.trim();
    return trimmed.length >= 10 && trimmed.length <= 200;
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
        <Card className="mb-6 glass border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-primary-sunrise" />
                全体の進捗
              </span>
              <span className="text-lg font-bold text-primary-sunrise">
                {planData.totalProgress}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={planData.totalProgress} className="mb-2" />
            <p className="text-sm text-neutral-600">全体の進捗状況</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {planData.yearlyOKRs.map((yearlyOKR) => {
            const year = yearlyOKR.year;
            const isExpanded = expandedOKRs.has(yearlyOKR.id);
            const quarterlyOKRs = yearlyOKR.quarterlyOKRs;

            // Use the calculated progress from the helper function
            const yearProgress = yearlyOKR.progressPercentage;

            return (
              <Card key={yearlyOKR.id} className="glass border-none shadow-md">
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
                        onClick={() => toggleOKR(yearlyOKR.id)}
                      >
                        <h3 className="font-semibold text-gray-900">
                          {year}年次Objective: {yearlyOKR.objective}
                        </h3>
                        <p className="text-sm text-gray-600">
                          進捗: {yearProgress}%
                        </p>
                        <div className="mt-2">
                          <Progress value={yearProgress} className="h-1" />
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleStartOKREdit(
                            yearlyOKR.id,
                            'yearly',
                            yearlyOKR.objective,
                          )
                        }
                        title="OKRを編集"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleStartOKRDelete(
                            yearlyOKR.id,
                            'yearly',
                            `${yearlyOKR.year}年: ${yearlyOKR.objective}`,
                          )
                        }
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="OKRを削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <button
                        type="button"
                        className="p-1"
                        onClick={() => toggleOKR(yearlyOKR.id)}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {/* Yearly OKR Key Results */}
                      {yearlyOKR.keyResults.length > 0 && (
                        <div className="p-4 pl-12 border-b border-neutral-100 bg-primary-sunrise/5">
                          <h4 className="font-medium text-neutral-800 mb-2">
                            年次Key Results
                          </h4>
                          <div className="space-y-2">
                            {yearlyOKR.keyResults.map((keyResult) => (
                              <div
                                key={keyResult.id}
                                className="text-sm text-gray-700"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    {editingKeyResultDesc === keyResult.id ? (
                                      <div className="flex flex-col gap-2 bg-blue-50 p-2 rounded border border-blue-200">
                                        <Textarea
                                          value={tempKeyResultDesc}
                                          onChange={(e) =>
                                            setTempKeyResultDesc(e.target.value)
                                          }
                                          className="min-h-[60px] text-sm"
                                          placeholder="Key Resultの説明を入力してください"
                                        />
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            onClick={
                                              handleSaveKeyResultDescEdit
                                            }
                                            disabled={
                                              tempKeyResultDesc.trim().length <
                                              5
                                            }
                                          >
                                            <Save className="w-3 h-3 mr-1" />
                                            保存
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={
                                              handleCancelKeyResultDescEdit
                                            }
                                          >
                                            <X className="w-3 h-3 mr-1" />
                                            キャンセル
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleStartKeyResultDescEdit(
                                            keyResult.id,
                                            keyResult.result,
                                          )
                                        }
                                        className="text-left hover:bg-gray-100 p-1 rounded transition-colors text-sm w-full"
                                        title="クリックして説明を編集"
                                      >
                                        {keyResult.result}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {editingKeyResult === keyResult.id ? (
                                      <div className="flex flex-col gap-2 bg-white/80 p-3 rounded border border-neutral-200 min-w-[280px]">
                                        <div className="flex items-center gap-2">
                                          <Label className="text-xs font-medium text-neutral-700 w-12">
                                            実績:
                                          </Label>
                                          <Input
                                            type="number"
                                            value={tempValue}
                                            onChange={(e) =>
                                              setTempValue(e.target.value)
                                            }
                                            onKeyDown={(e) =>
                                              handleKeyDown(
                                                e,
                                                keyResult.id,
                                                keyResult.targetValue,
                                              )
                                            }
                                            className="w-20 h-8 text-sm border-neutral-300 focus:border-primary-sunrise"
                                            min="0"
                                            step="1"
                                            placeholder="実績値"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Label className="text-xs font-medium text-neutral-700 w-12">
                                            目標:
                                          </Label>
                                          <Input
                                            type="number"
                                            value={tempTargetValue}
                                            onChange={(e) =>
                                              setTempTargetValue(e.target.value)
                                            }
                                            onKeyDown={(e) =>
                                              handleKeyDown(
                                                e,
                                                keyResult.id,
                                                keyResult.targetValue,
                                              )
                                            }
                                            className="w-20 h-8 text-sm border-neutral-300 focus:border-primary-sunrise"
                                            min="1"
                                            step="1"
                                            placeholder="目標値"
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="h-8 px-3"
                                            onClick={() =>
                                              handleSaveEdit(
                                                keyResult.id,
                                                keyResult.targetValue,
                                              )
                                            }
                                            disabled={
                                              loadingStates[keyResult.id]
                                            }
                                          >
                                            {loadingStates[keyResult.id] ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Save className="w-4 h-4" />
                                            )}
                                            保存
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3"
                                            onClick={handleCancelEdit}
                                          >
                                            <X className="w-4 h-4" />
                                            キャンセル
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleStartEdit(
                                              keyResult.id,
                                              keyResult.currentValue,
                                              keyResult.targetValue,
                                            )
                                          }
                                          className="text-primary-sunrise hover:text-primary-daylight font-semibold text-lg px-2 py-1 rounded hover:bg-primary-sunrise/10 transition-colors border border-dashed border-primary-sunrise/30 hover:border-primary-sunrise/60"
                                          title="クリックして実績値・目標値を編集"
                                        >
                                          {keyResult.currentValue}
                                        </button>
                                        <span className="text-sm font-medium text-neutral-600">
                                          /{' '}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleStartEdit(
                                              keyResult.id,
                                              keyResult.currentValue,
                                              keyResult.targetValue,
                                            )
                                          }
                                          className="text-primary-sunrise hover:text-primary-daylight font-semibold text-lg px-2 py-1 rounded hover:bg-primary-sunrise/10 transition-colors border border-dashed border-primary-sunrise/30 hover:border-primary-sunrise/60"
                                          title="クリックして実績値・目標値を編集"
                                        >
                                          {keyResult.targetValue}
                                        </button>
                                        {keyResult.unit && (
                                          <span className="text-sm font-medium text-neutral-600 ml-1">
                                            {keyResult.unit}
                                          </span>
                                        )}
                                        <span className="text-sm bg-primary-sunrise/10 text-primary-sunrise px-2 py-1 rounded font-medium ml-2">
                                          {Math.round(
                                            (keyResult.currentValue /
                                              keyResult.targetValue) *
                                              100,
                                          )}
                                          %
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="px-4 pb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() =>
                                handleStartAddKeyResult('yearly', yearlyOKR.id)
                              }
                            >
                              <PlusIcon className="w-3 h-3 mr-1" />
                              年次Key Resultを追加
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Quarterly OKRs */}
                      {quarterlyOKRs.length > 0 && (
                        <div>
                          {quarterlyOKRs.map((quarterlyOKR) => (
                            <div
                              key={quarterlyOKR.id}
                              className="p-4 pl-12 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Checkbox
                                    checked={
                                      quarterlyOKR.progressPercentage >= 100
                                    }
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
                                      Q{quarterlyOKR.quarter} Objective:{' '}
                                      {quarterlyOKR.objective}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      {quarterlyOKR.keyResults.length > 0 && (
                                        <h5 className="font-medium text-neutral-800 mb-1 text-xs">
                                          Q{quarterlyOKR.quarter} Key Results
                                        </h5>
                                      )}
                                      {quarterlyOKR.keyResults.length > 0 ? (
                                        quarterlyOKR.keyResults.map(
                                          (keyResult) => (
                                            <div
                                              key={keyResult.id}
                                              className="text-xs text-gray-500"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex-1 text-xs">
                                                  {editingKeyResultDesc ===
                                                  keyResult.id ? (
                                                    <div className="flex flex-col gap-1.5 bg-blue-50 p-2 rounded border border-blue-200">
                                                      <Textarea
                                                        value={
                                                          tempKeyResultDesc
                                                        }
                                                        onChange={(e) =>
                                                          setTempKeyResultDesc(
                                                            e.target.value,
                                                          )
                                                        }
                                                        className="min-h-[50px] text-xs"
                                                        placeholder="Key Resultの説明を入力してください"
                                                      />
                                                      <div className="flex items-center gap-1">
                                                        <Button
                                                          size="sm"
                                                          onClick={
                                                            handleSaveKeyResultDescEdit
                                                          }
                                                          disabled={
                                                            tempKeyResultDesc.trim()
                                                              .length < 5
                                                          }
                                                          className="h-6 px-2 text-xs"
                                                        >
                                                          <Save className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={
                                                            handleCancelKeyResultDescEdit
                                                          }
                                                          className="h-6 px-2 text-xs"
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleStartKeyResultDescEdit(
                                                          keyResult.id,
                                                          keyResult.result,
                                                        )
                                                      }
                                                      className="text-left hover:bg-gray-100 p-1 rounded transition-colors text-xs w-full"
                                                      title="クリックして説明を編集"
                                                    >
                                                      {keyResult.result}
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                  {editingKeyResult ===
                                                  keyResult.id ? (
                                                    <div className="flex flex-col gap-1.5 bg-white/80 p-2 rounded border border-neutral-200 min-w-[220px]">
                                                      <div className="flex items-center gap-1">
                                                        <Label className="text-xs font-medium text-neutral-700 w-8">
                                                          実績:
                                                        </Label>
                                                        <Input
                                                          type="number"
                                                          value={tempValue}
                                                          onChange={(e) =>
                                                            setTempValue(
                                                              e.target.value,
                                                            )
                                                          }
                                                          onKeyDown={(e) =>
                                                            handleKeyDown(
                                                              e,
                                                              keyResult.id,
                                                              keyResult.targetValue,
                                                            )
                                                          }
                                                          className="w-16 h-6 text-xs border-neutral-300 focus:border-primary-sunrise"
                                                          min="0"
                                                          step="1"
                                                          placeholder="実績"
                                                          autoFocus
                                                        />
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <Label className="text-xs font-medium text-neutral-700 w-8">
                                                          目標:
                                                        </Label>
                                                        <Input
                                                          type="number"
                                                          value={
                                                            tempTargetValue
                                                          }
                                                          onChange={(e) =>
                                                            setTempTargetValue(
                                                              e.target.value,
                                                            )
                                                          }
                                                          onKeyDown={(e) =>
                                                            handleKeyDown(
                                                              e,
                                                              keyResult.id,
                                                              keyResult.targetValue,
                                                            )
                                                          }
                                                          className="w-16 h-6 text-xs border-neutral-300 focus:border-primary-sunrise"
                                                          min="1"
                                                          step="1"
                                                          placeholder="目標"
                                                        />
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <Button
                                                          size="sm"
                                                          variant="default"
                                                          className="h-6 px-2 text-xs"
                                                          onClick={() =>
                                                            handleSaveEdit(
                                                              keyResult.id,
                                                              keyResult.targetValue,
                                                            )
                                                          }
                                                          disabled={
                                                            loadingStates[
                                                              keyResult.id
                                                            ]
                                                          }
                                                        >
                                                          {loadingStates[
                                                            keyResult.id
                                                          ] ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                          ) : (
                                                            <Save className="w-3 h-3" />
                                                          )}
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          className="h-6 px-2 text-xs"
                                                          onClick={
                                                            handleCancelEdit
                                                          }
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <>
                                                      <button
                                                        onClick={() =>
                                                          handleStartEdit(
                                                            keyResult.id,
                                                            keyResult.currentValue,
                                                            keyResult.targetValue,
                                                          )
                                                        }
                                                        className="text-primary-sunrise hover:text-primary-daylight font-semibold text-sm px-1.5 py-0.5 rounded hover:bg-primary-sunrise/10 transition-colors border border-dashed border-primary-sunrise/30 hover:border-primary-sunrise/60"
                                                        title="クリックして実績値・目標値を編集"
                                                      >
                                                        {keyResult.currentValue}
                                                      </button>
                                                      <span className="text-xs font-medium text-gray-600">
                                                        /{' '}
                                                      </span>
                                                      <button
                                                        onClick={() =>
                                                          handleStartEdit(
                                                            keyResult.id,
                                                            keyResult.currentValue,
                                                            keyResult.targetValue,
                                                          )
                                                        }
                                                        className="text-primary-sunrise hover:text-primary-daylight font-semibold text-sm px-1.5 py-0.5 rounded hover:bg-primary-sunrise/10 transition-colors border border-dashed border-primary-sunrise/30 hover:border-primary-sunrise/60"
                                                        title="クリックして実績値・目標値を編集"
                                                      >
                                                        {keyResult.targetValue}
                                                      </button>
                                                      {keyResult.unit && (
                                                        <span className="text-xs font-medium text-gray-600 ml-1">
                                                          {keyResult.unit}
                                                        </span>
                                                      )}
                                                      <span className="text-xs bg-primary-sunrise/10 text-primary-sunrise px-1.5 py-0.5 rounded font-medium ml-1">
                                                        {Math.round(
                                                          (keyResult.currentValue /
                                                            keyResult.targetValue) *
                                                            100,
                                                        )}
                                                        %
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        <div className="text-xs text-gray-400 italic">
                                          Key Resultsが設定されていません
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleStartOKREdit(
                                        quarterlyOKR.id,
                                        'quarterly',
                                        quarterlyOKR.objective,
                                      )
                                    }
                                    title="OKRを編集"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleStartOKRDelete(
                                        quarterlyOKR.id,
                                        'quarterly',
                                        `Q${quarterlyOKR.quarter}: ${quarterlyOKR.objective}`,
                                      )
                                    }
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    title="OKRを削除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="px-4 pb-2 pl-12">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() =>
                                    handleStartAddKeyResult(
                                      'quarterly',
                                      quarterlyOKR.id,
                                    )
                                  }
                                >
                                  <PlusIcon className="w-3 h-3 mr-1" />Q
                                  {quarterlyOKR.quarter} Key Resultを追加
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="p-4 pl-12">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                handleStartAddOKR('quarterly', yearlyOKR.year)
                              }
                            >
                              <PlusIcon className="w-4 h-4 mr-2" />
                              {yearlyOKR.year}年に四半期OKRを追加
                            </Button>
                          </div>
                        </div>
                      )}
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
            <Button
              variant="outline"
              onClick={() => handleStartAddOKR('yearly')}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              年次目標を追加
            </Button>
          </CardContent>
        </Card>

        {/* OKR Edit Modal */}
        {editingOKR && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {editingOKR.type === 'yearly' ? '年次' : '四半期'}OKRを編集
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelOKREdit}
                    disabled={savingOKR}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="objective">目標 (Objective)</Label>
                    <Textarea
                      id="objective"
                      value={tempObjective}
                      onChange={(e) => setTempObjective(e.target.value)}
                      placeholder="具体的で測定可能な目標を入力してください"
                      className="min-h-[100px]"
                    />
                    <div
                      className={`text-xs ${
                        tempObjective.trim().length < 10
                          ? 'text-red-500'
                          : tempObjective.trim().length > 200
                            ? 'text-red-500'
                            : 'text-gray-500'
                      }`}
                    >
                      {tempObjective.length}/200文字
                      {tempObjective.trim().length < 10 && (
                        <span className="ml-2 text-red-500">
                          （最低10文字必要）
                        </span>
                      )}
                      {tempObjective.trim().length > 200 && (
                        <span className="ml-2 text-red-500">
                          （200文字を超えています）
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleCancelOKREdit}
                    disabled={savingOKR}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSaveOKREdit}
                    disabled={savingOKR || !isEditingOKRValid()}
                  >
                    {savingOKR ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      '保存'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OKR Delete Confirmation Modal */}
        {deletingOKR && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-red-600">
                    OKRを削除
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelOKRDelete}
                    disabled={isDeleting}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="text-sm text-gray-700">
                    <p className="mb-2">以下のOKRを削除しますか？</p>
                    <div className="bg-gray-50 p-3 rounded border">
                      <p className="font-medium">{deletingOKR.title}</p>
                    </div>
                    <p className="mt-3 text-red-600 font-medium">
                      ⚠️ 関連するKey
                      Resultsも同時に削除されます。この操作は取り消せません。
                    </p>
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleCancelOKRDelete}
                    disabled={isDeleting}
                    className="border-gray-300"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleConfirmOKRDelete}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        削除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        削除する
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* High Value Confirmation Modal */}
        {confirmingHighValue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-orange-600">
                    高い実績値の確認
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelHighValue}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="text-sm text-gray-700">
                    <p className="mb-3">実績値が目標値の2倍を超えています。</p>
                    <div className="bg-orange-50 p-3 rounded border border-orange-200">
                      <p>
                        <span className="font-medium">実績値:</span>{' '}
                        {confirmingHighValue.value}
                      </p>
                      <p>
                        <span className="font-medium">目標値:</span>{' '}
                        {confirmingHighValue.targetValue}
                      </p>
                      <p>
                        <span className="font-medium">比率:</span>{' '}
                        {Math.round(
                          (confirmingHighValue.value /
                            confirmingHighValue.targetValue) *
                            100,
                        )}
                        %
                      </p>
                    </div>
                    <p className="mt-3 text-orange-600 font-medium">
                      ⚠️ この値で保存してもよろしいですか？
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={handleCancelHighValue}>
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleConfirmHighValue}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    この値で保存
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OKR Add Modal */}
        {addingOKR && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {addingOKR.type === 'yearly' ? '年次' : '四半期'}OKRを追加
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelAddOKR}
                    disabled={savingNewOKR}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-objective">目標 (Objective)</Label>
                    <Textarea
                      id="new-objective"
                      value={newOKRObjective}
                      onChange={(e) => setNewOKRObjective(e.target.value)}
                      placeholder="具体的で測定可能な目標を入力してください"
                      className="min-h-[100px]"
                    />
                    <div
                      className={`text-xs ${
                        newOKRObjective.trim().length < 10
                          ? 'text-red-500'
                          : newOKRObjective.trim().length > 200
                            ? 'text-red-500'
                            : 'text-gray-500'
                      }`}
                    >
                      {newOKRObjective.length}/200文字
                      {newOKRObjective.trim().length < 10 && (
                        <span className="ml-2 text-red-500">
                          （最低10文字必要）
                        </span>
                      )}
                      {newOKRObjective.trim().length > 200 && (
                        <span className="ml-2 text-red-500">
                          （200文字を超えています）
                        </span>
                      )}
                    </div>
                  </div>

                  {addingOKR.type === 'quarterly' && (
                    <div className="grid gap-2">
                      <Label htmlFor="quarter">四半期</Label>
                      <select
                        id="quarter"
                        value={newOKRQuarter}
                        onChange={(e) =>
                          setNewOKRQuarter(parseInt(e.target.value))
                        }
                        className="w-full p-2 border border-gray-300 rounded"
                      >
                        <option value={1}>Q1 (1-3月)</option>
                        <option value={2}>Q2 (4-6月)</option>
                        <option value={3}>Q3 (7-9月)</option>
                        <option value={4}>Q4 (10-12月)</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleCancelAddOKR}
                    disabled={savingNewOKR}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSaveNewOKR}
                    disabled={savingNewOKR || !isNewOKRValid()}
                  >
                    {savingNewOKR ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        作成中...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        作成
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Result Add Modal */}
        {addingKeyResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {addingKeyResult.type === 'yearly' ? '年次' : '四半期'}Key
                    Resultを追加
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelAddKeyResult}
                    disabled={savingNewKeyResult}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="new-kr-desc">説明</Label>
                    <Textarea
                      id="new-kr-desc"
                      value={newKeyResultDesc}
                      onChange={(e) => setNewKeyResultDesc(e.target.value)}
                      placeholder="具体的で測定可能なKey Resultを入力してください"
                      className="min-h-[80px]"
                    />
                    <div
                      className={`text-xs ${
                        newKeyResultDesc.trim().length < 5
                          ? 'text-red-500'
                          : newKeyResultDesc.trim().length > 200
                            ? 'text-red-500'
                            : 'text-gray-500'
                      }`}
                    >
                      {newKeyResultDesc.length}/200文字
                      {newKeyResultDesc.trim().length < 5 && (
                        <span className="ml-2 text-red-500">
                          （最低5文字必要）
                        </span>
                      )}
                      {newKeyResultDesc.trim().length > 200 && (
                        <span className="ml-2 text-red-500">
                          （200文字を超えています）
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-kr-target">目標値</Label>
                    <Input
                      id="new-kr-target"
                      type="number"
                      value={newKeyResultTarget}
                      onChange={(e) => setNewKeyResultTarget(e.target.value)}
                      placeholder="100"
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-kr-unit">単位（任意）</Label>
                    <Input
                      id="new-kr-unit"
                      value={newKeyResultUnit}
                      onChange={(e) => setNewKeyResultUnit(e.target.value)}
                      placeholder="例: 個、件、%、時間"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleCancelAddKeyResult}
                    disabled={savingNewKeyResult}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSaveNewKeyResult}
                    disabled={savingNewKeyResult || !isNewKeyResultValid()}
                  >
                    {savingNewKeyResult ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        作成中...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        作成
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
