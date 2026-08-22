import type { ReactNode } from 'react';

import { Box } from './box';
import { Text } from './text';
import { VStack } from './vstack';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, subtitle, icon, action }: EmptyStateProps) {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="md" className="items-center max-w-md">
        {icon}
        <Text size="lg" bold className="text-center text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text size="sm" className="text-center text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
        {action}
      </VStack>
    </Box>
  );
}
