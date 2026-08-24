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

// Brand tokens (mirror src/global.css). Kept inline so the pill renders
// reliably without depending on NativeWind v5 class resolution at this
// nested level.
const PRIMARY = '#6A4715';
const PRIMARY_FOREGROUND = '#FFFCF7';
const MUTED_FOREGROUND = '#85653D';

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
        // Skip when the settled item already matches `value`. Programmatic
        // value-sync scrolls (e.g. edit prefill, parent reset) land on the
        // selected item; re-emitting onChange there would cascade-reset
        // dependent values in callers like BranchSelector and clobber the
        // prefilled draft.
        if (item && !item.disabled && item.id !== value) onChange(item.id);
      }
    },
    [items, onChange, value],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (disabled) return;
      const item = items[index];
      if (!item || item.disabled) return;
      if (item.id === value) return;
      scrollToIndex(index);
      onChange(item.id);
    },
    [disabled, items, onChange, scrollToIndex, value],
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
        className={`bg-background ${disabled ? 'opacity-50' : ''}`}
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
          // ScrollView is a native RN component (no NativeWind className
          // support); inline backgroundColor mirrors --background.
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToOffsets={snapOffsets.length ? snapOffsets : undefined}
            onLayout={handleContainerLayout}
            onMomentumScrollEnd={handleScrollEnd}
            style={{ backgroundColor: '#FFFFFF' }}
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
                  }`}
                >
                  <Text
                    size={pickerFontSize(item.label)}
                    bold={selected}
                    numberOfLines={2}
                    style={{
                      maxWidth: MAX_ITEM_WIDTH - 24,
                      backgroundColor: selected ? PRIMARY : 'transparent',
                      color: selected ? PRIMARY_FOREGROUND : MUTED_FOREGROUND,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      overflow: 'hidden',
                    }}
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
