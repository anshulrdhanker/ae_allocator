import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Routing Agent — sales allocation', description: 'Explore a simulated inbound cohort and its real sales-allocation MILP. Independent prototype with synthetic leads.' };
export default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
