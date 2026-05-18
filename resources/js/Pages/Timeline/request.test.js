import { describe, expect, it } from 'vitest';

import { request as sharedRequest } from '@/lib/request';
import { request as timelineRequest } from './utils';

describe('timeline request helper', () => {
    it('uses the shared app request helper', () => {
        expect(timelineRequest).toBe(sharedRequest);
    });
});
