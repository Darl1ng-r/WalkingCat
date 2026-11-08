import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  edges?: readonly Edge[];
  className?: string;
  contentContainerClassName?: string;
}

export function Screen({
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  className = '',
  contentContainerClassName = '',
  children,
  ...props
}: ScreenProps) {
  const padClass = padded ? 'px-4 pt-3' : '';

  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 bg-background dark:bg-background-dark ${className}`.trim()}
      {...props}>
      {scroll ? (
        <ScrollView
          contentContainerClassName={`flex-grow ${padClass} pb-28 ${contentContainerClassName}`.trim()}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${padClass} ${contentContainerClassName}`.trim()}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
