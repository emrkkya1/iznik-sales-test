import { Box } from './box';
import { Button, ButtonText } from './button';
import { HStack } from './hstack';
import { Icon, AlertCircleIcon } from './icon';
import { Text } from './text';
import { VStack } from './vstack';

type QueryErrorProps = {
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
  className?: string;
};

// Inline error state for cards / list regions. Shows a destructive-tinted
// icon + retry button. Compact (one line of text + button) so it fits inside
// a KpiCard or chart card without breaking layout.
export function QueryError({
  onRetry,
  title = 'Veri yüklenemedi',
  retryLabel = 'Tekrar dene',
  className,
}: QueryErrorProps) {
  return (
    <Box className={`items-center justify-center p-4 ${className ?? ''}`}>
      <VStack space="sm" className="items-center">
        <Box className="h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
          <Icon as={AlertCircleIcon} size="sm" className="text-destructive" />
        </Box>
        <Text size="sm" bold className="text-center text-destructive">
          {title}
        </Text>
        {onRetry ? (
          <HStack>
            <Button variant="outline" size="sm" onPress={onRetry}>
              <ButtonText>{retryLabel}</ButtonText>
            </Button>
          </HStack>
        ) : null}
      </VStack>
    </Box>
  );
}