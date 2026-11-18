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
      className={`flex-1 bg-[#191A26] ${className}`.trim()}
      {...props}>
      <View className="w-full max-w-[480px] flex-1 self-center overflow-hidden bg-background dark:bg-background-dark">
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
      </View>
    </SafeAreaView>
  );
}
