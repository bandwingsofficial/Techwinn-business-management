import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ portal: string }>;
};

export default async function PortalRootPage({ params }: PageProps) {
  const { portal } = await params;
  redirect(`/${portal}/dashboard`);
}
