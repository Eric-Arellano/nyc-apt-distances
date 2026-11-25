<script lang="ts">
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';

interface Props {
  message: string;
}

const { message }: Props = $props();
</script>

<div class="flex items-center gap-2 pt-2 text-destructive">
  <CircleAlertIcon aria-hidden="true" class="size-5 shrink-0" />
  <p>{message}</p>
</div>
