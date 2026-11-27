<script lang="ts">
import * as UiCard from '#lib/components/ui/card/index.ts';
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  title: string;
  description?: string;
  action?: Snippet;
}

const { children, title, description, action }: Props = $props();
</script>

<UiCard.Root class="mb-4 text-base">
  <UiCard.Header>
    <!-- shadcn's title is a `div`, so the heading goes inside it. -->
    <UiCard.Title><h2 class="text-xl font-semibold">{title}</h2></UiCard.Title>
    {#if description}
      <UiCard.Description class="text-base">{description}</UiCard.Description>
    {/if}
    {#if action}
      <UiCard.Action>{@render action()}</UiCard.Action>
    {/if}
  </UiCard.Header>
  <UiCard.Content>{@render children()}</UiCard.Content>
</UiCard.Root>
