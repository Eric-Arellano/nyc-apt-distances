<script lang="ts">
import { formatDollars } from '#lib/apartmentDetails.ts';
import {
  type ApartmentRow,
  type ColumnGroup,
  type Sort,
  sortRows,
  streetPart,
  type TimeCell,
} from '#lib/comparison.ts';
import { GOAL_TINTS, UNJUDGED_TINT } from '#lib/components/goalTints.ts';
import { STATUS_LABELS } from '#lib/status.ts';
import { withUnit } from '#lib/unit.ts';
import { resolve } from '$app/paths';

interface Props {
  groups: ColumnGroup[];
  rows: ApartmentRow[];
  sort: Sort;
  onsort: (key: string) => void;
}

const { groups, rows, sort, onsort }: Props = $props();

const ALIGN = { start: 'items-start', center: 'items-center', end: 'items-end' } as const;
const MISSING: TimeCell = { kind: 'missing' };
// Separates rent from status, and each destination's columns from the one before.
const GROUP_RULE = 'border-l border-l-gray-700';

const sorted = $derived(sortRows(rows, sort));
function withRule(group: ColumnGroup) {
  return group.columns.map((column, index) => ({ ...column, first: index === 0 }));
}

const columns = $derived(groups.flatMap(withRule));
// A destination with one column names itself in a single header cell spanning both rows.
const subheaderColumns = $derived(
  groups.filter((group) => group.columns.length > 1).flatMap(withRule),
);

function ariaSort(key: string) {
  if (sort.key !== key) return undefined;
  return sort.desc ? 'descending' : 'ascending';
}

function cellText(cell: TimeCell): string {
  if (cell.kind === 'missing') return '—';
  return cell.minutes === null ? 'None' : `${cell.minutes}`;
}

function cellTitle(cell: TimeCell): string | undefined {
  if (cell.kind === 'missing') return 'Not calculated yet. Recalculate it on its page.';
  return cell.minutes === null ? 'Google found no route' : undefined;
}

// "Not for us" is out of the running, so its times are left untinted rather than compete.
function cellTint(cell: TimeCell, dim: boolean): string | undefined {
  if (cell.kind === 'missing') return 'text-muted-foreground';
  if (dim) return UNJUDGED_TINT;
  return cell.status && GOAL_TINTS[cell.status];
}
</script>

<!-- `lines` stack, so a destination's name sits above its icon; the arrow follows the last. -->
{#snippet sortButton(
  key: string,
  lines: string[],
  align: keyof typeof ALIGN,
  label?: string,
)}
  <button
    type="button"
    class={['flex w-full flex-col gap-0.5 hover:text-foreground', ALIGN[align]]}
    aria-label={label}
    onclick={() => onsort(key)}
  >
    {#each lines as line, index (index)}
      <span class="whitespace-nowrap">
        {line}
        {#if index === lines.length - 1}
          <span class="inline-block w-2 text-[0.65rem]" aria-hidden="true"
            >{sort.key === key ? (sort.desc ? '▼' : '▲') : ''}</span
          >
        {/if}
      </span>
    {/each}
  </button>
{/snippet}

{#snippet row(
  apartment: ApartmentRow,
  dim: boolean,
)}
  {@const { id, address, unit, status: rowStatus, rent, nextStep } = apartment}
  <tr class={['apartment', dim && 'text-muted-foreground']}>
    <td class="frozen sticky left-0 z-10 border-r bg-card pl-4 sm:pl-6">
      <a
        href={resolve('/apartments/[id=apartmentId]', { id })}
        title={withUnit(address, unit)}
        class={[
          'block leading-snug wrap-anywhere hover:text-ring hover:underline',
          dim ? 'font-medium' : 'font-semibold',
        ]}
      >
        <!-- No-break spaces, so a unit never wraps onto a line of its own. -->
        {[streetPart(address), unit].filter(Boolean).join(' · ')}
      </a>
      {#if nextStep}
        <span class="mt-0.5 block truncate text-xs text-muted-foreground" title={nextStep}>
          {nextStep}
        </span>
      {/if}
    </td>
    <td class="truncate">{STATUS_LABELS[rowStatus]}</td>
    <td class={['text-right', GROUP_RULE]}>{rent === null ? '' : formatDollars(rent)}</td>
    {#each columns as column (column.key)}
      {@const cell = apartment.times[column.key] ?? MISSING}
      <td
        class={['text-center', column.first && GROUP_RULE, cellTint(cell, dim)]}
        title={cellTitle(cell)}
      >
        {cellText(cell)}
      </td>
    {/each}
  </tr>
{/snippet}

<!-- The apartment column stays put while the times scroll under it, like a frozen column in Sheets. -->
<div class="-mx-(--card-spacing) overflow-x-auto">
  <table
    class="w-full table-fixed border-separate border-spacing-0 text-sm tabular-nums [--apt-col:--spacing(34)] sm:[--apt-col:--spacing(48)]"
    style:min-width="calc(var(--apt-col) + {11.25 + 4.5 * columns.length}rem)"
  >
    <colgroup>
      <col class="w-(--apt-col)">
      <col class="w-24">
      <col class="w-21">
      {#each columns as column (column.key)}
        <col class="w-18">
      {/each}
    </colgroup>
    <thead class="text-xs leading-tight font-semibold text-muted-foreground">
      <tr>
        <th
          scope="col"
          rowspan="2"
          class="frozen sticky left-0 z-20 border-r bg-card pl-4 sm:pl-6"
          aria-sort={ariaSort('apartment')}
        >
          {@render sortButton('apartment', ['Apartment'], 'start')}
        </th>
        <th scope="col" rowspan="2" aria-sort={ariaSort('status')}>
          {@render sortButton('status', ['Status'], 'start')}
        </th>
        <th scope="col" rowspan="2" class={['text-right', GROUP_RULE]} aria-sort={ariaSort('rent')}>
          {@render sortButton('rent', ['Rent /mo'], 'end')}
        </th>
        {#each groups as group (group.title)}
          {@const [only, ...rest] = group.columns}
          {#if only && rest.length === 0}
            <th
              scope="col"
              rowspan="2"
              class={['text-center', GROUP_RULE]}
              title={only.title}
              aria-sort={ariaSort(only.key)}
            >
              {@render sortButton(only.key, [group.shortTitle, only.icon], 'center', only.title)}
            </th>
          {:else}
            <th
              scope="colgroup"
              colspan={group.columns.length}
              class={['border-b-gray-700 pb-1 text-center', GROUP_RULE]}
              title={group.title}
            >
              {group.shortTitle}
            </th>
          {/if}
        {/each}
      </tr>
      <tr>
        {#each subheaderColumns as column (column.key)}
          <th
            scope="col"
            class={['text-center', column.first && GROUP_RULE]}
            title={column.title}
            aria-sort={ariaSort(column.key)}
          >
            {@render sortButton(
              column.key,
              [column.label ? `${column.icon} ${column.label}` : column.icon],
              'center',
              column.title,
            )}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sorted.inPlay as apartment (apartment.id)}
        {@render row(apartment, false)}
      {/each}
      {#if sorted.notForUs.length > 0}
        <tr>
          <td
            colspan={3 + columns.length}
            class="bg-background pt-3.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            <span class="sticky left-4 inline-block sm:left-6">
              Not for us · {sorted.notForUs.length}
            </span>
          </td>
        </tr>
        {#each sorted.notForUs as apartment (apartment.id)}
          {@render row(apartment, true)}
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
table {
  --row-hover: color-mix(in oklab, var(--color-card), var(--color-muted));
}
/* A layer below Tailwind's utilities, so a cell's own classes override these defaults. */
@layer base {
  th,
  td {
    padding: 0.5rem 0.625rem;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
  }
  thead th {
    padding-block: 0.375rem;
    vertical-align: bottom;
  }
}
thead th[aria-sort] {
  color: var(--color-foreground);
}
/* The frozen cell is opaque so the times scroll under it, so it takes the hover color itself. */
tbody tr.apartment:hover,
tbody tr.apartment:hover .frozen {
  background: var(--row-hover);
}
</style>
