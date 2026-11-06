'use client';

import React, { useState, useEffect } from 'react';

interface Props {
  firstName: string;
}

export function DashboardGreeting({ firstName }: Props) {
  // Compute greeting on client based on the user's local device clock
  const [greeting, setGreeting] = useState<string>('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  return (
    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
      {greeting}, {firstName} 👋
    </h1>
  );
}
