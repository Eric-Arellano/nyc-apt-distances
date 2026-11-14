<script lang="ts">
import type { HTMLButtonAttributes } from 'svelte/elements';

interface Props extends HTMLButtonAttributes {
  // Required, since a button's default type submits whatever form it sits in.
  type: 'submit' | 'button' | 'reset';
}

const { children, class: className, type, ...rest }: Props = $props();
</script>

<button
  {type}
  class={[
    'w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-400',
    className,
  ]}
  {...rest}
>
  {@render children?.()}
</button>
