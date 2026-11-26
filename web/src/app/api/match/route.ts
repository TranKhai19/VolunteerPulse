import { NextResponse } from "next/server";
import { INITIAL_VILLAGES, INITIAL_VOLUNTEERS } from "@/data/mock-campaign";
import { matchVolunteersToVillages } from "@/lib/matcher";
import { VillagePoint, Volunteer } from "@/types/volunteer-pulse";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      volunteers?: Volunteer[];
      villages?: VillagePoint[];
    };
    const volunteers =
      body.volunteers && body.volunteers.length > 0 ? body.volunteers : INITIAL_VOLUNTEERS;
    const villages = body.villages && body.villages.length > 0 ? body.villages : INITIAL_VILLAGES;
    const matches = matchVolunteersToVillages(volunteers, villages);
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json(
      { error: "Không thể chạy bộ ghép nhân sự BGE-M3." },
      { status: 400 }
    );
  }
}
