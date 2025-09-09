"use client";

import { useState, useEffect } from 'react';

interface ClientDateProps {
  date: string | Date;
  format?: 'short' | 'long' | 'time';
  className?: string;
}

export function ClientDate({ date, format = 'short', className }: ClientDateProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const dateObj = new Date(date);
    
    let formatted = '';
    switch (format) {
      case 'short':
        formatted = dateObj.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric'
        });
        break;
      case 'long':
        formatted = dateObj.toLocaleDateString('pt-PT', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        break;
      case 'time':
        formatted = dateObj.toLocaleString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        break;
      default:
        formatted = dateObj.toLocaleDateString('pt-PT');
    }
    
    setFormattedDate(formatted);
  }, [date, format]);

  // Show loading placeholder during SSR
  if (!isClient) {
    return <span className={className}>--/--/----</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}
