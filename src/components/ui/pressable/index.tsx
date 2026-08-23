'use client';
import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';

type IPressableProps = PressableProps & { className?: string };

const Pressable = React.forwardRef<
  React.ComponentRef<typeof RNPressable>,
  IPressableProps
>(function Pressable({ className, ...props }, ref) {
  return <RNPressable ref={ref} {...props} className={className} />;
});

Pressable.displayName = 'Pressable';

export { Pressable };
