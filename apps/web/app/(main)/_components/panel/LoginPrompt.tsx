'use client';

import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';

export function LoginPrompt() {
  return (
    <Card variant="low" border padding="lg" className="flex flex-col gap-md">
      <p className="font-sans text-body-md text-on-surface-variant leading-relaxed">
        로그인하면 타이머를 켜고<br />우리 동네 숲에 기여할 수 있어요.
      </p>

      <Button href="/login" icon="login" className="w-full h-10">
        로그인하기
      </Button>
    </Card>
  );
}
