import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';

export default function WelfareGuideScreen() {
  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Ethics & Safety</Text>
          <Text variant="title" className="mt-0.5">
            Respectful Cat Spotting
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <Card className="gap-3 border-primary/40 bg-primary-muted/20">
        <Text variant="heading">🐾 The Core Rule</Text>
        <Text variant="caption" className="leading-5">
          Cats are independent community animals. Enjoy spotting them from a respectful distance—never
          alter your walking behavior to chase, corner, touch, or feed stray cats.
        </Text>
      </Card>

      <View className="gap-3">
        <Text variant="label">Photography & Distance Principles</Text>

        <Card className="gap-2 p-4">
          <Text variant="body" className="font-bold">
            1. Keep your distance (≥ 3 meters)
          </Text>
          <Text variant="caption" className="text-xs leading-5">
            Use camera zoom rather than closing the distance on foot. If a cat is resting, grooming,
            or looking away, keep moving naturally.
          </Text>
        </Card>

        <Card className="gap-2 p-4">
          <Text variant="body" className="font-bold">
            2. Camera flash is permanently disabled
          </Text>
          <Text variant="caption" className="text-xs leading-5">
            Sudden bright flashes frighten animals and disrupt their night vision. Our in-app camera
            enforces no-flash operation at all times.
          </Text>
        </Card>

        <Card className="gap-2 p-4">
          <Text variant="body" className="font-bold">
            3. Respect private property
          </Text>
          <Text variant="caption" className="text-xs leading-5">
            Never enter private gardens, driveways, balconies, or restricted areas to photograph a
            cat. Only walk on public sidewalks, parks, and pathways.
          </Text>
        </Card>

        <Card className="gap-2 p-4">
          <Text variant="body" className="font-bold">
            4. Never feed or bait cats for photos
          </Text>
          <Text variant="caption" className="text-xs leading-5">
            Feeding unfamiliar foods can cause sickness or encourage dependency. Never lure a cat into
            traffic or closer to you with treats.
          </Text>
        </Card>
      </View>

      <Card className="gap-3 border-danger/40">
        <Text variant="heading">🏥 What to do if a cat appears injured or sick</Text>
        <Text variant="caption" className="leading-5">
          StrayCat Walk is a personal walking discovery app and cannot dispatch rescuers or provide
          medical assistance. If you find an animal in urgent need of veterinary care or rescue:
        </Text>
        <Text variant="caption" className="text-xs leading-5">
          • Contact your local animal shelter, SPCA/Humane Society, or local veterinary clinic directly.
          {'\n'}• Do not attempt to transport an aggressive or severely injured animal yourself without
          professional guidance.
        </Text>
      </Card>

      <Button
        label="Spot a Cat"
        size="lg"
        onPress={() => router.push('/sighting/capture')}
      />
    </Screen>
  );
}
