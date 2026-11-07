import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Button, Card, Input, Text } from '@/components/ui';
import {
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
} from '../api';
import { useSubmitReportMutation } from '../hooks';

export interface ReportModalProps {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  onClose: () => void;
}

export function ReportModal({
  visible,
  targetType,
  targetId,
  targetTitle,
  onClose,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] =
    useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reportMutation = useSubmitReportMutation();

  const handleSubmit = async () => {
    setErrorMsg(null);
    try {
      await reportMutation.mutateAsync({
        targetType,
        targetId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not submit report.'
      );
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setDetails('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleResetAndClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-4">
        <Card className="w-full max-w-md gap-4 p-5">
          {submitted ? (
            <View className="items-center gap-3 py-4">
              <View className="h-16 w-16 items-center justify-center rounded-pill bg-secondary/20">
                <Text className="text-3xl">✓</Text>
              </View>
              <Text variant="heading" className="text-center">
                Report Submitted
              </Text>
              <Text variant="caption" className="text-center leading-5">
                Thanks for helping keep StrayCat Walk safe and respectful. Our team will review
                this report promptly. Content with multiple reports is automatically hidden from
                friends pending review.
              </Text>
              <Button
                label="Done"
                className="mt-2 w-full"
                onPress={handleResetAndClose}
              />
            </View>
          ) : (
            <>
              <View className="gap-1">
                <Text variant="label">Safety & Moderation</Text>
                <Text variant="heading">Report Content</Text>
                {targetTitle ? (
                  <Text variant="caption" className="font-semibold">
                    Target: {targetTitle}
                  </Text>
                ) : null}
              </View>

              <Text variant="caption" className="text-xs">
                Select a reason for this report:
              </Text>

              <View className="gap-2">
                {REPORT_REASONS.map((r) => {
                  const active = selectedReason === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      accessibilityRole="button"
                      accessibilityLabel={r.label}
                      onPress={() => setSelectedReason(r.key)}
                      className={`rounded-card border p-2.5 ${
                        active
                          ? 'border-primary bg-primary-muted dark:bg-surface-elevated-dark'
                          : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                      }`}>
                      <Text
                        variant="caption"
                        className={`font-bold ${
                          active
                            ? 'text-primary-dark dark:text-primary-light'
                            : 'text-text-primary dark:text-text-primary-dark'
                        }`}>
                        {r.label}
                      </Text>
                      <Text variant="caption" className="mt-0.5 text-[11px]">
                        {r.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Input
                label="Additional details (optional)"
                placeholder="Describe why this content is concerning…"
                value={details}
                onChangeText={setDetails}
                maxLength={500}
                multiline
                numberOfLines={3}
              />

              {errorMsg ? (
                <Text variant="caption" className="font-semibold text-danger">
                  {errorMsg}
                </Text>
              ) : null}

              <View className="flex-row gap-2 pt-2">
                <Button
                  label="Cancel"
                  variant="ghost"
                  className="flex-1"
                  disabled={reportMutation.isPending}
                  onPress={handleResetAndClose}
                />
                <Button
                  label="Submit Report"
                  variant="danger"
                  className="flex-1"
                  loading={reportMutation.isPending}
                  onPress={() => {
                    handleSubmit().catch(() => {});
                  }}
                />
              </View>
            </>
          )}
        </Card>
      </View>
    </Modal>
  );
}
