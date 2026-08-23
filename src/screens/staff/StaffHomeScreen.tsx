import { Link } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export function StaffHomeScreen() {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="lg" className="items-center max-w-xl">
        <Heading size="2xl" bold className="text-foreground">
          Teslimat Girişi
        </Heading>
        <Text size="md" className="text-center text-muted-foreground">
          Şube seçerek teslimat ve iade kaydı oluşturun. Kayıt girişi bu ekrandan
          yapılacaktır.
        </Text>
        <Link href="/history" asChild>
          <Button variant="outline" size="lg">
            <ButtonText>Geçmiş Kayıtlar</ButtonText>
          </Button>
        </Link>
      </VStack>
    </Box>
  );
}
