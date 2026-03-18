'use client';

interface StepperStep {
  number: number;
  title: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  canNavigateTo?: (step: number) => boolean;
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, canNavigateTo, onStepClick }: StepperProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      {steps.map((step, index) => {
        const isComplete = currentStep > step.number;
        const isActive = currentStep === step.number;
        const isClickable = canNavigateTo ? canNavigateTo(step.number) : false;

        return (
          <div key={step.number} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isClickable && onStepClick) {
                  onStepClick(step.number);
                }
              }}
              disabled={!isClickable}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                isActive || isComplete
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface-border)] text-[var(--muted)]'
              } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              {step.number}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted-strong)]'}`}>{step.title}</p>
            </div>
            {index < steps.length - 1 ? (
              <div className={`hidden h-1 flex-1 rounded-full lg:block ${isComplete ? 'bg-[var(--primary)]' : 'bg-[var(--surface-border)]'}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
