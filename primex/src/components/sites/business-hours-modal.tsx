"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSiteBusinessHours } from "@/lib/data/actions/site-business-hours";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Field,
  TextInput,
  Select,
  InfoBox,
  Toggle,
  Button,
} from "@/components/ui";
import {
  BUSINESS_DAYS,
  DAY_LABELS,
  normalizeBusinessHours,
  type BusinessDay,
  type BusinessHoursMap,
} from "@/lib/business-hours";
import type { SiteBusinessHours } from "@/lib/types";

// The worker resolves these with Python's zoneinfo, so any IANA name works.
// Curated to the regions this product serves rather than listing all of them.
const timezoneOptions = [
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (no DST)" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide" },
  { value: "Australia/Perth", label: "Australia/Perth" },
  { value: "Australia/Darwin", label: "Australia/Darwin" },
  { value: "Australia/Hobart", label: "Australia/Hobart" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "UTC", label: "UTC" },
];

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";

type DayState = { enabled: boolean; open: string; close: string };
type FormState = Record<BusinessDay, DayState>;

function toFormState(hours: BusinessHoursMap | undefined): FormState {
  const state = {} as FormState;
  for (const day of BUSINESS_DAYS) {
    const entry = hours?.[day];
    state[day] = {
      enabled: Boolean(entry),
      open: entry?.open ?? DEFAULT_OPEN,
      close: entry?.close ?? DEFAULT_CLOSE,
    };
  }
  return state;
}

interface BusinessHoursModalProps {
  open: boolean;
  onClose: () => void;
  siteId: string;
  businessHours: SiteBusinessHours | null;
}

export function BusinessHoursModal({
  open,
  onClose,
  siteId,
  businessHours,
}: BusinessHoursModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(
    businessHours?.timezone ?? "Australia/Sydney",
  );
  const [days, setDays] = useState<FormState>(() => toFormState(businessHours?.hours));

  // Re-seed when a different site's hours are opened, matching EditSiteModal.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (siteId !== seededId) {
    setSeededId(siteId);
    setTimezone(businessHours?.timezone ?? "Australia/Sydney");
    setDays(toFormState(businessHours?.hours));
    setError(null);
  }

  function setDay(day: BusinessDay, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function handleSubmit() {
    const hours: BusinessHoursMap = {};
    for (const day of BUSINESS_DAYS) {
      if (!days[day].enabled) continue;
      if (!days[day].open || !days[day].close) {
        setError(`${DAY_LABELS[day]}: set both an opening and a closing time.`);
        return;
      }
      hours[day] = { open: days[day].open, close: days[day].close };
    }

    // Validate with the same function the server action uses, so the inline
    // message matches what would come back and the round trip is skipped.
    try {
      normalizeBusinessHours(hours);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Those hours aren't valid.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        await updateSiteBusinessHours(siteId, { timezone, hours });
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        );
      }
    });
  }

  const anyOpen = BUSINESS_DAYS.some((day) => days[day].enabled);

  return (
    <Modal open={open} onClose={onClose} width="max-w-xl">
      <ModalHeader
        eyebrow="Sites"
        title="Business hours"
        sub="AI after-hours detection treats anything outside these hours as after-hours."
        onClose={onClose}
      />

      <ModalBody>
        <div className="flex flex-col gap-5">
          <Field
            label="Timezone"
            required
            hint="Hours are interpreted in this timezone, not the viewer's."
          >
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={timezoneOptions}
            />
          </Field>

          <div className="flex flex-col gap-2">
            {BUSINESS_DAYS.map((dayKey) => {
              const day = days[dayKey];
              const label = DAY_LABELS[dayKey];
              return (
                <div
                  key={dayKey}
                  className="flex items-center gap-3 py-1.5 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-2.5 w-36 flex-shrink-0">
                    <Toggle
                      on={day.enabled}
                      onChange={(v) => setDay(dayKey, { enabled: v })}
                    />
                    <span className="text-sm text-ink font-sans">{label}</span>
                  </div>

                  {day.enabled ? (
                    <div className="flex items-center gap-2">
                      <TextInput
                        type="time"
                        value={day.open}
                        onChange={(e) => setDay(dayKey, { open: e.target.value })}
                        className="w-32"
                        aria-label={`${label} opening time`}
                      />
                      <span className="text-sm text-ink-4 font-sans">to</span>
                      <TextInput
                        type="time"
                        value={day.close}
                        onChange={(e) => setDay(dayKey, { close: e.target.value })}
                        className="w-32"
                        aria-label={`${label} closing time`}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-ink-4 font-sans">
                      Closed — treated as after-hours all day
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {!anyOpen && (
            <InfoBox tone="amber">
              Every day is closed, so this site is after-hours around the clock. Any
              person or vehicle detected will raise a critical alert.
            </InfoBox>
          )}

          <InfoBox tone="blue">
            Hours that cross midnight aren&apos;t supported — a closing time must be
            later in the day than its opening time. For 24-hour sites, leave every day
            open from 00:00 to 23:59.
          </InfoBox>

          {error && <InfoBox tone="amber">{error}</InfoBox>}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Save hours"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
