import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icon';

type FloatingCreateButtonProps = {
  label: string;
  onPress: () => void;
};

// Floating bottom-right action button (FAB style with icon + label). Rendered
// inside a relative-positioned parent — this component itself is `absolute`.
// `pointerEvents="box-none"` on the wrapper lets taps fall through to the
// underlying list except where the button itself sits.
//
// Layout: `flex-row justify-end` pushes the button to the right edge in flex
// row direction (rather than `items-end` which would align vertically only
// and leave the button at the bottom-left). `flex-shrink-0` on the button is
// defensive against any flex compression of its label.
export function FloatingCreateButton({ label, onPress }: FloatingCreateButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <Box
      pointerEvents="box-none"
      className="absolute bottom-0 right-6 flex-row justify-end"
      style={{
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <Button
        size="lg"
        onPress={onPress}
        className="rounded-full shadow-lg flex-shrink-0"
        accessibilityLabel={label}
      >
        <ButtonIcon as={PlusIcon} />
        <ButtonText>{label}</ButtonText>
      </Button>
    </Box>
  );
}