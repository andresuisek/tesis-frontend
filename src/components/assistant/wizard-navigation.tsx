"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, Loader2 } from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface WizardNavigationProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: Set<number>;
}

export function WizardNavigation({
  steps,
  currentStep,
  completedSteps,
}: WizardNavigationProps) {
  return (
    <nav aria-label="Progreso del wizard" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isPending = index > currentStep && !isCompleted;

          return (
            <li key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Línea de conexión */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2",
                      isCompleted || isCurrent
                        ? "bg-primary"
                        : "bg-border"
                    )}
                    style={{ zIndex: 0 }}
                  />
                )}

                {/* Círculo del paso */}
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110",
                    isPending &&
                      "bg-background border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : isCurrent ? (
                    <span className="text-sm font-bold">{index + 1}</span>
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>

                {/* Texto del paso */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors",
                      (isCurrent || isCompleted) && "text-primary",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface ProcessingIndicatorProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
}

export function ProcessingIndicator({
  label,
  isComplete,
  isActive,
}: ProcessingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-shrink-0">
        {isComplete ? (
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : isActive ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
      <span
        className={cn(
          "text-sm",
          isComplete && "text-primary",
          isActive && "text-primary font-medium",
          !isComplete && !isActive && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

