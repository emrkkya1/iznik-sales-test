'use client';
import React from 'react';
import { View } from 'react-native';
import { tva, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';

const dividerStyle = tva({
  base: 'bg-border',
  variants: {
    orientation: {
      vertical: 'w-px',
      horizontal: 'h-px',
    },
  },
});

const StyledDivider = styled(View, { className: 'style' });

type IDividerProps = React.ComponentPropsWithoutRef<typeof StyledDivider> &
  VariantProps<typeof dividerStyle>;

const Divider = React.forwardRef<
  React.ComponentRef<typeof StyledDivider>,
  IDividerProps
>(function Divider({ className, orientation = 'horizontal', ...props }, ref) {
  return (
    <StyledDivider
      ref={ref}
      {...props}
      className={dividerStyle({ orientation, class: className })}
    />
  );
});

Divider.displayName = 'Divider';

export { Divider };
