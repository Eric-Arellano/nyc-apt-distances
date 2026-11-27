<script lang="ts">
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import { removeApartment } from '#lib/apartments.remote.ts';
import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
import { buttonVariants } from '#lib/components/ui/button/index.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import { signInOnExpiredSession } from '#lib/signInOnExpiredSession.ts';

interface Props {
  id: ApartmentId;
  address: string;
}

const { id, address }: Props = $props();

const isDeleting = $derived(removeApartment.pending > 0);
</script>

<!-- Only here, not in the list: a mistaken save is noticed on this page, where saving lands,
     and an apartment we turn down is better kept with its history than deleted. -->
<AlertDialog.Root>
  <AlertDialog.Trigger
    aria-label="Delete apartment"
    title="Delete apartment"
    class={buttonVariants({
      variant: 'ghost',
      size: 'icon-lg',
      class: 'text-muted-foreground hover:text-destructive',
    })}
  >
    <Trash2Icon aria-hidden="true" class="size-5" />
  </AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete this apartment?</AlertDialog.Title>
      <AlertDialog.Description>
        {address}
        and everything saved about it will be deleted for everyone. This can't be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <form {...removeApartment.enhance(signInOnExpiredSession)}>
      <input {...removeApartment.fields.id.as('hidden', String(id))}>
      <AlertDialog.Footer>
        <!-- bits-ui leaves `type` unset, which inside a form would make Cancel delete too. -->
        <AlertDialog.Cancel type="button" disabled={isDeleting}>Cancel</AlertDialog.Cancel>
        <!-- Unlike Cancel, Action leaves the dialog open, so it can show the delete pending. -->
        <AlertDialog.Action type="submit" variant="destructive" disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete'}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </form>
  </AlertDialog.Content>
</AlertDialog.Root>
