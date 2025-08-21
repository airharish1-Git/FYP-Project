import { EditListingForm } from "@/components/edit-listing-form";

export default async function EditListingPage({
  params,
}: {
  params: { id: string };
}) {
  // Ensure params is properly awaited
  const { id } = await Promise.resolve(params);
  return <EditListingForm listingId={id} />;
}
