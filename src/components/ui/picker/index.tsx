'use client';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Box } from '../box';
import { Pressable } from '../pressable';
import { Spinner } from '../spinner';
import { Text } from '../text';
import { VStack } from '../vstack';
import {
  computeSnapOffsets,
  pickerFontSize,
  snapIndexForOffset,
} from './pickerUtils';

export type PickerItem = { id: string; label: string; disabled?: boolean };

type PickerProps = {
  items: PickerItem[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
};

const MAX_ITEM_WIDTH = 280;

export function Picker({
  items,
  value,
  onChange,
  placeholder,
  label,
  loading = false,
  disabled = false,
}: PickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastTargetIndexRef = useRef<number | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>({});

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const handleItemLayout = useCallback(
    (id: string) => (e: LayoutChangeEvent) => {
      const w = Math.ceil(e.nativeEvent.layout.width);
      setWidths((prev) => {
        if (prev[id] === w) return prev;
        return { ...prev, [id]: w };
      });
    },
    [],
  );

  const measuredWidths = useMemo(
    () => items.map((item) => widths[item.id] ?? 0),
    [items, widths],
  );

  const allMeasured =
    containerWidth > 0 &&
    items.length > 0 &&
    measuredWidths.every((w) => w > 0);

  const snapOffsets = useMemo(
    () =>
      allMeasured ? computeSnapOffsets(measuredWidths, containerWidth) : [],
    [allMeasured, measuredWidths, containerWidth],
  );

  // Keep the latest snap offsets in a ref so scrollToIndex can stay stable.
  const snapOffsetsRef = useRef<number[]>([]);

  useEffect(() => {
    snapOffsetsRef.current = snapOffsets;
  }, [snapOffsets]);

  const selectedIndex = useMemo(
    () => items.findIndex((item) => item.id === value),
    [items, value],
  );

  const scrollToIndex = useCallback((index: number) => {
    const offsets = snapOffsetsRef.current;
    if (offsets.length === 0) return;
    lastTargetIndexRef.current = index;
    scrollRef.current?.scrollTo({ x: offsets[index], animated: true });
  }, []);

  // Sync scroll on external value changes (parent reset / edit prefill).
  // Guarded by lastTargetIndexRef so tap-commits never re-issue an
  // interrupting scroll (which caused the snap-back bug).
  useEffect(() => {
    if (!allMeasured) return;
    if (selectedIndex >= 0) {
      if (selectedIndex !== lastTargetIndexRef.current) {
        scrollToIndex(selectedIndex);
      }
    } else {
      lastTargetIndexRef.current = null;
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, allMeasured]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = snapIndexForOffset(
        snapOffsetsRef.current,
        e.nativeEvent.contentOffset.x,
      );
      if (index >= 0) {
        const item = items[index];
        if (item && !item.disabled) onChange(item.id);
      }
    },
    [items, onChange],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (disabled) return;
      const item = items[index];
      if (!item || item.disabled) return;
      scrollToIndex(index);
      onChange(item.id);
    },
    [disabled, items, onChange, scrollToIndex],
  );

  const leadingPadding = allMeasured
    ? (containerWidth - measuredWidths[0]) / 2
    : 0;

  return (
    <VStack space="xs">
      {label ? (
        <Text size="md" bold className="text-center text-foreground">
          {label}
        </Text>
      ) : null}

      <Box
        className={disabled ? 'opacity-50' : undefined}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        {loading ? (
          <Box className="h-16 items-center justify-center">
            <Spinner size="small" />
          </Box>
        ) : items.length === 0 ? (
          <Box className="h-16 items-center justify-center">
            <Text size="sm" className="text-muted-foreground">
              {placeholder ?? '—'}
            </Text>
          </Box>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToOffsets={snapOffsets.length ? snapOffsets : undefined}
            onLayout={handleContainerLayout}
            onMomentumScrollEnd={handleScrollEnd}
            contentContainerStyle={{ paddingHorizontal: leadingPadding }}
          >
            {items.map((item, index) => {
              const selected = item.id === value;
              const isLast = index === items.length - 1;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handlePress(index)}
                  onLayout={handleItemLayout(item.id)}
                  disabled={item.disabled}
                  className={`h-16 items-center justify-center border-r border-border px-3 ${
                    isLast ? 'border-r-0' : ''
                  } ${selected ? 'bg-primary' : 'bg-transparent'}`}
                >
                  <Text
                    size={pickerFontSize(item.label)}
                    bold={selected}
                    numberOfLines={2}
                    style={{ maxWidth: MAX_ITEM_WIDTH - 24 }}
                    className={`text-center ${
                      selected
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Box>
    </VStack>
  );
}
