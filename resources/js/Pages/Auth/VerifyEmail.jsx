import { router, usePage } from '@inertiajs/react';

import AuthLayout from '@/Layouts/AuthLayout';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
    const { flash } = usePage().props;

    return (
        <AuthLayout title="Verify your email" subtitle="Check your inbox for the verification link before accessing the planner.">
            {flash.status === 'verification-link-sent' ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    A fresh verification link has been sent to your email address.
                </div>
            ) : null}

            <div className="space-y-4">
                <Button className="w-full" onClick={() => router.post('/email/verification-notification')}>
                    Resend verification email
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.post('/logout')}>
                    Log out
                </Button>
            </div>
        </AuthLayout>
    );
}
