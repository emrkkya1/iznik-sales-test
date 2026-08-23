import { Box } from './box';
import { HStack } from './hstack';

type ProgressBarProps = {
  steps: number;
  current: number; // 0-based index of the active step
};

export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <HStack className="w-full gap-1">
      {Array.from({ length: steps }).map((_, i) => (
        <Box
          key={i}
          style={{ flex: 1 }}
          className={`h-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-accent'}`}
        />
      ))}
    </HStack>
  );
}
