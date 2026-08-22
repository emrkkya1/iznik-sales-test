import { ActivityIndicator } from 'react-native';

import { Box } from './box';
import { Text } from './text';

type SpinnerProps = {
  label?: string;
  size?: 'small' | 'large';
};

export function Spinner({ label, size = 'large' }: SpinnerProps) {
  return (
    <Box className="items-center justify-center gap-3 p-6">
      <ActivityIndicator size={size} />
      {label ? (
        <Text size="sm" className="text-muted-foreground">
          {label}
        </Text>
      ) : null}
    </Box>
  );
}
