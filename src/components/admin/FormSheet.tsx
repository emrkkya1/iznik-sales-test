import { useMemo, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export type FormField =
  | {
      name: string;
      label: string;
      type: 'text';
      required?: boolean;
      placeholder?: string;
      defaultValue?: string;
    }
  | {
      name: string;
      label: string;
      type: 'numeric';
      required?: boolean;
      placeholder?: string;
      defaultValue?: string;
    }
  | {
      name: string;
      label: string;
      type: 'boolean';
      required?: false;
      defaultValue?: boolean;
    };

export type FormSheetValues = Record<string, string | boolean>;

type FormSheetProps = {
  open: boolean;
  title: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (values: FormSheetValues) => Promise<void> | void;
  onCancel: () => void;
  initialValues?: FormSheetValues;
  serverError?: string;
  isSubmitting?: boolean;
};

// Generic bottom-anchored form sheet. Sheet content is wrapped in
// KeyboardAvoidingView (Android: behavior="height" per SRS) so the Submit
// button stays visible above the soft keyboard.
export function FormSheet({
  open,
  title,
  fields,
  submitLabel = 'Kaydet',
  cancelLabel = 'İptal',
  onSubmit,
  onCancel,
  initialValues,
  serverError,
  isSubmitting = false,
}: FormSheetProps) {
  const insets = useSafeAreaInsets();

  const seedValues = useMemo<FormSheetValues>(() => {
    const seed: FormSheetValues = {};
    for (const field of fields) {
      if (initialValues && field.name in initialValues) {
        seed[field.name] = initialValues[field.name];
      } else if (field.type === 'boolean') {
        seed[field.name] = field.defaultValue ?? false;
      } else {
        seed[field.name] = field.defaultValue ?? '';
      }
    }
    return seed;
  }, [fields, initialValues]);

  const [values, setValues] = useState<FormSheetValues>(seedValues);

  // Reset values to fresh seeds whenever the sheet transitions from closed →
  // open. Per React docs this is acceptable inside render: deriving state from
  // current props avoids the cascading-render warning that `useEffect +
  // setState` would produce.
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setValues(seedValues);
  }
  if (!open && wasOpen) {
    setWasOpen(false);
  }

  const validity = useMemo(() => {
    const errors: Record<string, string | undefined> = {};
    for (const field of fields) {
      if (field.type === 'boolean') continue;
      const raw = values[field.name];
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (field.required && text === '') {
        errors[field.name] = 'Zorunlu alan';
      } else if (
        field.type === 'numeric' &&
        text !== '' &&
        !/^-?\d+(?:[.,]\d{1,2})?$/.test(text)
      ) {
        errors[field.name] = 'Geçerli bir sayı girin';
      }
    }
    const isValid = Object.values(errors).every((e) => !e);
    return { errors, isValid };
  }, [fields, values]);

  const handleSubmit = async () => {
    if (!validity.isValid || isSubmitting) return;
    await onSubmit(values);
  };

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 items-center justify-end bg-black/50"
        onPress={onCancel}
      >
        <KeyboardAvoidingView
          behavior="height"
          style={{ width: '100%' }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Box
              className="w-full rounded-t-2xl border-t border-border bg-card"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <HStack className="items-center justify-between border-b border-border px-4 py-3">
                <Button variant="ghost" size="sm" onPress={onCancel}>
                  <ButtonText className="text-muted-foreground">
                    {cancelLabel}
                  </ButtonText>
                </Button>
                <Text size="lg" bold className="text-foreground">
                  {title}
                </Text>
                <Box style={{ width: 60 }} />
              </HStack>

              <ScrollView
                style={{ maxHeight: 480 }}
                keyboardShouldPersistTaps="handled"
              >
                <VStack space="md" className="p-4">
                  {fields.map((field) => {
                    if (field.type === 'boolean') {
                      const current = Boolean(values[field.name]);
                      return (
                        <HStack
                          key={field.name}
                          className="items-center justify-between"
                        >
                          <Text size="md" className="text-foreground">
                            {field.label}
                          </Text>
                          <HStack space="xs">
                            <Button
                              variant={current ? 'default' : 'outline'}
                              size="sm"
                              onPress={() =>
                                setValues((v) => ({ ...v, [field.name]: true }))
                              }
                            >
                              <ButtonText>Evet</ButtonText>
                            </Button>
                            <Button
                              variant={!current ? 'default' : 'outline'}
                              size="sm"
                              onPress={() =>
                                setValues((v) => ({ ...v, [field.name]: false }))
                              }
                            >
                              <ButtonText>Hayır</ButtonText>
                            </Button>
                          </HStack>
                        </HStack>
                      );
                    }

                    const raw = values[field.name];
                    const text = typeof raw === 'string' ? raw : '';
                    const error = validity.errors[field.name];

                    return (
                      <VStack key={field.name} space="xs">
                        <Text size="sm" className="text-foreground">
                          {field.label}
                          {field.required ? (
                            <Text size="sm" className="text-destructive">
                              {' *'}
                            </Text>
                          ) : null}
                        </Text>
                        <Input isInvalid={!!error}>
                          <InputField
                            value={text}
                            onChangeText={(next) =>
                              setValues((v) => ({ ...v, [field.name]: next }))
                            }
                            placeholder={field.placeholder}
                            keyboardType={
                              field.type === 'numeric' ? 'decimal-pad' : 'default'
                            }
                            autoCapitalize="sentences"
                          />
                        </Input>
                        {error ? (
                          <Text size="xs" className="text-destructive">
                            {error}
                          </Text>
                        ) : null}
                      </VStack>
                    );
                  })}
                </VStack>
              </ScrollView>

              {serverError ? (
                <Text
                  size="sm"
                  className="px-4 pb-2 text-destructive"
                >
                  {serverError}
                </Text>
              ) : null}

              <Box className="border-t border-border p-4">
                <Button
                  onPress={handleSubmit}
                  disabled={!validity.isValid || isSubmitting}
                  className="w-full"
                >
                  <ButtonText>
                    {isSubmitting ? 'Kaydediliyor…' : submitLabel}
                  </ButtonText>
                </Button>
              </Box>
            </Box>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}