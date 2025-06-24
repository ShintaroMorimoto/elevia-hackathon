'use client';

import { signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function GoogleSignInButton() {
  return (
    <Button onClick={() => signIn('google')} className="w-full">
      Googleでログイン
    </Button>
  );
}

export function SignOutButton() {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => signOut()}
      className="flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      ログアウト
    </Button>
  );
}