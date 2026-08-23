import { Link } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Icon, ChevronRightIcon, PackageIcon } from '@/components/ui/icon';

export function StaffHomeScreen() {
  return (
    <Box className="flex-1 items-center justify-center p-8">
      <VStack space="xl" className="max-w-xl items-center">
        <Box className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
          <Icon as={PackageIcon} size="xl" className="text-primary-foreground" />
        </Box>

        <VStack space="sm" className="items-center">
          <Heading size="2xl" bold className="text-foreground">
            Teslimat Girişi
          </Heading>
          <Text size="md" className="text-center text-muted-foreground">
            Şube seçerek teslimat ve iade kaydı oluşturun. Kayıt girişi bu ekrandan
            yapılacaktır.
          </Text>
        </VStack>

        <Link href="/history" asChild>
          <Button variant="outline" size="lg">
            <ButtonText>Geçmiş Kayıtlar</ButtonText>
            <ButtonIcon as={ChevronRightIcon} />
          </Button>
        </Link>
      </VStack>
    </Box>
  );
}
