// The page someone asked for rides through the login page in `?redirectTo=`, so a shared link
// still lands where it pointed after signing in.

export function loginPath(from: URL): string {
  const target = `${from.pathname}${from.search}`;
  return target === '/' ? '/login' : `/login?${new URLSearchParams({ redirectTo: target })}`;
}

// Anyone can craft a login link. SvelteKit's `redirect` already refuses another origin, but by
// throwing, so anything not on this site goes home instead of failing the sign-in.
export function returnPath(redirectTo: string | null, origin: string): string {
  const target = redirectTo ? URL.parse(redirectTo, origin) : null;
  return target?.origin === origin ? `${target.pathname}${target.search}` : '/';
}
