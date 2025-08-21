import { ListingDetail } from "@/components/listing-detail";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  // Ensure params is properly awaited
  const { id: listingId } = await Promise.resolve(params);

  return (
    <div className="bg-background">
      <ListingDetail listingId={listingId} />
    </div>
  );
}
