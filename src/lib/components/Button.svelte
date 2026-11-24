<script lang="ts">
import type { HTMLButtonAttributes } from 'svelte/elements';

interface Props extends HTMLButtonAttributes {
  /**
   * The button's `type`, required since a button's default type submits whatever form it sits in.
   */
  type: 'submit' | 'button' | 'reset';
}

const { children, class: className, type, ...rest }: Props = $props();
</script>

<button
  {type}
  class={[
    'w-full cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600',
    className,
  ]}
  {...rest}
>
  {@render children?.()}
</button>
