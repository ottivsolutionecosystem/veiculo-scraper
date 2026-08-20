import { SellerDetailBoard } from "@/components/seller/seller-detail-board";

export default function SellerPage({ params }: { params: { id: string } }) {
  return <SellerDetailBoard sellerId={Number(params.id)} />;
}
