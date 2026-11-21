"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import type { FollowUpState } from "@/presentation/actions/contact.action";
import { Button } from "@/presentation/components/ui/button";

type FollowUpDoneButtonProps = {
  contactId: string;
  contactName: string;
  action: (id: string) => Promise<FollowUpState>;
};

export function FollowUpDoneButton({ contactId, contactName, action }: FollowUpDoneButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="grid justify-items-end gap-1">
      <Button
        variant="outline"
        size="xs"
        disabled={pending}
        aria-label={`Relance faite pour ${contactName}`}
        onClick={() =>
          startTransition(async () => {
            const result = await action(contactId);
            setError(result?.error);
          })
        }
      >
        <Check aria-hidden />
        Relance faite
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
