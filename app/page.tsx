
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve botId query param for the Client App Popup
    const botId = searchParams.get('botId');
    if (botId) {
       router.replace(`/dashboard?botId=${botId}`);
    } else {
       router.replace('/dashboard');
    }
  }, [router, searchParams]);

  return null;
}
