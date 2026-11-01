import { hasSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => ({ isAuthenticated: hasSession(cookies) });
