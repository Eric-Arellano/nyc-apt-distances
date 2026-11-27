<script lang="ts">
import { linkify } from '#lib/linkify.ts';

interface Props {
  text: string;
}

const { text }: Props = $props();
</script>

<p class="break-words whitespace-pre-wrap">
  {#each linkify(text) as segment (segment)}
    {#if segment.kind === 'text'}
      {segment.text}
    {:else}
      <a
        href={segment.href}
        target={segment.kind === 'url' ? '_blank' : undefined}
        rel={segment.kind === 'url' ? 'noopener noreferrer' : undefined}
        class="text-ring underline underline-offset-4 hover:text-foreground"
        >{segment.text}</a
      >
    {/if}
  {/each}
</p>
