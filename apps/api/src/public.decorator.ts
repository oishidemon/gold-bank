import { SetMetadata } from '@nestjs/common';

// Routes marked @Public() skip the password guard (e.g. /api/version).
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
