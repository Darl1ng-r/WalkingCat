import { useMutation } from '@tanstack/react-query';

import { submitUserFeedback, type SubmitFeedbackInput } from './api';

export function useSubmitFeedbackMutation() {
  return useMutation({
    mutationFn: (input: SubmitFeedbackInput) => submitUserFeedback(input),
  });
}
