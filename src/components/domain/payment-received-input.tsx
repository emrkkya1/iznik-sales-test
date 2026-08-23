import { useState } from 'react';

import { Box } from '@/components/ui/box';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type PaymentReceivedInputProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function toText(value: number): string {
  return value === 0 ? '' : String(value);
}

export function PaymentReceivedInput({
  value,
  onChange,
  label = 'Tahsilat Gir',
}: PaymentReceivedInputProps) {
  const [text, setText] = useState(() => toText(value));
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setText(toText(value));
  }

  const commit = () => {
    const raw = text.replace(',', '.').trim();
    if (raw === '') {
      if (value !== 0) onChange(0);
      setText('');
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const next = round2(parsed);
      if (next !== value) onChange(next);
      setText(toText(next));
    } else {
      setText(toText(value));
    }
  };

  return (
    <VStack space="xs" className="items-center">
      <Text size="xs" bold className="text-center text-muted-foreground">
        {label} (₺)
      </Text>
      <Box style={{ width: 160 }}>
        <Input>
          <InputField
            keyboardType="decimal-pad"
            enterKeyHint="done"
            placeholder="0,00"
            value={text}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={commit}
          />
        </Input>
      </Box>
    </VStack>
  );
}
