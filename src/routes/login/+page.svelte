<script lang="ts">
import Login from '#lib/components/Login.svelte';
import type { PageProps } from './$types';

const { form }: PageProps = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
  <div class="w-full max-w-sm">
    <Login error={form?.message} />
  </div>
</div>
