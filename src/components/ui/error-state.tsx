import { Box } from './box';
import { Button, ButtonText } from './button';
import { Text } from './text';
import { VStack } from './vstack';
import { Icon, AlertCircleIcon } from './icon';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = 'Bir sorun oluştu',
  message,
  onRetry,
  retryLabel = 'Tekrar dene',
}: ErrorStateProps) {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="md" className="max-w-md items-center">
        <Box className="h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <Icon as={AlertCircleIcon} size="lg" className="text-destructive" />
        </Box>
        <Text size="lg" bold className="text-center text-destructive">
          {title}
        </Text>
        {message ? (
          <Text size="sm" className="text-center text-muted-foreground">
            {message}
          </Text>
        ) : null}
        {onRetry ? (
          <Button variant="outline" onPress={onRetry}>
            <ButtonText>{retryLabel}</ButtonText>
          </Button>
        ) : null}
      </VStack>
    </Box>
  );
}
