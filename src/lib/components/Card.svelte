<script lang="ts">
import * as UiCard from '#lib/components/ui/card/index.ts';
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  title: string;
}

const { children, title }: Props = $props();
</script>

<UiCard.Root class="mb-4 text-base">
  <UiCard.Header>
    <!-- shadcn's title is a `div`, so the heading goes inside it. -->
    <UiCard.Title><h2 class="text-xl font-semibold">{title}</h2></UiCard.Title>
  </UiCard.Header>
  <UiCard.Content>{@render children()}</UiCard.Content>
</UiCard.Root>
