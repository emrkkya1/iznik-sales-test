import { useRef, useState } from 'react';
import { Pressable, ScrollView, type View } from 'react-native';

import { Box } from '@/components/ui/box';
import { ChevronDownIcon, Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type DropdownProps<T extends string> = {
  value: T | null;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  emptyLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

// A simple, accessible dropdown. The trigger is a pressable pill that
// mirrors the input style; the menu opens inline as a child of the
// trigger wrapper, anchored below it. It deliberately avoids opening a
// separate native modal so it can live inside another sheet/modal
// without nested-modal conflicts.
//
// Designed for filter sheets where options are short lists (cities,
// districts, status). The wrapper is `position: relative` so the menu
// anchors correctly even when the parent is inside a scrollable sheet.
export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Seçin…',
  emptyLabel = 'Seçenek yok',
  loading = false,
  disabled = false,
  className,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View | null>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  // Close on outside press is handled by the transparent backdrop below.

  const handleSelect = (next: T) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <Box className="relative">
      <Pressable
        ref={triggerRef}
        onPress={() => !disabled && !loading && setOpen((current) => !current)}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={selected ? selected.label : placeholder}
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        className={`h-10 flex-row items-center justify-between rounded-md border bg-card px-3 ${
          disabled
            ? 'border-border opacity-50'
            : open
              ? 'border-primary'
              : 'border-border'
        } ${className ?? ''}`}
      >
        <Text
          size="sm"
          numberOfLines={1}
          className={selected ? 'text-foreground' : 'text-muted-foreground'}
        >
          {selected ? selected.label : placeholder}
        </Text>
        {loading ? (
          <Spinner size="small" />
        ) : (
          <Icon as={ChevronDownIcon} size="sm" className="text-muted-foreground" />
        )}
      </Pressable>

      {open ? (
        <>
          {/* Transparent backdrop closes the menu on outside press. */}
          <Pressable
            style={{
              position: 'absolute',
              top: -1000,
              left: -1000,
              right: -1000,
              bottom: -1000,
              zIndex: 0,
            }}
            onPress={() => setOpen(false)}
            accessibilityLabel="Dropdown menüsünü kapat"
          />
          <Box
            style={{
              position: 'absolute',
              top: 44,
              left: 0,
              right: 0,
              zIndex: 10,
              maxHeight: 240,
            }}
            className="rounded-xl border border-border bg-card"
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {loading ? (
                <Box className="items-center py-4">
                  <Spinner size="small" />
                </Box>
              ) : options.length === 0 ? (
                <Box className="items-center py-4">
                  <Text size="sm" className="text-muted-foreground">
                    {emptyLabel}
                  </Text>
                </Box>
              ) : (
                options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => !option.disabled && handleSelect(option.value)}
                      disabled={option.disabled}
                      accessibilityRole="menuitem"
                      accessibilityState={{
                        selected: isSelected,
                        disabled: !!option.disabled,
                      }}
                      className={`flex-row items-center justify-between px-3 py-2 ${
                        isSelected
                          ? 'bg-accent'
                          : 'bg-card data-[pressed=true]:bg-accent'
                      }`}
                    >
                      <Text
                        size="sm"
                        bold={isSelected}
                        numberOfLines={1}
                        className="text-foreground"
                      >
                        {option.label}
                      </Text>
                      {isSelected ? (
                        <Text size="xs" className="text-muted-foreground">
                          Seçili
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
