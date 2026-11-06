import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import {
  parseInviteCodeFromInput,
  useRedeemInviteMutation,
} from '@/features/social';

export default function RedeemInviteScreen() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const rawCode = Array.isArray(params.code)
    ? params.code[0] ?? ''
    : params.code ?? '';
  const cleanCode = parseInviteCodeFromInput(rawCode) ?? rawCode.toUpperCase();

  const redeemMutation = useRedeemInviteMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acceptedFriendId, setAcceptedFriendId] = useState<string | null>(null);

  const handleAcceptInvite = async () => {
    setErrorMsg(null);
    try {
      const friendId = await redeemMutation.mutateAsync(cleanCode);
      setAcceptedFriendId(friendId);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not redeem invite code.'
      );
    }
  };

  return (
    <Screen className="justify-center">
      <Card className="items-center gap-4 p-6">
        <View className="h-20 w-20 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
          <Text className="text-4xl">
            {acceptedFriendId ? '🎉' : '🤝'}
          </Text>
        </View>

        <View className="rounded-pill bg-primary/15 px-3 py-1">
          <Text variant="label">Invite Code: {cleanCode || '—'}</Text>
        </View>

        <Text variant="title" className="text-center">
          {acceptedFriendId ? "You're Friends!" : 'Friend Invite'}
        </Text>

        <Text variant="caption" className="text-center leading-5">
          {acceptedFriendId
            ? 'You are now connected! You can compare weekly steps, distance, walks, and challenge points on the Friends Leaderboard.'
            : 'Accept this invite to connect as friends on StrayCat Walk. Your walking routes and sighting locations always remain private.'}
        </Text>

        {errorMsg ? (
          <Text
            variant="caption"
            className="text-center font-semibold text-danger">
            {errorMsg}
          </Text>
        ) : null}

        <View className="w-full gap-2.5 pt-2">
          {acceptedFriendId ? (
            <>
              <Button
                label="View Friend Profile"
                size="lg"
                onPress={() => router.replace(`/friend/${acceptedFriendId}`)}
              />
              <Button
                label="Go to Leaderboard"
                variant="secondary"
                onPress={() => router.replace('/social')}
              />
            </>
          ) : (
            <>
              <Button
                label="Accept Friend Invite"
                size="lg"
                loading={redeemMutation.isPending}
                disabled={!cleanCode}
                onPress={() => {
                  handleAcceptInvite().catch(() => {});
                }}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => router.back()}
              />
            </>
          )}
        </View>
      </Card>
    </Screen>
  );
}
