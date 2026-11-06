import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, Input, Text } from '@/components/ui';
import {
  useCatCollection,
  useLinkSightingMutation,
  useRenameCatMutation,
} from '../hooks';
import { validateCatNickname } from '../utils';
import { CatCard } from './cat-card';

export interface NewCatAcceptedSheetProps {
  sightingId: string;
  catId: string | null;
  imageUri: string | null;
  onDone: () => void;
  onSpotAnother?: () => void;
}

type SheetMode = 'menu' | 'nickname' | 'link';

export function NewCatAcceptedSheet({
  sightingId,
  catId,
  imageUri,
  onDone,
  onSpotAnother,
}: NewCatAcceptedSheetProps) {
  const [mode, setMode] = useState<SheetMode>('menu');
  const [nicknameInput, setNicknameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const { data: allCats = [] } = useCatCollection('newest');
  const renameMutation = useRenameCatMutation();
  const linkMutation = useLinkSightingMutation();

  // Existing cats to link to (exclude the newly auto-created cat for this sighting)
  const existingCats = allCats.filter((c) => c.id !== catId);

  const handleSaveNickname = async () => {
    setErrorMsg(null);
    const check = validateCatNickname(nicknameInput);
    if (!check.valid) {
      setErrorMsg(check.error ?? 'Invalid nickname.');
      return;
    }
    if (!catId) {
      setErrorMsg('Cat card is still syncing — please wait a moment.');
      return;
    }

    try {
      await renameMutation.mutateAsync({
        catId,
        nickname: check.sanitized,
      });
      setSuccessNote(
        check.sanitized
          ? `Saved nickname "${check.sanitized}"!`
          : 'Cat card updated!'
      );
      setMode('menu');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not save nickname.'
      );
    }
  };

  const handleLinkToExistingCat = async (targetCatId: string) => {
    setErrorMsg(null);
    try {
      await linkMutation.mutateAsync({
        sightingId,
        targetCatId,
      });
      setSuccessNote('Linked to your existing cat card!');
      setMode('menu');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not link sighting.'
      );
    }
  };

  if (mode === 'nickname') {
    return (
      <Card className="gap-4 p-5">
        <View className="gap-1">
          <Text variant="label">New Cat Card</Text>
          <Text variant="title">Give a Nickname 🐱</Text>
          <Text variant="caption">
            Choose a playful name (up to 30 characters). You can change it anytime in your
            collection.
          </Text>
        </View>

        <Input
          label="Cat Nickname"
          placeholder="e.g. Sir Whiskers, Sunny Porch Cat"
          value={nicknameInput}
          onChangeText={(text) => {
            setNicknameInput(text);
            setErrorMsg(null);
          }}
          maxLength={30}
          autoFocus
          error={errorMsg ?? undefined}
          hint={`${nicknameInput.trim().length}/30 characters`}
        />

        <View className="flex-row gap-3 pt-1">
          <Button
            label="Back"
            variant="ghost"
            className="flex-1"
            disabled={renameMutation.isPending}
            onPress={() => {
              setErrorMsg(null);
              setMode('menu');
            }}
          />
          <Button
            label="Save Nickname"
            className="flex-1"
            loading={renameMutation.isPending}
            onPress={() => {
              handleSaveNickname().catch(() => {});
            }}
          />
        </View>
      </Card>
    );
  }

  if (mode === 'link') {
    return (
      <Card className="max-h-[540px] gap-4 p-5">
        <View className="gap-1">
          <Text variant="label">Manual Link</Text>
          <Text variant="title">I&apos;ve Seen This Cat Before</Text>
          <Text variant="caption">
            Tap one of your existing cat cards below to add this sighting to its timeline.
          </Text>
        </View>

        {errorMsg ? (
          <Text variant="caption" className="font-semibold text-danger">
            {errorMsg}
          </Text>
        ) : null}

        {existingCats.length === 0 ? (
          <View className="items-center gap-2 py-6">
            <Text className="text-3xl">🐾</Text>
            <Text variant="body" className="text-center font-semibold">
              No other cat cards yet
            </Text>
            <Text variant="caption" className="text-center">
              This is the first cat in your collection! Future sightings can be linked here.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="max-h-72"
            contentContainerClassName="gap-3 pb-2"
            showsVerticalScrollIndicator={false}>
            {existingCats.map((cat) => (
              <CatCard
                key={cat.id}
                cat={cat}
                onPress={(picked) => {
                  handleLinkToExistingCat(picked.id).catch(() => {});
                }}
              />
            ))}
          </ScrollView>
        )}

        <Button
          label="Back"
          variant="ghost"
          disabled={linkMutation.isPending}
          onPress={() => {
            setErrorMsg(null);
            setMode('menu');
          }}
        />
      </Card>
    );
  }

  return (
    <Card className="items-center gap-4 p-6">
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 112, height: 112, borderRadius: 20 }}
          contentFit="cover"
          accessibilityLabel="Accepted cat sighting photo"
        />
      ) : (
        <View className="h-20 w-20 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
          <Text className="text-4xl">🐱</Text>
        </View>
      )}

      <View className="rounded-pill bg-secondary/20 px-3 py-1">
        <Text variant="label" className="text-secondary-dark dark:text-secondary">
          Added to Collection
        </Text>
      </View>

      <Text variant="title" className="text-center">
        New cat added! 🐱
      </Text>

      <Text variant="caption" className="text-center leading-5">
        {successNote ??
          'A new collectible cat card has been added to your private collection.'}
      </Text>

      <View className="w-full gap-2.5 pt-1">
        <Button
          label="Give a nickname"
          variant="secondary"
          disabled={!catId}
          onPress={() => {
            setErrorMsg(null);
            setMode('nickname');
          }}
        />

        <Button
          label="I've seen this cat before"
          variant="secondary"
          onPress={() => {
            setErrorMsg(null);
            setMode('link');
          }}
        />

        <Button label="Done" size="lg" onPress={onDone} />

        {onSpotAnother ? (
          <Button
            label="Spot Another Cat"
            variant="ghost"
            onPress={onSpotAnother}
          />
        ) : null}
      </View>
    </Card>
  );
}
