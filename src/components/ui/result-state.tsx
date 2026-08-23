import type { ReactNode } from 'react';

import { Box } from './box';
import { Icon, CheckIcon } from './icon';
import { Text } from './text';
import { VStack } from './vstack';

type ResultStateProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function ResultState({
  title,
  subtitle,
  action,
  children,
}: ResultStateProps) {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="md" className="max-w-md items-center">
        <Box className="h-14 w-14 items-center justify-center rounded-full bg-primary">
          <Icon as={CheckIcon} size="xl" className="text-primary-foreground" />
        </Box>
        <Text size="xl" bold className="text-center text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text size="sm" className="text-center text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
        {children}
        {action}
      </VStack>
    </Box>
  );
}
