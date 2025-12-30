
"use client";

import useSWR from 'swr';
import AccountInfo from '@/components/AccountInfo';
import Positions from '@/components/Positions';

export default function AccountPage() {
  const { data: accountData } = useSWR('/api/account', url => fetch(url).then(res => res.json()));
  const { data: positionsData } = useSWR('/api/positions', url => fetch(url).then(res => res.json()));

  return (
    <div className="space-y-8">
      <AccountInfo data={accountData} />
      <Positions data={positionsData} />
    </div>
  );
}
