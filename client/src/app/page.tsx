import { Metadata } from 'next';
import WeaponGrid from '@/components/WeaponGrid';

export const metadata: Metadata = {
  title: 'Weapon Selector',
  description: 'リアルタイム武器選択システム',
};

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center my-8">Weapon Selector</h1>
      <WeaponGrid />
    </main>
  );
}