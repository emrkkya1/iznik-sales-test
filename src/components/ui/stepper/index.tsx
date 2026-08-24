'use client';
import React, { useState } from 'react';

import { Pressable } from '../pressable';
import { Text } from '../text';
import { VStack } from '../vstack';
import { Icon, MinusIcon, PlusIcon } from '../icon';
import { Input, InputField } from '../input';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  disabled = false,
  label,
  compact = false,
}: QuantityStepperProps) {
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setText(String(value));
  }

  const commitText = () => {
    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
      const next = clamp(parsed, min, max);
      if (next !== value) onChange(next);
      setText(String(next));
    } else {
      setText(String(value));
    }
  };

  const decrement = () => onChange(clamp(value - step, min, max));
  const increment = () => onChange(clamp(value + step, min, max));

  return (
    <VStack space="xs">
      {label ? (
        <Text size="xs" bold className="text-muted-foreground">
          {label}
        </Text>
      ) : null}
      <Input
        className={`${
          compact ? 'h-9' : 'h-11'
        } gap-0 rounded-lg border-border px-0`}
      >
        <Pressable
          onPress={decrement}
          disabled={disabled || value <= min}
          className={`${
            compact ? 'h-9 w-9' : 'h-11 w-11'
          } items-center justify-center ${
            disabled || value <= min ? 'opacity-40' : ''
          }`}
        >
          <Icon as={MinusIcon} size="sm" className="text-foreground" />
        </Pressable>

        <InputField
          value={text}
          onChangeText={setText}
          keyboardType="numeric"
          enterKeyHint="done"
          textAlign="center"
          selectTextOnFocus
          editable={!disabled}
          onBlur={commitText}
          onSubmitEditing={commitText}
          className="py-0"
          style={{ flex: 1, height: compact ? 36 : 44 }}
        />

        <Pressable
          onPress={increment}
          disabled={disabled || value >= max}
          className={`${
            compact ? 'h-9 w-9' : 'h-11 w-11'
          } items-center justify-center ${
            disabled || value >= max ? 'opacity-40' : ''
          }`}
        >
          <Icon as={PlusIcon} size="sm" className="text-foreground" />
        </Pressable>
      </Input>
    </VStack>
  );
}
