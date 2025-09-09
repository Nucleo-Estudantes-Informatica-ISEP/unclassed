"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/lib/components/ui/badge';
import { Button } from '@/lib/components/ui/button';
import { Card, CardContent } from '@/lib/components/ui/card';
import { Switch } from '@/lib/components/ui/switch';
import { Label } from '@/lib/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/components/ui/select';
import { 
  GripVertical, 
  Plus, 
  X, 
  Shuffle,
  Trophy,
  Medal,
  Award
} from 'lucide-react';

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
  placeholder = "Seleciona as turmas preferidas"
}: ClassRankingSelectorProps) {
  const [orderMatters, setOrderMatters] = useState(preferenceOrderMatters);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Convert IDs to option objects for display
  const selectedOptions = value.map(id => options.find(opt => opt.id === id)).filter(Boolean) as Option[];
  const availableOptions = options.filter(opt => !value.includes(opt.id));

  const handleAddClass = (classId: string) => {
    if (!value.includes(classId)) {
      onChange([...value, classId]);
    }
  };

  const handleRemoveClass = (classId: string) => {
    onChange(value.filter(id => id !== classId));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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
    if (!orderMatters) return <Shuffle className="h-4 w-4" />;
    
    switch (index) {
      case 0: return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1: return <Medal className="h-4 w-4 text-gray-400" />;
      case 2: return <Award className="h-4 w-4 text-orange-600" />;
      default: return <span className="text-sm font-bold text-gray-500">#{index + 1}</span>;
    }
  };

  const getRankText = (index: number) => {
    if (!orderMatters) return "Qualquer ordem";
    
    switch (index) {
      case 0: return "1ª Escolha - 100% satisfação";
      case 1: return "2ª Escolha - 85% satisfação";
      case 2: return "3ª Escolha - 70% satisfação";
      default: return `${index + 1}ª Escolha - ${Math.max(40, 70 - (index - 2) * 10)}% satisfação`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Toggle */}
      <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border">
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
              : "Todas as turmas têm igual prioridade - qualquer uma serve"
            }
          </p>
        </div>
        {!orderMatters && (
          <Badge variant="secondary" className="ml-2">
            <Shuffle className="h-3 w-3 mr-1" />
            Sem ordem
          </Badge>
        )}
      </div>

      {/* Add New Class Selector */}
      {availableOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Adicionar Turma</Label>
          <Select onValueChange={handleAddClass} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center gap-2">
                    <Plus className="h-3 w-3" />
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
              {orderMatters ? "Turmas por Ordem de Preferência" : "Turmas Selecionadas"}
            </Label>
            <Badge variant="outline">
              {selectedOptions.length} turma{selectedOptions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {selectedOptions.map((option, index) => (
              <Card
                key={option.id}
                className={`
                  transition-all duration-200 cursor-move
                  ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                  ${dragOverIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}
                  ${orderMatters ? 'hover:shadow-md' : ''}
                  ${!orderMatters ? 'hover:bg-muted/50' : ''}
                `}
                draggable={orderMatters && !disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  {/* Rank Icon / Drag Handle */}
                  <div className="flex items-center gap-2 min-w-[24px]">
                    {orderMatters && !disabled && (
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    )}
                    {getRankIcon(index)}
                  </div>
                  
                  {/* Class Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">{option.name}</span>
                      <Badge 
                        variant={orderMatters ? (index === 0 ? "default" : "secondary") : "outline"}
                        className="text-xs"
                      >
                        {getRankText(index)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveClass(option.id)}
                    disabled={disabled}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        {orderMatters ? (
          <>
            <p><strong>💡 Dica:</strong> Arrasta para reordenar. A primeira turma tem prioridade máxima!</p>
            <p>🎯 Matches perfeitos (1ª escolha) são criados imediatamente.</p>
          </>
        ) : (
          <>
            <p><strong>🎲 Ordem aleatória:</strong> Todas as turmas têm igual prioridade.</p>
            <p>⚡ Ideal quando qualquer turma serve igualmente bem.</p>
          </>
        )}
      </div>

      {/* Empty State */}
      {selectedOptions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Plus className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>Seleciona pelo menos uma turma para continuar</p>
          <p className="text-xs mt-1">Podes escolher múltiplas turmas e ordená-las por preferência</p>
        </div>
      )}
    </div>
  );
}
