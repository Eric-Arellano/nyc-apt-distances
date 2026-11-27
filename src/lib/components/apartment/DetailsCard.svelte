<script lang="ts">
import PencilIcon from '@lucide/svelte/icons/pencil';
import { tick } from 'svelte';
import Card from '#lib/components/Card.svelte';
import { Button } from '#lib/components/ui/button/index.ts';
import type { ApartmentDetails } from '#lib/apartmentDetails.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import DetailsForm from './DetailsForm.svelte';
import DetailsView from './DetailsView.svelte';

interface Props {
  id: ApartmentId;
  details: ApartmentDetails;
}

const { id, details }: Props = $props();

// Read first, edit on purpose: on a phone the links stay tappable and scrolling can't edit.
let isEditing = $state(false);
let editButton = $state<HTMLElement | null>(null);

// The unit shows beside the address, so this card shows only the rest.
const { unit: _, ...shown } = $derived(details);
const isEmpty = $derived(Object.values(shown).every((value) => value === null));

async function close() {
  isEditing = false;
  await tick();
  editButton?.focus();
}
</script>

<Card title="Details" description={isEditing ? 'Every field is optional.' : undefined}>
  {#snippet action()}
    {#if !isEditing && !isEmpty}
      <Button bind:ref={editButton} variant="outline" onclick={() => (isEditing = true)}>
        <PencilIcon aria-hidden="true" />
        Edit
      </Button>
    {/if}
  {/snippet}

  {#if isEditing}
    <DetailsForm {id} {details} onclose={close} />
  {:else if isEmpty}
    <p class="text-muted-foreground">
      Add the rent, listing, agent and notes whenever you have them.
    </p>
    <!-- The card's content is a flex column, which would stretch the button across it. -->
    <Button bind:ref={editButton} class="self-start" onclick={() => (isEditing = true)}>
      <PencilIcon aria-hidden="true" />
      Add details
    </Button>
  {:else}
    <DetailsView {details} />
  {/if}
</Card>
