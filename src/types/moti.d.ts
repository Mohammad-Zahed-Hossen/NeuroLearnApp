declare module 'moti' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';
  import { AnimateProps } from 'moti/build/common/types';

  export type MotiViewProps = ViewProps & AnimateProps<ViewProps>;

  export const MotiView: ComponentType<MotiViewProps>;
}