import { Image } from 'expo-image';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon, PackageIcon, PlusIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { QuantityStepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatCurrency } from '@/utils/formatters';

type ProductCardProps = {
  name: string;
  imageUrl: string | null;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  price: number;
  className?: string;
};

export function ProductCard({
  name,
  imageUrl,
  quantity,
  onQuantityChange,
  price,
  className,
}: ProductCardProps) {
  const enabled = quantity > 0;

  return (
    <Pressable
      onPress={enabled ? undefined : () => onQuantityChange(1)}
      className={`w-full overflow-hidden rounded-xl border border-border bg-card ${
        enabled ? '' : 'opacity-40'
      } ${className ?? ''}`}
    >
      <Box className="relative">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="cover"
            transition={200}
            style={{ width: '100%', height: 96 }}
          />
        ) : (
          <Box className="h-24 items-center justify-center bg-muted">
            <Icon as={PackageIcon} size="xl" className="text-muted-foreground" />
          </Box>
        )}

        <Box className="absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 shadow-sm">
          <Text size="2xs" bold className="text-foreground">
            {formatCurrency(price)}
          </Text>
        </Box>
      </Box>

      <VStack space="sm" className="p-3">
        <Text size="sm" bold numberOfLines={1} className="text-foreground">
          {name}
        </Text>

        <Box style={{ height: 44 }}>
          {enabled ? (
            <QuantityStepper value={quantity} onChange={onQuantityChange} min={0} />
          ) : (
            <HStack space="xs" className="h-full items-center justify-center">
              <Icon as={PlusIcon} size="sm" className="text-primary" />
              <Text size="xs" bold className="text-primary">
                Ekle
              </Text>
            </HStack>
          )}
        </Box>
      </VStack>
    </Pressable>
  );
}
