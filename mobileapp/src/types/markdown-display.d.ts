declare module 'react-native-markdown-display' {
  import { ComponentType, ReactNode } from 'react';
  import { TextStyle, ViewStyle } from 'react-native';
  export interface MarkdownProps {
    style?: Record<string, TextStyle | ViewStyle>;
    children?: ReactNode;
    onLinkPress?: (url: string) => boolean;
    mergeStyle?: boolean;
  }
  const Markdown: ComponentType<MarkdownProps>;
  export default Markdown;
}
