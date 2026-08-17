import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export default function HomeScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow items-center justify-center p-8"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Box className="w-full max-w-3xl rounded-2xl border border-border bg-card p-8">
        <VStack space="lg">
          <Text size="sm" bold className="text-muted-foreground">
            ANDROID TABLET · LANDSCAPE
          </Text>
          <Heading size="3xl" bold className="text-foreground">
            Tarihi İznik Fırını
          </Heading>
          <Text size="lg" className="text-muted-foreground">
            Satış, iade ve borç takip uygulaması için mimari iskelet hazır.
          </Text>
        </VStack>
      </Box>
    </ScrollView>
  );
}
