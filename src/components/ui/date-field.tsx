import { useState } from 'react';

import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { Icon, CalendarIcon } from './icon';
import { Pressable } from './pressable';
import { Text } from './text';
import { VStack } from './vstack';
import {
  formatDateForDisplay,
  formatIsoDate,
  parseIsoDate,
} from '@/utils/dates';

type DateFieldProps = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
};

export function DateField({
  value,
  onChange,
  label,
  disabled = false,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <VStack space="xs">
      {label ? (
        <Text size="md" bold className="text-center text-foreground">
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        className="flex-row items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5"
      >
        <Icon as={CalendarIcon} size="sm" className="text-muted-foreground" />
        <Text size="sm" className="text-foreground">
          {formatDateForDisplay(value)}
        </Text>
      </Pressable>

      {open ? (
        <DateTimePicker
          value={parseIsoDate(value)}
          mode="date"
          presentation="dialog"
          positiveButton={{ label: 'Tamam' }}
          negativeButton={{ label: 'İptal' }}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(formatIsoDate(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </VStack>
  );
}
