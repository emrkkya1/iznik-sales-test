import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type AdminPlaceholderScreenProps = {
  title: string;
  description?: string;
};

export function AdminPlaceholderScreen({ title, description }: AdminPlaceholderScreenProps) {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="md" className="items-center max-w-lg">
        <Heading size="xl" bold className="text-foreground">
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
