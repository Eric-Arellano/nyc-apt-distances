<script lang="ts">
import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

interface Props {
  message: string;
}

const { message }: Props = $props();
</script>

<div class="flex items-center justify-center gap-3">
  <LoaderCircleIcon aria-hidden="true" class="size-10 animate-spin text-primary" />
  <span class="text-lg text-muted-foreground">{message}</span>
</div>
