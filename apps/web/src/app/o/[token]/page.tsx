import { PublicUpload } from "@/components/consorcio/public-upload";

export default function PublicOfferPhotosPage({ params }: { params: { token: string } }) {
  return <PublicUpload token={params.token} />;
}
