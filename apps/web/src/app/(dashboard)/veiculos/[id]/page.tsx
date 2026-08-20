import { VehicleBoard } from "@/components/vehicle/vehicle-board";

export default function VehiclePage({ params }: { params: { id: string } }) {
  return <VehicleBoard vehicleId={Number(params.id)} />;
}
