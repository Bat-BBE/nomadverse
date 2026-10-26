'use client';
import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/Game'), {
  ssr: false,
  loading: () => (
    <div className="boot">
      <span>NOMADVERSE</span>
    </div>
  ),
});

export default function Page() {
  return <Game />;
}
