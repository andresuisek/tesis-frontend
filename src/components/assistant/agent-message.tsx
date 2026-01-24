"use client";

import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";

interface AgentMessageProps {
  message: string;
  animate?: boolean;
  className?: string;
}

export function AgentMessage({
  message,
  animate = true,
  className,
}: AgentMessageProps) {
  const [displayedText, setDisplayedText] = useState(animate ? "" : message);
  const [isTyping, setIsTyping] = useState(animate);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(message);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [message, animate]);

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-2xl",
        "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
        "border border-blue-100 dark:border-blue-800/50",
        className
      )}
    >
      {/* Avatar del agente */}
      <div className="flex-shrink-0">
        <div className="relative">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          {/* Indicador de estado */}
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900 animate-pulse" />
        </div>
      </div>

      {/* Mensaje */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
          Asistente Tributario
        </p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse rounded-sm" />
          )}
        </p>
      </div>
    </div>
  );
}

