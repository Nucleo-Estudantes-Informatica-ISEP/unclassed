"use client";

import React, { useState } from "react";
import {
  Award,
  GripVertical,
  Medal,
  Plus,
  Shuffle,
  Trophy,
  X,
  Lightbulb,
  Target,
  Dices,
  Zap
} from "lucide-react";

import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Label } from "@/lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";
import { Switch } from "@/lib/components/ui/switch";

interface Option {
  id: string;
  name: string;
}

interface ClassRankingSelectorProps {
  options: Option[];
  value: string[];
  onChange: (classIds: string[]) => void;
  preferenceOrderMatters?: boolean;
  onPreferenceOrderChange?: (orderMatters: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ClassRankingSelector({
  options,
  value,
  onChange,
  preferenceOrderMatters = true,
  onPreferenceOrderChange,
  disabled = false,
  placeholder = "Seleciona as turmas preferidas",
}: ClassRankingSelectorProps) {
  const [orderMatters, setOrderMatters] = useState(preferenceOrderMatters);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Convert IDs to option objects for display
  const selectedOptions = value
    .map((id) => options.find((opt) => opt.id === id))
    .filter(Boolean) as Option[];
  const availableOptions = options.filter((opt) => !value.includes(opt.id));

  const handleAddClass = (classId: string) => {
    if (!value.includes(classId)) {
      onChange([...value, classId]);
    }
  };

  const handleRemoveClass = (classId: string) => {
    onChange(value.filter((id) => id !== classId));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newValue = [...value];
    const draggedItem = newValue[draggedIndex];

    // Remove dragged item
    newValue.splice(draggedIndex, 1);

    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newValue.splice(insertIndex, 0, draggedItem);

    onChange(newValue);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleOrderToggle = (checked: boolean) => {
    setOrderMatters(checked);
    onPreferenceOrderChange?.(checked);
    if (!checked) {
      // If order doesn't matter, shuffle to show it visually
      const shuffled = [...value].sort(() => Math.random() - 0.5);
      onChange(shuffled);
    }
  };

  const getRankIcon = (index: number) => {
    if (!orderMatters) return <Shuffle className="size-4" />;

    switch (index) {
      case 0:
        return <Trophy className="size-4 text-yellow-500" />;
      case 1:
        return <Medal className="size-4 text-gray-400" />;
      case 2:
        return <Award className="size-4 text-orange-600" />;
      default:
        return (
          <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
        );
    }
  };

  const getRankText = (index: number) => {
    if (!orderMatters) return "Qualquer ordem";

    switch (index) {
      case 0:
        return "1ª Escolha";
      case 1:
        return "2ª Escolha";
      case 2:
        return "3ª Escolha";
      default:
        return `${index + 1}ª Escolha`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Toggle */}
      <div className="flex items-center space-x-3 rounded-lg border bg-muted/30 p-3">
        <Switch
          id="order-matters"
          checked={orderMatters}
          onCheckedChange={handleOrderToggle}
          disabled={disabled}
        />
        <div className="flex-1">
          <Label htmlFor="order-matters" className="text-sm font-medium">
            A ordem de preferência importa
          </Label>
          <p className="text-xs text-muted-foreground">
            {orderMatters
              ? "As turmas serão priorizadas pela ordem que escolheres"
              : "Todas as turmas têm igual prioridade - qualquer uma serve"}
          </p>
        </div>
        {!orderMatters && (
          <Badge variant="secondary" className="ml-2">
            <Shuffle className="mr-1 size-3" />
            Sem ordem
          </Badge>
        )}
      </div>

      {/* Add New Class Selector */}
      {availableOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Adicionar Turma</Label>
          <Select onValueChange={handleAddClass} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center gap-2">
                    <Plus className="size-3" />
                    {option.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Classes List */}
      {selectedOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {orderMatters
                ? "Turmas por Ordem de Preferência"
                : "Turmas Selecionadas"}
            </Label>
            <Badge variant="outline">
              {selectedOptions.length} turma
              {selectedOptions.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="space-y-2">
            {selectedOptions.map((option, index) => (
              <Card
                key={option.id}
                className={`
                  cursor-move transition-all duration-200
                  ${draggedIndex === index ? "scale-95 opacity-50" : ""}
                  ${dragOverIndex === index ? "ring-2 ring-primary ring-offset-2" : ""}
                  ${orderMatters ? "hover:shadow-md" : ""}
                  ${!orderMatters ? "hover:bg-muted/50" : ""}
                `}
                draggable={orderMatters && !disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  {/* Rank Icon / Drag Handle */}
                  <div className="flex min-w-[24px] items-center gap-2">
                    {orderMatters && !disabled && (
                      <GripVertical className="size-4 cursor-grab text-muted-foreground active:cursor-grabbing" />
                    )}
                    {getRankIcon(index)}
                  </div>

                  {/* Class Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-medium md:text-lg">
                        {option.name}
                      </span>
                      <Badge
                        variant={
                          orderMatters
                            ? index === 0
                              ? "default"
                              : "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {getRankText(index)}
                      </Badge>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveClass(option.id)}
                    disabled={disabled}
                    className="size-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="space-y-2 text-xs text-muted-foreground mt-4">
        {orderMatters ? (
          <>
            <p className="flex items-start gap-1.5">
              <Lightbulb className="w-4 h-4 shrink-0 text-amber-500" />
              <span><strong>Dica:</strong> Arrasta para reordenar. A primeira turma tem prioridade máxima!</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Target className="w-4 h-4 shrink-0 text-primary" />
              <span>Matches perfeitos (1ª escolha) são criados imediatamente.</span>
            </p>
          </>
        ) : (
          <>
            <p className="flex items-start gap-1.5">
              <Dices className="w-4 h-4 shrink-0 text-violet-500" />
              <span><strong>Ordem aleatória:</strong> Todas as turmas têm igual prioridade.</span>
            </p>
            <p className="flex items-start gap-1.5">
              <Zap className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Ideal quando qualquer turma serve igualmente bem.</span>
            </p>
          </>
        )}
      </div>

      {/* Empty State */}
      {selectedOptions.length === 0 && (
        <div className="rounded-lg border-2 border-dashed py-8 text-center text-muted-foreground">
          <Plus className="mx-auto mb-2 size-8 opacity-50" />
          <p>Seleciona pelo menos uma turma para continuar</p>
          <p className="mt-1 text-xs">
            Podes escolher múltiplas turmas e ordená-las por preferência
          </p>
        </div>
      )}
    </div>
  );
}
