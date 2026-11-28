<script lang="ts">
import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
import { type ApartmentDetails, formatRent, siteName } from '#lib/apartmentDetails.ts';
import LinkedText from './LinkedText.svelte';

interface Props {
  details: ApartmentDetails;
}

const { details }: Props = $props();
</script>

<!-- Empty fields are left out, so an apartment barely followed up still reads cleanly. The unit
     is shown beside the address instead. -->
<dl class="flex flex-col gap-4 [&_dt]:text-sm [&_dt]:text-muted-foreground">
  {#if details.nextStep}
    <div>
      <dt>Next step</dt>
      <dd><LinkedText text={details.nextStep} /></dd>
    </div>
  {/if}
  {#if details.rent !== null}
    <div>
      <dt>Rent</dt>
      <dd>{formatRent(details.rent)}</dd>
    </div>
  {/if}
  {#if details.listingUrl}
    <div>
      <dt>Listing</dt>
      <dd>
        <a
          href={details.listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-ring underline underline-offset-4 hover:text-foreground"
        >
          {siteName(details.listingUrl)}
          <ExternalLinkIcon aria-hidden="true" class="size-4" />
        </a>
      </dd>
    </div>
  {/if}
  {#if details.agentContact}
    <div>
      <dt>Agent</dt>
      <dd><LinkedText text={details.agentContact} /></dd>
    </div>
  {/if}
  {#if details.notes}
    <div>
      <dt>Notes</dt>
      <dd><LinkedText text={details.notes} /></dd>
    </div>
  {/if}
</dl>
