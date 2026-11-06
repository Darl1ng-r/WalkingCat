import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  edges?: readonly Edge[];
  className?: string;
  contentContainerClassName?: string;
}

export function Screen({
  scroll = false,
  edges = ['top', 'left', 'right'],
  className = '',
  contentContainerClassName = '',
  children,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 bg-background dark:bg-background-dark ${className}`.trim()}
      {...props}>
      {scroll ? (
        <ScrollView
          contentContainerClassName={`flex-grow px-4 py-4 ${contentContainerClassName}`.trim()}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 px-4 py-4 ${contentContainerClassName}`.trim()}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
