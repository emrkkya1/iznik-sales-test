import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Icon, InfoIcon } from '@/components/ui/icon';

type AdminPlaceholderScreenProps = {
  title: string;
  description?: string;
};

export function AdminPlaceholderScreen({
  title,
  description,
}: AdminPlaceholderScreenProps) {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="md" className="max-w-lg items-center">
        <Box className="h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Icon as={InfoIcon} size="xl" className="text-primary" />
        </Box>
        <Heading size="xl" bold className="text-center text-foreground">
          {title}
        </Heading>
        {description ? (
          <Text size="md" className="text-center text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </VStack>
    </Box>
  );
}
