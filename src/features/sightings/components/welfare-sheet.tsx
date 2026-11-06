import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';

export interface WelfareSheetProps {
  onAcknowledge: () => void;
  onCancel?: () => void;
}

const WELFARE_TIPS = [
  {
    emoji: '🔭',
    title: 'Keep a respectful distance',
    body: 'Use the camera zoom instead of stepping closer so the cat feels relaxed and safe.',
  },
  {
    emoji: '⚡',
    title: 'Flash is always off',
    body: 'Camera flash is permanently disabled to avoid startling or stressing cats.',
  },
  {
    emoji: '🐾',
    title: 'Do not chase, touch, or feed',
    body: 'Observe quietly without disturbing resting, eating, or hiding cats.',
  },
  {
    emoji: '🏡',
    title: 'Stay on public paths',
    body: 'Never enter private property, yards, or unsafe areas to take a photo.',
  },
] as const;

export function WelfareSheet({ onAcknowledge, onCancel }: WelfareSheetProps) {
  return (
    <Card className="gap-4 p-6">
      <View className="gap-1">
        <Text variant="label">Cat Welfare First</Text>
        <Text variant="title" className="mt-0.5">
          Gentle Photography 🐾
        </Text>
        <Text variant="caption" className="mt-1 leading-5">
          Before taking your photo, please keep these simple promises in mind:
        </Text>
      </View>

      <View className="gap-3">
        {WELFARE_TIPS.map((tip) => (
          <View key={tip.title} className="flex-row items-start gap-3">
            <Text className="mt-0.5 text-xl">{tip.emoji}</Text>
            <View className="flex-1">
              <Text variant="body" className="font-semibold">
                {tip.title}
              </Text>
              <Text variant="caption" className="mt-0.5 text-xs leading-5">
                {tip.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="gap-2 pt-2">
        <Button label="Got It — Open Camera" size="lg" onPress={onAcknowledge} />
        {onCancel ? (
          <Button label="Cancel" variant="ghost" onPress={onCancel} />
        ) : null}
      </View>
    </Card>
  );
}
