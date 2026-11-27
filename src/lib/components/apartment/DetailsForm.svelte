<script lang="ts">
import { tick, untrack } from 'svelte';
import { saveDetails } from '#lib/apartments.remote.ts';
import * as Field from '#lib/components/ui/field/index.ts';
import { Button } from '#lib/components/ui/button/index.ts';
import { Input } from '#lib/components/ui/input/index.ts';
import { Textarea } from '#lib/components/ui/textarea/index.ts';
import { type DetailKey, type ApartmentDetails, toDetailsInput } from '#lib/apartmentDetails.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { submitOrSignIn } from '#lib/signInOnExpiredSession.ts';
import { beforeNavigate } from '$app/navigation';

interface Props {
  id: ApartmentId;
  details: ApartmentDetails;
  onclose: () => void;
}

const { id, details, onclose }: Props = $props();

// What the form opened with, kept even if the page reloads its data while this is open.
const original = untrack(() => toDetailsInput(details));
const ORIGINAL_KEYS = Object.keys(original) as DetailKey[];

// A form's state and errors outlive the component, so each opening gets a new instance, or a
// cancelled edit would come back.
const save = saveDetails.for(crypto.randomUUID());
save.fields.set({ id: String(untrack(() => id)), edited: original, original });

const { edited } = save.fields;
const isSaving = $derived(save.pending > 0);
const isDirty = $derived(edited.dirty());

const enhanceSave = save.enhance(async (form) => {
  if (await submitOrSignIn(form)) return onclose();
  // On a phone the field at fault is usually scrolled off above Save, so bring it into view.
  await tick();
  const invalid = form.element.querySelector<HTMLElement>('[aria-invalid="true"]');
  invalid?.focus({ preventScroll: true });
  invalid?.scrollIntoView({ block: 'center' });
});

function cancel() {
  if (!isDirty || confirm('Discard your changes?')) onclose();
}

beforeNavigate((navigation) => {
  if (!isDirty) return;
  // Closing the tab can only be stopped by the browser's own prompt, which `cancel` asks for.
  if (navigation.type === 'leave' || !confirm('Leave without saving your changes?')) {
    navigation.cancel();
  }
});
</script>

<form {...enhanceSave} class="flex max-w-2xl flex-col gap-6">
  <input {...save.fields.id.as('hidden', String(id))}>
  {#each ORIGINAL_KEYS as key (key)}
    <input {...save.fields.original[key].as('hidden', original[key])}>
  {/each}

  <!-- Hints go under each label rather than in placeholders, which vanish once you type. -->
  <Field.Group>
    <Field.Field>
      <Field.Label for="details-unit">Unit</Field.Label>
      <Field.Description id="details-unit-hint">
        Such as 4B. It tells apart apartments in the same building.
      </Field.Description>
      <Input
        id="details-unit"
        aria-describedby="details-unit-hint"
        {...edited.unit.as('text')}
        class="max-w-48"
      />
    </Field.Field>

    <Field.Field>
      <Field.Label for="details-next-step">Next step</Field.Label>
      <Field.Description id="details-next-step-hint">
        What has to happen next, such as sending our reference letter.
      </Field.Description>
      <Input
        id="details-next-step"
        aria-describedby="details-next-step-hint"
        {...edited.nextStep.as('text')}
      />
    </Field.Field>

    <Field.Field data-invalid={edited.rent.issues() ? true : undefined}>
      <Field.Label for="details-rent">Monthly rent</Field.Label>
      <div class="relative max-w-48">
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground"
        >
          $
        </span>
        <Input id="details-rent" {...edited.rent.as('text')} inputmode="numeric" class="pl-6" />
      </div>
      <Field.Error errors={edited.rent.issues()} />
    </Field.Field>

    <Field.Field data-invalid={edited.listingUrl.issues() ? true : undefined}>
      <Field.Label for="details-listing">Listing</Field.Label>
      <Field.Description id="details-listing-hint"
        >Paste the link to the listing.</Field.Description
      >
      <Input
        id="details-listing"
        aria-describedby="details-listing-hint"
        {...edited.listingUrl.as('text')}
        inputmode="url"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
      />
      <Field.Error errors={edited.listingUrl.issues()} />
    </Field.Field>

    <Field.Field>
      <Field.Label for="details-agent">Agent</Field.Label>
      <Field.Description id="details-agent-hint">
        Their name, phone and email, in any format. Phone numbers and emails become links you can
        tap.
      </Field.Description>
      <!-- One free-text field rather than name, phone and email: agents come with an office and a
           cell number, or a partner, and pasting a signature is easiest. -->
      <Textarea
        id="details-agent"
        aria-describedby="details-agent-hint"
        {...edited.agentContact.as('text')}
        rows={2}
      />
    </Field.Field>

    <Field.Field>
      <Field.Label for="details-notes">Notes</Field.Label>
      <Field.Description id="details-notes-hint">
        We both see these, so add your name to what you write.
      </Field.Description>
      <Textarea
        id="details-notes"
        aria-describedby="details-notes-hint"
        {...edited.notes.as('text')}
        rows={4}
      />
    </Field.Field>
  </Field.Group>

  <!-- Save comes first on a phone, where the buttons stack. -->
  <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button type="button" variant="outline" size="lg" disabled={isSaving} onclick={cancel}>
      Cancel
    </Button>
    <Button type="submit" size="lg" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</Button>
  </div>
</form>
