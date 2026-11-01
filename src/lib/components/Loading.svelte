<script lang="ts">
interface Props {
  message: string;
}

const { message }: Props = $props();
</script>

<div class="flex items-center justify-center">
  <div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
  <span class="ml-3 text-lg text-gray-600">{message}</span>
</div>
