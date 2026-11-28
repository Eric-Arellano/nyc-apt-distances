<script lang="ts">
import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right';
import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
import { streetPart } from '#lib/address.ts';
import { formatDollars, siteName } from '#lib/apartmentDetails.ts';
import { STATUS_LABELS } from '#lib/apartmentStatus.ts';
import LinkedText from '#lib/components/apartment/LinkedText.svelte';
import { GOAL_TINTS, UNJUDGED_TINT } from '#lib/components/goalTints.ts';
import { goalText, routeIcon, transitLines } from '#lib/components/travelTimes/format.ts';
import * as NativeSelect from '#lib/components/ui/native-select/index.ts';
import type { ApartmentId } from '#lib/server/db/schema/public/Apartment.ts';
import {
  type ApartmentChoice,
  amountLower,
  type ComparedApartment,
  type Pair,
  type PairedDestination,
  type PairedTrip,
  routeMinutes,
  type SideTrip,
} from '#lib/sideBySide.ts';
import type { TripMode } from '#lib/travelTimes.ts';
import { resolve } from '$app/paths';
import type { Snippet } from 'svelte';

interface Props {
  choices: ApartmentChoice[];
  apartments: Pair<ComparedApartment | null>;
  destinations: PairedDestination[];
  onchoose: (side: 0 | 1, id: ApartmentId) => void;
  onswap: () => void;
}

const { choices, apartments, destinations, onchoose, onswap }: Props = $props();

const SIDES = [0, 1] as const;
const OTHER = [1, 0] as const;
const SIDE_NAMES = ['Left apartment', 'Right apartment'] as const;
// The bar and every row share these columns, so each side's values sit under its select.
const GRID = 'grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-5';
const COLUMN = ['col-start-2', 'col-start-3'] as const;
const MODE_ICONS: Record<TripMode, string> = { walk: '🚶', bike: '🚴', transit: '🚆', drive: '🚗' };
const MODE_NAMES: Record<TripMode, string> = {
  walk: 'Walk',
  bike: 'Bike',
  transit: 'Transit',
  drive: 'Drive',
};

const inPlay = $derived(choices.filter(({ status }) => status !== 'not_for_us'));
const notForUs = $derived(choices.filter(({ status }) => status === 'not_for_us'));
const anyChosen = $derived(apartments.some(Boolean));

function shortName({ address, unit }: { address: string; unit: string | null }): string {
  return [streetPart(address), unit].filter(Boolean).join(' · ');
}

// From a route when either side has one, since a transit trip's icon says bus or train. A side
// with no route would say only the mode.
function tripIcon({ mode, sides }: PairedTrip): string {
  const [route] = sides.flatMap((side) =>
    side.kind === 'trip' && side.route.mode !== 'unavailable' ? [side.route] : [],
  );
  return route ? routeIcon(route) : MODE_ICONS[mode];
}

function tripTint(side: SideTrip): string {
  return side.kind === 'trip' && side.status ? GOAL_TINTS[side.status] : UNJUDGED_TINT;
}
</script>

<!-- Every value sits in the same padded, bordered box, tinted or not, so text lines up down a
     column and outlining the better one doesn't shift it. -->
{#snippet cell(
  side: 0 | 1,
  tint: string | undefined,
  better: string | undefined,
  content: Snippet,
)}
  <div
    class={[
      COLUMN[side],
      'min-w-0 rounded-md border-2 px-2.5 py-1.5 tabular-nums',
      tint,
      better ? 'border-foreground font-bold' : 'border-transparent',
    ]}
  >
    {@render content()}
    {#if better}
      <span class="block text-xs font-semibold">{better}</span>
    {/if}
  </div>
{/snippet}

{#snippet blank()}
  <span class="text-muted-foreground">—</span>
{/snippet}

{#snippet glanceRow(
  label: string,
  value: Snippet<[ComparedApartment]>,
  better?: (side: 0 | 1) => string | undefined,
)}
  <div class={[GRID, 'gap-y-1 border-b py-3 last:border-b-0']}>
    <div class="col-span-full text-sm text-muted-foreground">{label}</div>
    {#each SIDES as side (side)}
      {@const apartment = apartments[side]}
      {#if apartment}
        {#snippet content()}
          {@render value(apartment)}
        {/snippet}
        {@render cell(side, undefined, better?.(side), content)}
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet status(
  apartment: ComparedApartment,
)}
  {STATUS_LABELS[apartment.status]}
{/snippet}

{#snippet rent({
  rent,
}: ComparedApartment)}
  {#if rent === null}
    {@render blank()}
  {:else}
    {formatDollars(rent)}
  {/if}
{/snippet}

{#snippet nextStep({
  nextStep,
}: ComparedApartment)}
  {#if nextStep}
    <span class="block wrap-anywhere"><LinkedText text={nextStep} /></span>
  {:else}
    {@render blank()}
  {/if}
{/snippet}

{#snippet listing({
  listingUrl,
}: ComparedApartment)}
  {#if listingUrl}
    <a
      href={listingUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="break-words text-ring underline underline-offset-4 hover:text-foreground"
    >
      {siteName(listingUrl)}
      <ExternalLinkIcon aria-hidden="true" class="inline size-4 align-[-0.125em]" />
    </a>
  {:else}
    {@render blank()}
  {/if}
{/snippet}

{#snippet tripValue(
  side: SideTrip,
)}
  {#if side.kind === 'missing'}
    {@render blank()}
    <span class="block text-xs text-muted-foreground">Not calculated yet</span>
  {:else if side.route.mode === 'unavailable'}
    No route
  {:else}
    {side.route.timeMinutes}
    min
    {#if side.route.mode === 'transit'}
      <span class="block text-xs font-normal wrap-anywhere text-muted-foreground">
        {side.route.rides.length === 0 ? 'All walking' : transitLines(side.route.rides)}
      </span>
    {/if}
  {/if}
{/snippet}

<div
  class="sticky top-0 z-20 border-y border-gray-700 bg-gray-800/95 shadow-[0_10px_20px_-10px_rgb(0_0_0/0.8)] backdrop-blur-sm"
>
  <div class={[GRID, 'mx-auto max-w-3xl items-start px-4 py-3']}>
    <button
      type="button"
      class="mt-2 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-gray-700 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      aria-label="Swap sides"
      title="Swap sides"
      disabled={!apartments[0] || !apartments[1]}
      onclick={onswap}
    >
      <ArrowLeftRightIcon class="size-4" aria-hidden="true" />
    </button>
    {#each SIDES as side (side)}
      {@const apartment = apartments[side]}
      {@const other = apartments[OTHER[side]]}
      <div class="flex min-w-0 flex-col gap-1">
        <!-- A native select, so a phone shows its own picker, laid transparent over the name so
             a long one wraps rather than being cut off at phone width. -->
        <div
          class="relative rounded-md border border-input bg-gray-950 py-2 pr-8 pl-3 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 hover:bg-gray-900"
        >
          <span
            aria-hidden="true"
            class={[
              'block leading-snug font-semibold wrap-anywhere sm:text-lg',
              !apartment && 'text-muted-foreground',
            ]}
          >
            {apartment ? shortName(apartment) : 'Choose an apartment'}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <select
            class="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
            value={apartment?.id ?? ''}
            aria-label={SIDE_NAMES[side]}
            onchange={(event) => onchoose(side, Number(event.currentTarget.value) as ApartmentId)}
          >
            {#if !apartment}
              <NativeSelect.Option value="" disabled>Choose an apartment</NativeSelect.Option>
            {/if}
            {#each [
              { label: 'In play', group: inPlay },
              { label: 'Not for us', group: notForUs },
            ] as { label, group } (label)}
              {#if group.length > 0}
                <NativeSelect.OptGroup {label}>
                  {#each group as choice (choice.id)}
                    <!-- Disabled rather than hidden, so both lists read the same. -->
                    <NativeSelect.Option value={choice.id} disabled={choice.id === other?.id}>
                      {shortName(choice)}
                    </NativeSelect.Option>
                  {/each}
                </NativeSelect.OptGroup>
              {/if}
            {/each}
          </select>
        </div>
        {#if apartment}
          <a
            href={resolve('/apartments/[id=apartmentId]', { id: apartment.id })}
            class="inline-flex items-center gap-1 self-start px-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Open its page
            <ArrowRightIcon aria-hidden="true" class="size-3" />
          </a>
        {/if}
      </div>
    {/each}
  </div>
</div>

<div class="mx-auto max-w-3xl px-4 pb-12">
  {#if !anyChosen}
    <p class="mt-8 text-center text-muted-foreground">
      Choose two apartments above to see how they differ.
    </p>
  {:else}
    <section>
      <h2 class="mt-8 mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        At a glance
      </h2>
      {@render glanceRow('Status', status)}
      {@render glanceRow('Rent a month', rent, (side) => {
        const less = amountLower(
          apartments[side]?.rent ?? null,
          apartments[OTHER[side]]?.rent ?? null,
        );
        return less === undefined ? undefined : `${formatDollars(less)} less`;
      })}
      {@render glanceRow('Next step', nextStep)}
      {@render glanceRow('Listing', listing)}
    </section>

    <section>
      <h2 class="mt-10 mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Travel times
      </h2>
      {#each destinations as destination (destination.id)}
        <div class={[GRID, 'gap-y-1.5 border-b py-4 last:border-b-0']}>
          <h3 class="col-span-full leading-snug font-semibold">{destination.title}</h3>
          {#if destination.closest.some(Boolean)}
            {#each SIDES as side (side)}
              {#if apartments[side]}
                <p class={[COLUMN[side], 'px-3 text-sm wrap-anywhere text-muted-foreground']}>
                  {destination.closest[side] ?? ''}
                </p>
              {/if}
            {/each}
          {/if}
          {#each destination.trips as trip, index (index)}
            {@const caption = [trip.label, trip.goal && goalText(trip.goal)]
              .filter(Boolean)
              .join(' · ')}
            {#if caption}
              <p class="col-span-2 col-start-2 mt-1.5 text-xs text-muted-foreground">{caption}</p>
            {/if}
            <div
              class="col-start-1 self-center text-center text-lg"
              role="img"
              aria-label={MODE_NAMES[trip.mode]}
              title={MODE_NAMES[trip.mode]}
            >
              {tripIcon(trip)}
            </div>
            {#each SIDES as side (side)}
              {#if apartments[side]}
                {@const value = trip.sides[side]}
                {@const faster = apartments[OTHER[side]]
                  ? amountLower(routeMinutes(value), routeMinutes(trip.sides[OTHER[side]]))
                  : undefined}
                {#snippet content()}
                  {@render tripValue(value)}
                {/snippet}
                {@render cell(
                  side,
                  tripTint(value),
                  faster === undefined ? undefined : `${faster} min faster`,
                  content,
                )}
              {/if}
            {/each}
          {/each}
        </div>
      {/each}
    </section>
  {/if}
</div>
