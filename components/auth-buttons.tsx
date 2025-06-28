'use client';

import { signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function GoogleSignInButton() {
  return (
    <Button
      onClick={() => signIn('google')}
      className="w-full bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 shadow-md hover:shadow-lg transition-all duration-200"
    >
      Googleでログイン
    </Button>
  );
}

export function SignOutButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => signOut()}
      className="flex items-center gap-2 bg-white/90 text-neutral-700 border border-neutral-200 hover:bg-white hover:text-neutral-800 hover:border-neutral-300"
    >
      <LogOut className="w-4 h-4" />
      ログアウト
    </Button>
  );
}
